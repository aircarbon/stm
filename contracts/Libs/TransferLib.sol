pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

library TransferLib {
    enum TransferType { User, ExchangeFee, OriginatorFee }
    event TransferedLedgerCcy(address indexed from, address indexed to, uint256 ccyTypeId, uint256 amount, TransferType transferType);
    event TransferedFullSecToken(address indexed from, address indexed to, uint256 indexed stId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    event TransferedPartialSecToken(address indexed from, address indexed to, uint256 indexed splitFromSecTokenId, uint256 newSecTokenId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    //event dbg1(uint256 batchId, uint256 S, uint256 BCS, uint256 batchQty, uint256 totQty, uint256 batch_exFee_ccy, uint256 BFEE);
    event TradedCcyTok(uint256 ccyTypeId, uint256 ccyAmount, uint256 tokTypeId, address indexed tokensFrom, address indexed ccyFrom, uint256 tokQty);

    uint256 constant MAX_BATCHES_PREVIEW = 128; // for fee previews: max distinct batch IDs that can participate in one side of a trade fee preview

    //
    // PUBLIC - transfer/trade
    //
    struct TransferVars { // misc. working vars for transfer() fn - struct packed to preserve stack slots
        TransferSplitPreviewReturn[2] ts_previews; // [0] = A->B, [1] = B->A
        TransferSplitArgs[2] ts_args;
        uint256[2] totalOrigFee;
        uint80 transferedQty;
        uint80 exchangeFeesPaidQty;
        uint80 originatorFeesPaidQty;
    }
    function transferOrTrade(
        StructLib.LedgerStruct storage ld,
        StructLib.CcyTypesStruct storage ctd,
        StructLib.FeeStruct storage globalFees,
        StructLib.TransferArgs memory a
    ) public {
        TransferVars memory v;
        uint256 maxStId = ld._tokens_currentMax_id;

        require(ld._contractSealed, "Contract is not sealed");
        //require(a.ledger_A != a.ledger_B, "Bad transfer"); // erc20 compat: allow send-to-self -- todo: could NOP below when ledger_A == a.ledger_B
        require(a.qty_A > 0 || a.qty_B > 0 || a.ccy_amount_A > 0 || a.ccy_amount_B > 0, "Bad null transfer");
        require(a.qty_A <= 0x7FFFFFFFFFFFFFFF, "Bad qty_A"); //* (2^64 /2: max signed int64) [was: 0xffffffffffffffff]
        require(a.qty_B <= 0x7FFFFFFFFFFFFFFF, "Bad qty_B"); //*

        // disallow single origin multiple asset type transfers
        require(!((a.qty_A > 0 && a.ccy_amount_A > 0) || (a.qty_B > 0 && a.ccy_amount_B > 0)), "Bad transfer types");

        // disallow currency swaps - we need consistent ccy types on each sides for ccy fee mirroring
        require(a.ccyTypeId_A == 0 || a.ccyTypeId_B == 0, "Bad ccy swap");

        if (a.ccy_amount_A > 0) require(a.ccyTypeId_A > 0 && a.ccyTypeId_A <= ctd._ct_Count, "Bad ccyTypeId A");
        if (a.ccy_amount_B > 0) require(a.ccyTypeId_B > 0 && a.ccyTypeId_B <= ctd._ct_Count, "Bad ccyTypeId B");
        if (a.qty_A > 0) require(a.tokenTypeId_A > 0, "Bad tokenTypeId_A");
        if (a.qty_B > 0) require(a.tokenTypeId_B > 0, "Bad tokenTypeId_B");

        // erc20 support - initialize ledger entry if not known
        StructLib.initLedgerIfNew(ld, a.ledger_A);
        StructLib.initLedgerIfNew(ld, a.ledger_B);

        //
        // exchange fees (global or ledger override) (disabled if fee-reciever[contract owner] == fee-payer)
        // calc total payable (fixed + basis points), cap & collar
        //
        StructLib.FeeStruct storage exFeeStruct_ccy_A = ld._ledger[a.ledger_A].customFees.ccyType_Set[a.ccyTypeId_A]   ? ld._ledger[a.ledger_A].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_A = ld._ledger[a.ledger_A].customFees.tokType_Set[a.tokenTypeId_A] ? ld._ledger[a.ledger_A].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_ccy_B = ld._ledger[a.ledger_B].customFees.ccyType_Set[a.ccyTypeId_B]   ? ld._ledger[a.ledger_B].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_B = ld._ledger[a.ledger_B].customFees.tokType_Set[a.tokenTypeId_B] ? ld._ledger[a.ledger_B].customFees : globalFees;
        StructLib.FeesCalc memory exFees = StructLib.FeesCalc({ // exchange fees (disabled if fee-reciever == fee-payer)
            fee_ccy_A: a.ledger_A != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_ccy_A.ccy[a.ccyTypeId_A],   uint256(a.ccy_amount_A), a.qty_B) : 0,
            fee_ccy_B: a.ledger_B != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_ccy_B.ccy[a.ccyTypeId_B],   uint256(a.ccy_amount_B), a.qty_A) : 0,
            fee_tok_A: a.ledger_A != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_tok_A.tok[a.tokenTypeId_A], a.qty_A,                 0)       : 0,
            fee_tok_B: a.ledger_B != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_tok_B.tok[a.tokenTypeId_B], a.qty_B,                 0)       : 0,
               fee_to: a.feeAddrOwner,
       origTokFee_qty: 0,
   origTokFee_batchId: 0,
    origTokFee_struct: StructLib.SetFeeArgs({
               fee_fixed: 0,
            fee_percBips: 0,
                 fee_min: 0,
                 fee_max: 0,
         ccy_perMillion: 0,
           ccy_mirrorFee: false
        })
        });

        // apply exchange ccy fee mirroring - only ever from one side to the other
        if (exFees.fee_ccy_A > 0 && exFees.fee_ccy_B == 0) {
            if (exFeeStruct_ccy_A.ccy[a.ccyTypeId_A].ccy_mirrorFee == true) {
                a.ccyTypeId_B = a.ccyTypeId_A;
                //exFees.fee_ccy_B = exFees.fee_ccy_A; // symmetrical mirror

                // asymmetrical mirror
                exFeeStruct_ccy_B = ld._ledger[a.ledger_B].customFees.ccyType_Set[a.ccyTypeId_B]   ? ld._ledger[a.ledger_B].customFees : globalFees;
                exFees.fee_ccy_B = a.ledger_B != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_ccy_B.ccy[a.ccyTypeId_B], uint256(a.ccy_amount_A), a.qty_B) : 0; // ??!
            }
        }
        else if (exFees.fee_ccy_B > 0 && exFees.fee_ccy_A == 0) {
            if (exFeeStruct_ccy_B.ccy[a.ccyTypeId_B].ccy_mirrorFee == true) {
                a.ccyTypeId_A = a.ccyTypeId_B;
                //exFees.fee_ccy_A = exFees.fee_ccy_B; // symmetrical mirror

                // asymmetrical mirror
                exFeeStruct_ccy_A = ld._ledger[a.ledger_A].customFees.ccyType_Set[a.ccyTypeId_A] ? ld._ledger[a.ledger_A].customFees : globalFees;
                exFees.fee_ccy_A = a.ledger_A != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_ccy_A.ccy[a.ccyTypeId_A], uint256(a.ccy_amount_B), a.qty_A) : 0; // ??!
            }
        }

        //
        // originator token fees (disabled if fee-reciever[batch originator] == fee-payer)
        // potentially multiple: up to one originator token fee per distinct token batch
        //
        if (a.qty_A > 0) {
            v.ts_args[0] = TransferSplitArgs({ from: a.ledger_A, to: a.ledger_B, tokenTypeId: a.tokenTypeId_A, qtyUnit: a.qty_A, transferType: TransferType.User, maxStId: maxStId });
            v.ts_previews[0] = transferSplitSecTokens_Preview(ld, v.ts_args[0]);
            for (uint i = 0; i < v.ts_previews[0].batchCount ; i++) {
                StructLib.SecTokenBatch storage batch = ld._batches[v.ts_previews[0].batchIds[i]];
                uint256 tokFee = a.ledger_A != batch.originator ? calcFeeWithCapCollar(batch.origTokFee, v.ts_previews[0].transferQty[i], 0) : 0;
                v.totalOrigFee[0] += tokFee;
            }
        }
        if (a.qty_B > 0) {
            v.ts_args[1] = TransferSplitArgs({ from: a.ledger_B, to: a.ledger_A, tokenTypeId: a.tokenTypeId_B, qtyUnit: a.qty_B, transferType: TransferType.User, maxStId: maxStId });
            v.ts_previews[1] = transferSplitSecTokens_Preview(ld, v.ts_args[1]);
            for (uint i = 0; i < v.ts_previews[1].batchCount ; i++) {
                StructLib.SecTokenBatch storage batch = ld._batches[v.ts_previews[1].batchIds[i]];
                uint256 tokFee = a.ledger_A != batch.originator ? calcFeeWithCapCollar(batch.origTokFee, v.ts_previews[1].transferQty[i], 0) : 0;
                v.totalOrigFee[1] += tokFee;
            }
        }

        // validate currency balances - transfer amount & fees
        require(StructLib.sufficientCcy(ld, a.ledger_A, a.ccyTypeId_A,
                    a.ccy_amount_A, // amount sending
                    a.ccy_amount_B, // amount receiving
                    int256(exFees.fee_ccy_A) * (a.applyFees /*&& a.ccy_amount_A > 0 */? 1 : 0)), "Insufficient currency A");

        require(StructLib.sufficientCcy(ld, a.ledger_B, a.ccyTypeId_B,
                    a.ccy_amount_B, // amount sending
                    a.ccy_amount_A, // amount receiving
                    int256(exFees.fee_ccy_B) * (a.applyFees /*&& a.ccy_amount_B > 0 */? 1 : 0)), "Insufficient currency B");


        // validate token balances - sum exchange token fee + originator token fee(s)
        require(StructLib.sufficientTokens(ld, a.ledger_A, a.tokenTypeId_A, int256(a.qty_A),
                    int256((exFees.fee_tok_A + v.totalOrigFee[0]) * (a.applyFees && a.qty_A > 0 ? 1 : 0))), "Insufficient tokens A");
        require(StructLib.sufficientTokens(ld, a.ledger_B, a.tokenTypeId_B, int256(a.qty_B),
                    int256((exFees.fee_tok_B + v.totalOrigFee[1]) * (a.applyFees && a.qty_B > 0 ? 1 : 0))), "Insufficient tokens B");

        //
        // transfer currencies
        //
        if (a.ccy_amount_A > 0) {
            // user transfer from A
            transferCcy(ld, TransferCcyArgs({ from: a.ledger_A, to: a.ledger_B, ccyTypeId: a.ccyTypeId_A, amount: uint256(a.ccy_amount_A), transferType: TransferType.User }));
        }
        if (a.applyFees && exFees.fee_ccy_A > 0) {
            // exchange fee transfer from A
            transferCcy(ld, TransferCcyArgs({ from: a.ledger_A, to: a.feeAddrOwner, ccyTypeId: a.ccyTypeId_A, amount: exFees.fee_ccy_A, transferType: TransferType.ExchangeFee }));
        }

        if (a.ccy_amount_B > 0) {
            // user transfer from B
            transferCcy(ld, TransferCcyArgs({ from: a.ledger_B, to: a.ledger_A, ccyTypeId: a.ccyTypeId_B, amount: uint256(a.ccy_amount_B), transferType: TransferType.User }));
        }
        if (a.applyFees && exFees.fee_ccy_B > 0) {
            // exchange fee transfer from B
            transferCcy(ld, TransferCcyArgs({ from: a.ledger_B, to: a.feeAddrOwner, ccyTypeId: a.ccyTypeId_B, amount: exFees.fee_ccy_B, transferType: TransferType.ExchangeFee }));
        }

        //
        // apply originator currency fees per batch (capped % of total exchange currency fee)
        //
        if (a.applyFees) {
            uint256 tot_exFee_ccy = exFees.fee_ccy_A + exFees.fee_ccy_B;

            if (tot_exFee_ccy > 0) {
                require(a.ccyTypeId_A != 0 || a.ccyTypeId_B != 0, "Unexpected: undefined currency types");
                if (a.ccyTypeId_A != 0 && a.ccyTypeId_B != 0) require(a.ccyTypeId_A == a.ccyTypeId_B, "Unexpected: mirrored currency type mismatch");
                uint256 ccyTypeId = a.ccyTypeId_A != 0 ? a.ccyTypeId_A : a.ccyTypeId_B;

                // apply for A->B token batches
                applyOriginatorCcyFees(ld, v.ts_previews[0], tot_exFee_ccy, a.qty_A, a.feeAddrOwner, ccyTypeId);

                // apply for B->A token batches
                applyOriginatorCcyFees(ld, v.ts_previews[1], tot_exFee_ccy, a.qty_B, a.feeAddrOwner, ccyTypeId);
            }
        }

        //
        // transfer tokens
        //
        if (a.qty_A > 0) {
            if (a.applyFees) {
                // exchange token fee transfer from A
                if (exFees.fee_tok_A > 0) {
                    maxStId = transferSplitSecTokens(ld, TransferSplitArgs({ from: a.ledger_A, to: a.feeAddrOwner, tokenTypeId: a.tokenTypeId_A, qtyUnit: exFees.fee_tok_A, transferType: TransferType.ExchangeFee, maxStId: maxStId }));
                    v.exchangeFeesPaidQty += uint80(exFees.fee_tok_A);
                }

                // batch token fee transfer(s) from A
                for (uint i = 0; i < v.ts_previews[0].batchCount ; i++) { // originator token fees
                    StructLib.SecTokenBatch storage batch = ld._batches[v.ts_previews[0].batchIds[i]];
                    uint256 tokFee = a.ledger_A != batch.originator ? calcFeeWithCapCollar(batch.origTokFee, v.ts_previews[0].transferQty[i], 0) : 0;
                    if (tokFee > 0) {
                        maxStId = transferSplitSecTokens(ld, TransferSplitArgs({ from: a.ledger_A, to: batch.originator, tokenTypeId: a.tokenTypeId_A, qtyUnit: tokFee, transferType: TransferType.OriginatorFee, maxStId: maxStId }));
                        v.originatorFeesPaidQty += uint80(tokFee);
                    }
                }
            }
            // user transfer from A
             maxStId = transferSplitSecTokens(ld,
                TransferSplitArgs({ from: v.ts_args[0].from, to: v.ts_args[0].to, tokenTypeId: v.ts_args[0].tokenTypeId, qtyUnit: v.ts_args[0].qtyUnit, transferType: v.ts_args[0].transferType, maxStId: maxStId })
            );
            v.transferedQty += uint80(v.ts_args[0].qtyUnit);
        }
        if (a.qty_B > 0) {
            if (a.applyFees) {
                // exchange token fee transfer from B
                if (exFees.fee_tok_B > 0) {
                    maxStId = transferSplitSecTokens(ld, TransferSplitArgs({ from: a.ledger_B, to: a.feeAddrOwner, tokenTypeId: a.tokenTypeId_B, qtyUnit: exFees.fee_tok_B, transferType: TransferType.ExchangeFee, maxStId: maxStId }));
                    v.exchangeFeesPaidQty += uint80(exFees.fee_tok_B);
                }

                // batch token fee transfer(s) from B
                for (uint i = 0; i < v.ts_previews[1].batchCount ; i++) { // originator token fees
                    StructLib.SecTokenBatch storage batch = ld._batches[v.ts_previews[1].batchIds[i]];
                    uint256 tokFee = a.ledger_B != batch.originator ? calcFeeWithCapCollar(batch.origTokFee, v.ts_previews[1].transferQty[i], 0) : 0;
                    if (tokFee > 0) {
                        maxStId = transferSplitSecTokens(ld, TransferSplitArgs({ from: a.ledger_B, to: batch.originator, tokenTypeId: a.tokenTypeId_B, qtyUnit: tokFee, transferType: TransferType.OriginatorFee, maxStId: maxStId }));
                        v.originatorFeesPaidQty += uint80(tokFee);
                    }
                }
            }
            // user transfer from B
            maxStId = transferSplitSecTokens(ld,
                TransferSplitArgs({ from: v.ts_args[1].from, to: v.ts_args[1].to, tokenTypeId: v.ts_args[1].tokenTypeId, qtyUnit: v.ts_args[1].qtyUnit, transferType: v.ts_args[1].transferType, maxStId: maxStId })
            );
            v.transferedQty += uint80(v.ts_args[1].qtyUnit);
        }

        // set globals to final values
        ld._tokens_currentMax_id = maxStId; // packing this as a uint64 (and the fields below) into _spot_total struct *increases* gas cost! no idea why - reverted
        if (v.exchangeFeesPaidQty > 0) ld._spot_total.exchangeFeesPaidQty += v.exchangeFeesPaidQty;
        if (v.originatorFeesPaidQty > 0) ld._spot_total.originatorFeesPaidQty += v.originatorFeesPaidQty;
        ld._spot_total.transferedQty += v.transferedQty + v.exchangeFeesPaidQty + v.originatorFeesPaidQty;

        // emit trade events
        if (a.ccy_amount_A > 0 && a.qty_B > 0) {
            emit TradedCcyTok(a.ccyTypeId_A, uint256(a.ccy_amount_A), a.tokenTypeId_B, a.ledger_B, a.ledger_A, a.qty_B);
        }
        if (a.ccy_amount_B > 0 && a.qty_A > 0) {
            emit TradedCcyTok(a.ccyTypeId_B, uint256(a.ccy_amount_B), a.tokenTypeId_A, a.ledger_A, a.ledger_B, a.qty_A);
        }
    }

    //
    // PUBLIC - fee preview
    //
    function transfer_feePreview(
        StructLib.LedgerStruct storage ld,
        StructLib.FeeStruct storage globalFees,
        address feeAddrOwner,
        StructLib.TransferArgs memory a
    )
    public view
    // 1 exchange fee (single destination) + maximum of MAX_BATCHES_PREVIEW of originator fees on each side (x2) of the transfer
    returns (
        StructLib.FeesCalc[1 + MAX_BATCHES_PREVIEW * 2] memory feesAll
        //
        // SPLITTING
        // want to *also* return the # of full & partial ST transfers, involved in *ALL* the transfer actions (not just fees)
        // each set of { partialCount, fullCount } should be grouped by transfer-type: USER, EX_FEE, ORIG_FEE
        // transfer could then take params: { transferType: partialStart, partialEnd, fullStart, fullEnd } -- basically pagination of the sub-transfers
        //
        // TEST SETUP COULD BE: ~100 minted batches 1 ton each, and move 99 tons A-B (type USER, multi-batch)
        //       try to make orchestrator that batches by (eg.) 10...
        //       (exactly the same for type ORIG_FEE multi-batch)
        //
    ) {
        uint ndx = 0;

        // exchange fee
        StructLib.FeeStruct storage exFeeStruct_ccy_A = ld._ledger[a.ledger_A].customFees.ccyType_Set[a.ccyTypeId_A]   ? ld._ledger[a.ledger_A].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_A = ld._ledger[a.ledger_A].customFees.tokType_Set[a.tokenTypeId_A] ? ld._ledger[a.ledger_A].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_ccy_B = ld._ledger[a.ledger_B].customFees.ccyType_Set[a.ccyTypeId_B]   ? ld._ledger[a.ledger_B].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_B = ld._ledger[a.ledger_B].customFees.tokType_Set[a.tokenTypeId_B] ? ld._ledger[a.ledger_B].customFees : globalFees;
        feesAll[ndx++] = StructLib.FeesCalc({
            fee_ccy_A: a.ledger_A != a.feeAddrOwner && a.ccy_amount_A > 0 ? calcFeeWithCapCollar(exFeeStruct_ccy_A.ccy[a.ccyTypeId_A], uint256(a.ccy_amount_A), a.qty_B) : 0,
            fee_ccy_B: a.ledger_B != a.feeAddrOwner && a.ccy_amount_B > 0 ? calcFeeWithCapCollar(exFeeStruct_ccy_B.ccy[a.ccyTypeId_B], uint256(a.ccy_amount_B), a.qty_A) : 0,
            fee_tok_A: a.ledger_A != a.feeAddrOwner && a.qty_A > 0        ? calcFeeWithCapCollar(exFeeStruct_tok_A.tok[a.tokenTypeId_A], a.qty_A,               0)       : 0,
            fee_tok_B: a.ledger_B != a.feeAddrOwner && a.qty_B > 0        ? calcFeeWithCapCollar(exFeeStruct_tok_B.tok[a.tokenTypeId_B], a.qty_B,               0)       : 0,
               fee_to: feeAddrOwner,
       origTokFee_qty: 0,
   origTokFee_batchId: 0,
    origTokFee_struct: StructLib.SetFeeArgs({
               fee_fixed: 0,
            fee_percBips: 0,
                 fee_min: 0,
                 fee_max: 0,
          ccy_perMillion: 0,
           ccy_mirrorFee: false
        })
        });

        // apply exchange ccy fee mirroring - only ever from one side to the other
        if (feesAll[0].fee_ccy_A > 0 && feesAll[0].fee_ccy_B == 0) {
            if (exFeeStruct_ccy_A.ccy[a.ccyTypeId_A].ccy_mirrorFee == true) {
                a.ccyTypeId_B = a.ccyTypeId_A;
                //feesAll[0].fee_ccy_B = feesAll[0].fee_ccy_A; // symmetrical mirror

                // asymmetrical mirror
                exFeeStruct_ccy_B = ld._ledger[a.ledger_B].customFees.ccyType_Set[a.ccyTypeId_B] ? ld._ledger[a.ledger_B].customFees : globalFees;
                feesAll[0].fee_ccy_B = a.ledger_B != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_ccy_B.ccy[a.ccyTypeId_B], uint256(a.ccy_amount_A), a.qty_B) : 0; // ??!
            }
        }
        else if (feesAll[0].fee_ccy_B > 0 && feesAll[0].fee_ccy_A == 0) {
            if (exFeeStruct_ccy_B.ccy[a.ccyTypeId_B].ccy_mirrorFee == true) {
                a.ccyTypeId_A = a.ccyTypeId_B;
                //feesAll[0].fee_ccy_A = feesAll[0].fee_ccy_B; // symmetrical mirror

                // asymmetrical mirror
                exFeeStruct_ccy_A = ld._ledger[a.ledger_A].customFees.ccyType_Set[a.ccyTypeId_A] ? ld._ledger[a.ledger_A].customFees : globalFees;
                feesAll[0].fee_ccy_A = a.ledger_A != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_ccy_A.ccy[a.ccyTypeId_A], uint256(a.ccy_amount_B), a.qty_A) : 0; // ??!
            }
        }

        // originator token fee(s) - per batch
        uint256 maxStId = ld._tokens_currentMax_id;
        if (a.qty_A > 0) {
            TransferSplitPreviewReturn memory preview = transferSplitSecTokens_Preview(ld, TransferSplitArgs({ from: a.ledger_A, to: a.ledger_B, tokenTypeId: a.tokenTypeId_A, qtyUnit: a.qty_A, transferType: TransferType.User, maxStId: maxStId }));
            for (uint i = 0; i < preview.batchCount ; i++) {
                StructLib.SecTokenBatch storage batch = ld._batches[preview.batchIds[i]];
                if (a.ledger_A != batch.originator) {
                    feesAll[ndx++] = StructLib.FeesCalc({
                        fee_ccy_A: 0,
                        fee_ccy_B: 0,
                        fee_tok_A: calcFeeWithCapCollar(batch.origTokFee, preview.transferQty[i], 0),
                        fee_tok_B: 0,
                           fee_to: batch.originator,
                   origTokFee_qty: preview.transferQty[i],
               origTokFee_batchId: preview.batchIds[i],
                origTokFee_struct: batch.origTokFee
                    });
                }
            }
        }
        if (a.qty_B > 0) {
            TransferSplitPreviewReturn memory preview = transferSplitSecTokens_Preview(ld, TransferSplitArgs({ from: a.ledger_B, to: a.ledger_A, tokenTypeId: a.tokenTypeId_B, qtyUnit: a.qty_B, transferType: TransferType.User, maxStId: maxStId }));
            for (uint i = 0; i < preview.batchCount ; i++) {
                StructLib.SecTokenBatch storage batch = ld._batches[preview.batchIds[i]];
                if (a.ledger_B != batch.originator) {
                    feesAll[ndx++] = StructLib.FeesCalc({
                        fee_ccy_A: 0,
                        fee_ccy_B: 0,
                        fee_tok_A: 0,
                        fee_tok_B: calcFeeWithCapCollar(batch.origTokFee, preview.transferQty[i], 0),
                           fee_to: batch.originator,
                   origTokFee_qty: preview.transferQty[i],
               origTokFee_batchId: preview.batchIds[i],
                origTokFee_struct: batch.origTokFee
                    });
                }
            }
        }
    }

    //
    // INTERNAL - calculate & send batch originator ccy fees (shares of exchange ccy fee)
    //
    function applyOriginatorCcyFees(
        StructLib.LedgerStruct storage ld,
        TransferSplitPreviewReturn memory ts_preview,
        uint256 tot_exFee_ccy,
        uint256 tot_qty,
        address feeAddrOwner,
        uint256 ccyTypeId
    )
    private {
        // batch originator ccy fee - get total bips across all batches
        for (uint i = 0; i < ts_preview.batchCount ; i++) {
            StructLib.SecTokenBatch storage batch = ld._batches[ts_preview.batchIds[i]];
            ts_preview.TC += uint256(batch.origCcyFee_percBips_ExFee);
        }
        ts_preview.TC_capped = ts_preview.TC;
        if (ts_preview.TC_capped > 10000) ts_preview.TC_capped = 10000; // cap

        // calc each batch's share of total bips and of capped bips
        for (uint i = 0; i < ts_preview.batchCount ; i++) {
            StructLib.SecTokenBatch storage batch = ld._batches[ts_preview.batchIds[i]];

            // batch share of total qty sent - pro-rata with qty sent
            uint256 batch_exFee_ccy = (((ts_preview.transferQty[i] * 1000000/*increase precision*/) / tot_qty) * tot_exFee_ccy) / 1000000/*decrease precision*/;

            // batch fee - capped share of exchange ccy fee
            uint256 BFEE = (((uint256(batch.origCcyFee_percBips_ExFee) * 1000000/*increase precision*/) / 10000/*basis points*/) * batch_exFee_ccy) / 1000000/*decrease precision*/;

            //emit dbg1(batch.id, 0, 0, ts_preview.transferQty[i], tot_qty, batch_exFee_ccy, BFEE);

            // currency fee transfer: from exchange owner account to batch originator
            transferCcy(ld, TransferCcyArgs({ from: feeAddrOwner, to: batch.originator, ccyTypeId: ccyTypeId, amount: BFEE, transferType: TransferType.OriginatorFee }));
        }
    }

    //
    // INTERNAL - transfer ccy
    //
    struct TransferCcyArgs {
        address      from;
        address      to;
        uint256      ccyTypeId;
        uint256      amount;
        TransferType transferType;
    }
    function transferCcy(
        StructLib.LedgerStruct storage ld,
        TransferCcyArgs memory a)
    private {
        ld._ledger[a.from].ccyType_balance[a.ccyTypeId] -= int256(a.amount);
        ld._ledger[a.to].ccyType_balance[a.ccyTypeId] += int256(a.amount);
        ld._ccyType_totalTransfered[a.ccyTypeId] += a.amount;
        emit TransferedLedgerCcy(a.from, a.to, a.ccyTypeId, a.amount, a.transferType);

        if (a.transferType == TransferType.ExchangeFee) {
            ld._ccyType_totalFeesPaid[a.ccyTypeId] += a.amount;
        }
    }

    //
    // INTERNAL - transfer/split/merge tokens
    //
    struct TransferSplitArgs {
        address      from;
        address      to;
        uint256      tokenTypeId;
        uint256      qtyUnit;
        TransferType transferType;
        uint256      maxStId;
    }
    struct TransferSpltVars {
        uint256 ndx;
        int64 remainingToTransfer;
        bool mergedExisting;
    }
    function transferSplitSecTokens(
        StructLib.LedgerStruct storage ld,
        TransferSplitArgs memory a
    )
    private returns (uint256 updatedMaxStId) {

        uint256[] storage from_stIds = ld._ledger[a.from].tokenType_stIds[a.tokenTypeId];
        uint256[] storage to_stIds = ld._ledger[a.to].tokenType_stIds[a.tokenTypeId];

        // walk tokens - transfer sufficient STs (last one may get split)
        TransferSpltVars memory v;
        require(a.qtyUnit >= 0 && a.qtyUnit <= 0x7FFFFFFFFFFFFFFF, "Bad qtyUnit"); // max signed int64
        v.remainingToTransfer = int64(a.qtyUnit);

        uint256 maxStId = a.maxStId;
        while (v.remainingToTransfer > 0) {
            uint256 stId = from_stIds[v.ndx];
            int64 stQty = ld._sts[stId].currentQty;

            if (v.remainingToTransfer >= stQty) {

                // reassign the full ST across the ledger entries

                // remove from origin - replace hot index 0 with value at last (ndx++, in effect)
                from_stIds[v.ndx] = from_stIds[from_stIds.length - 1];
                from_stIds.length--;
                //ld._ledger[from].tokenType_sumQty[a.tokenTypeId] -= stQty;            //* gas - DROP DONE - only used internally, validation params

                // assign to destination
                //  IFF minting >1 ST is disallowed AND
                //  IFF validation of available qty's is already performed,
                //  THEN the merge condition below *** wrt. batchId can *never* be true:
                    // MERGE - if any existing destination ST is from same batch
                    // bool mergedExisting = false;
                    // for (uint i = 0; i < to_stIds.length; i++) {
                    //     if (_sts_batchId[to_stIds[i]] == batchId) { // ***
                    //         // resize (grow) the destination ST
                    //         _sts_currentQty[to_stIds[i]] += stQty;                // TODO gas - pack/combine
                    //         _sts_mintedQty[to_stIds[i]] += stQty;                 // TODO gas - pack/combine
                    //         // retire the old ST from the main list
                    //         _sts_currentQty[stId] = 0;
                    //         _sts_mintedQty[stId] = 0;
                    //         mergedExisting = true;
                    //         emit TransferedFullSecToken(a.from, a.to, stId, to_stIds[i], stQty, transferType);
                    //         break;
                    //     }
                    // }
                    // TRANSFER - if no existing destination ST from same batch
                    //if (!mergedExisting) {
                        to_stIds.push(stId);
                        emit TransferedFullSecToken(a.from, a.to, stId, 0, uint256(stQty), a.transferType);
                    //}
                //ld._ledger[to].tokenType_sumQty[tokenTypeId] += stQty;                //* gas - DROP DONE - only used internally, validation params

                v.remainingToTransfer -= stQty;
                if (v.remainingToTransfer > 0)
                    require(from_stIds.length > 0, "Insufficient tokens");
            }
            else {
                // split the ST across the ledger entries, soft-minting a new ST in the destination
                // note: the parent (origin) ST's minted qty also gets split across the two ST;
                //         this is so the total minted in the system is unchanged,
                //         and also so the total burned amount in the ST can still be calculated by _sts_mintedQty[x] - _sts_currentQty[x]
                // note: both parent and child ST point to each other (double-linked list)

                // assign new ST to destination

                    // MERGE - if any existing destination ST is from same batch
                    v.mergedExisting = false;
                    for (uint i = 0; i < to_stIds.length; i++) {

                        //if (ld._sts_batchId[to_stIds[i]] == ld._sts_batchId[stId]) {
                        if (ld._sts[to_stIds[i]].batchId == ld._sts[stId].batchId) {

                            // resize (grow) the destination ST
                            ld._sts[to_stIds[i]].currentQty += v.remainingToTransfer; // PACKED
                            ld._sts[to_stIds[i]].mintedQty += v.remainingToTransfer; // PACKED

                            v.mergedExisting = true;

                            emit TransferedPartialSecToken(a.from, a.to, stId, 0, to_stIds[i], uint256(v.remainingToTransfer), a.transferType);
                            break;
                        }
                    }
                    // SOFT-MINT - if no existing destination ST from same batch; inherit batch ID from parent ST
                    if (!v.mergedExisting) {

                        // gas: 50k
                        ld._sts[maxStId + 1].batchId = ld._sts[stId].batchId; // PACKED
                        ld._sts[maxStId + 1].currentQty = v.remainingToTransfer; // PACKED
                        ld._sts[maxStId + 1].mintedQty = v.remainingToTransfer; // PACKED

                        //ld._sts_mintedTimestamp[maxStId + 1] = block.timestamp;                 // gas - DROP DONE - can fetch from events
                        //ld._sts_splitFrom_id[maxStId + 1] = stId;                               // gas - DROP DONE - can fetch from events
                        //ld._ledger[to].tokenType_sumQty[tokenTypeId] += remainingToTransfer; // gas - DROP DONE - only used internally, validation params

                        to_stIds.push(maxStId + 1); // gas: 94k

                        emit TransferedPartialSecToken(a.from, a.to, stId, maxStId + 1, 0, uint256(v.remainingToTransfer), a.transferType); // gas: 11k

                        maxStId++;
                    }

                // resize (shrink) the origin ST
                ld._sts[stId].currentQty -= v.remainingToTransfer; // PACKED
                ld._sts[stId].mintedQty -= v.remainingToTransfer; // PACKED

                //ld._sts_splitTo_id[stId] = newStId;                                          // gas - DROP DONE - can index from events
                //ld._ledger[from].tokenType_sumQty[tokenTypeId] -= remainingToTransfer;       // gas - DROP DONE - only used internally, validation params

                v.remainingToTransfer = 0;
            }
        }
        return maxStId;
    }

    //
    // INTERNAL - fee preview
    //

    /**
     * @dev Previews token transfer across ledger owners
     * @param a TransferSplitArgs args
     * @return The distinct transfer-from batch IDs and the total quantity of tokens that would be transfered from each batch
     */
    struct TransferSplitPreviewReturn {
        uint64[MAX_BATCHES_PREVIEW] batchIds; // todo: pack these - quadratic gas cost for fixed memory
        uint256[MAX_BATCHES_PREVIEW] transferQty;
        uint256 batchCount;

        // calc fields for batch originator ccy fee - % of exchange currency fee
        uint256 TC;        // total cut        - sum originator batch origCcyFee_percBips_ExFee for all batches
        uint256 TC_capped; // total cut capped - capped (10000 bps) total cut
    }
    function transferSplitSecTokens_Preview(
        StructLib.LedgerStruct storage ld,
        TransferSplitArgs memory a)
    private view
    returns(TransferSplitPreviewReturn memory ret)
    {
        // init ret - grotesque, but can't return (or have as local var) a dynamic array
        uint64[MAX_BATCHES_PREVIEW] memory batchIds;
        uint256[MAX_BATCHES_PREVIEW] memory transferQty;
        ret = TransferSplitPreviewReturn({
               batchIds: batchIds,
            transferQty: transferQty,
             batchCount: 0,
                     TC: 0,
              TC_capped: 0
        });

        // get distinct batches affected - needed for fixed-size return array declaration
        uint256[] memory from_stIds = ld._ledger[a.from].tokenType_stIds[a.tokenTypeId]; // assignment of storage[] to memory[] is a copy
        require(from_stIds.length > 0, "No tokens");

        uint256 from_stIds_length = from_stIds.length;
        require(a.qtyUnit >= 0 && a.qtyUnit <= 0x7FFFFFFFFFFFFFFF, "Bad qtyUnit"); // max signed int64
        int64 remainingToTransfer = int64(a.qtyUnit);
        while (remainingToTransfer > 0) {
            uint256 stId = from_stIds[0];
            int64 stQty = ld._sts[stId].currentQty;
            uint64 fromBatchId = ld._sts[stId].batchId;

            // add to list of distinct batches, maintain transfer quantity from each batch
            bool knownBatch = false;
            for (uint i = 0; i < ret.batchCount; i++) {
                if (ret.batchIds[i] == fromBatchId) {
                    ret.transferQty[i] += uint256(remainingToTransfer >= stQty ? stQty : remainingToTransfer);
                    knownBatch = true;
                    break;
                }
            }
            if (!knownBatch) {
                require(ret.batchCount < MAX_BATCHES_PREVIEW, "Too many batches: try sending a smaller amount");
                ret.batchIds[ret.batchCount] = fromBatchId;
                ret.transferQty[ret.batchCount] = uint256(remainingToTransfer >= stQty ? stQty : remainingToTransfer);
                ret.batchCount++;
            }

            if (remainingToTransfer >= stQty) { // full ST transfer, and more needed

                from_stIds[0] = from_stIds[from_stIds_length - 1]; // replace in origin copy (ndx++, in effect)
                //from_stIds.length--;  // memory array can't be resized
                from_stIds_length--;    // so instead

                remainingToTransfer -= stQty;
                if (remainingToTransfer > 0)
                    require(from_stIds_length > 0, "Insufficient tokens");
            }
            else { // partial ST transfer, and no more needed
                remainingToTransfer = 0;
            }
        }
        return ret;
    }

    //
    // INTERNAL - fee calculations
    //

    /**
     * @notice Calculates capped & collared { fixed + basis points + fixed per Million consideration = total fee } based on the supplied fee structure
     * @param feeStructure Token or currency type fee structure mapping
     * @param sendAmount Amount being sent (token quantity or currency value)
     * @param receiveAmount Consideration value (tokens or currency) being received in return (if any)
     * @return Capped or collared fee
     */
    function calcFeeWithCapCollar(
        StructLib.SetFeeArgs storage feeStructure,
        uint256 sendAmount,
        uint256 receiveAmount
    )
    private view returns(uint256 totalFee) {
        uint256 feeA = applyFeeStruct(feeStructure, sendAmount, receiveAmount);
        return feeA;
    }

    function applyFeeStruct(
        StructLib.SetFeeArgs storage fs,
        uint256 sendAmount,
        uint256 receiveAmount
    )
    private view returns(uint256 totalFee) {
        uint256 feeAmount = fs.fee_fixed +
                    (((receiveAmount * 1000000000/*increase precision*/ / 1000000/*per million*/) * fs.ccy_perMillion) / 1000000000/*decrease precision*/) +
                    (((sendAmount * 1000000/*increase precision*/ / 10000/*basis points*/) * fs.fee_percBips) / 1000000/*decrease precision*/);
        if (sendAmount > 0) {
            if (feeAmount > fs.fee_max && fs.fee_max > 0) return fs.fee_max;
            if (feeAmount < fs.fee_min && fs.fee_min > 0) return fs.fee_min;
        }
        return feeAmount;
    }
}