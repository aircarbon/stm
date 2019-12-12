pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";

library TransferLib {
    enum TransferType { User, ExchangeFee, OriginatorFee }
    event TransferedLedgerCcy(address from, address to, uint256 ccyTypeId, uint256 amount, TransferType transferType);
    event TransferedFullSecToken(address from, address to, uint256 stId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    event TransferedPartialSecToken(address from, address to, uint256 splitFromSecTokenId, uint256 newSecTokenId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);

    uint256 constant MAX_BATCHES_PREVIEW = 4; // for fee previews: max distinct batch IDs that can participate in one side of a trade fee preview

    //
    // ERC20
    //
    //...?

    //
    // INTERNAL
    //
    struct TransferArgs {
        address ledger_A;
        address ledger_B;

        uint256 qty_A;           // ST quantity moving from A (excluding fees, if any)
        uint256 tokenTypeId_A;   // ST type moving from A

        uint256 qty_B;           // ST quantity moving from B (excluding fees, if any)
        uint256 tokenTypeId_B;   // ST type moving from B

        int256  ccy_amount_A;    // currency amount moving from A (excluding fees, if any)
                                 // (signed value: ledger ccyType_balance supports (theoretical) -ve balances)
        uint256 ccyTypeId_A;     // currency type moving from A

        int256  ccy_amount_B;    // currency amount moving from B (excluding fees, if any)
                                 // (signed value: ledger ccyType_balance supports (theoretical) -ve balances)
        uint256 ccyTypeId_B;     // currency type moving from B

        bool    applyFees;       // apply global fee structure to the transfer (both legs)
        address feeAddrOwner;    // exchange fees: receive address
        bool    previewFees;     // true to return a fee preview for the transfer, false to execute the transfer
    }

    struct FeesCalc {
        uint256 fee_ccy_A;
        uint256 fee_ccy_B;
        uint256 fee_tok_A;
        uint256 fee_tok_B;
        address fee_to;
    }
    struct TransferVars { // misc. working vars for transfer() fn - struct packed to preserve stack slots
        TransferSplitPreviewReturn[2] ts_previews; // [0] = A->B, [1] = B->A
        TransferSplitArgs[2] ts_args;
        uint256[2] totalOrigFee;
        uint80 transferedQty;
        uint80 exchangeFeesPaidQty;
        uint80 originatorFeesPaidQty;
    }
    function transfer(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.FeeStruct storage globalFees,
        TransferLib.TransferArgs memory a
    )
    public {
        require(ledgerData._ledger[a.ledger_A].exists == true, "Bad ledger_A");
        require(ledgerData._ledger[a.ledger_B].exists == true, "Bad ledger_B");
        require(a.ledger_A != a.ledger_B, "Bad transfer");
        require(a.qty_A > 0 || a.qty_B > 0 || a.ccy_amount_A > 0 || a.ccy_amount_B > 0, "Bad null transfer");
        require(a.qty_A <= 0xffffffffffffffff, "Bad qty_A");
        require(a.qty_B <= 0xffffffffffffffff, "Bad qty_B");
        require(!((a.qty_A > 0 && a.ccy_amount_A > 0) || (a.qty_B > 0 && a.ccy_amount_B > 0)),
            "Bad transfer types"); // disallow single origin multiple asset type transfers
        if (a.ccy_amount_A > 0) require(a.ccyTypeId_A > 0, "Bad ccyTypeId A");
        if (a.ccy_amount_B > 0) require(a.ccyTypeId_B > 0, "Bad ccyTypeId B");
        if (a.qty_A > 0) require(a.tokenTypeId_A > 0, "Bad tokenTypeId_A");
        if (a.qty_B > 0) require(a.tokenTypeId_B > 0, "Bad tokenTypeId_B");

        // exchange fees - calc total payable (fixed + basis points), cap & collar
        StructLib.FeeStruct storage exFeeStruct_ccy_A = ledgerData._ledger[a.ledger_A].customFees.ccyType_Set[a.ccyTypeId_A]   ? ledgerData._ledger[a.ledger_A].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_A = ledgerData._ledger[a.ledger_A].customFees.tokType_Set[a.tokenTypeId_A] ? ledgerData._ledger[a.ledger_A].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_ccy_B = ledgerData._ledger[a.ledger_B].customFees.ccyType_Set[a.ccyTypeId_B]   ? ledgerData._ledger[a.ledger_B].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_B = ledgerData._ledger[a.ledger_B].customFees.tokType_Set[a.tokenTypeId_B] ? ledgerData._ledger[a.ledger_B].customFees : globalFees;

        FeesCalc memory exFees = FeesCalc({ // exchange fees (disabled if fee-reciever == fee-payer)
            fee_ccy_A: a.ledger_A != a.feeAddrOwner ? applyCapCollar(exFeeStruct_ccy_A.ccy, a.ccyTypeId_A, uint256(a.ccy_amount_A), calcFee(exFeeStruct_ccy_A.ccy, a.ccyTypeId_A, uint256(a.ccy_amount_A))) : 0,
            fee_ccy_B: a.ledger_B != a.feeAddrOwner ? applyCapCollar(exFeeStruct_ccy_B.ccy, a.ccyTypeId_B, uint256(a.ccy_amount_B), calcFee(exFeeStruct_ccy_B.ccy, a.ccyTypeId_B, uint256(a.ccy_amount_B))) : 0,
            fee_tok_A: a.ledger_A != a.feeAddrOwner ? applyCapCollar(exFeeStruct_tok_A.tok, a.tokenTypeId_A, a.qty_A,               calcFee(exFeeStruct_tok_A.tok, a.tokenTypeId_A, a.qty_A)) : 0,
            fee_tok_B: a.ledger_B != a.feeAddrOwner ? applyCapCollar(exFeeStruct_tok_B.tok, a.tokenTypeId_B, a.qty_B,               calcFee(exFeeStruct_tok_B.tok, a.tokenTypeId_B, a.qty_B)) : 0,
               fee_to: a.feeAddrOwner
        });

        // validate currency balances - transfer amount & exchange fee
        require(StructLib.sufficientCcy(ledgerData, a.ledger_A, a.ccyTypeId_A, a.ccy_amount_A,
                    int256(exFees.fee_ccy_A) * (a.applyFees && a.ccy_amount_A > 0 ? 1 : 0)), "Insufficient currency A");
        require(StructLib.sufficientCcy(ledgerData, a.ledger_B, a.ccyTypeId_B, a.ccy_amount_B,
                    int256(exFees.fee_ccy_B) * (a.applyFees && a.ccy_amount_B > 0 ? 1 : 0)), "Insufficient currency B");

        TransferVars memory v;
        uint256 maxStId = ledgerData._tokens_currentMax_id;

        // calc batch originator token fees (disabled if fee-reciever[batch originator] == fee-payer)
        // potentially multiple: up to one originator fee per distinct token batch
        if (a.qty_A > 0) {
            v.ts_args[0] = TransferSplitArgs({ from: a.ledger_A, to: a.ledger_B, tokenTypeId: a.tokenTypeId_A, qtyUnit: a.qty_A, transferType: TransferType.User, maxStId: maxStId });
            v.ts_previews[0] = transferSplitSecTokens_Preview(ledgerData, v.ts_args[0]);
            for (uint i = 0; i < v.ts_previews[0].batchCount ; i++) {
                StructLib.SecTokenBatch storage batch = ledgerData._batches[v.ts_previews[0].batchIds[i]];
                uint256 tokFee = a.ledger_A != batch.originator ? applyCapCollar(batch.origTokFee, v.ts_previews[0].transferQty[i], calcFee(batch.origTokFee, v.ts_previews[0].transferQty[i])) : 0;
                v.totalOrigFee[0] += tokFee;
            }
        }
        if (a.qty_B > 0) {
            v.ts_args[1] = TransferSplitArgs({ from: a.ledger_B, to: a.ledger_A, tokenTypeId: a.tokenTypeId_B, qtyUnit: a.qty_B, transferType: TransferType.User, maxStId: maxStId });
            v.ts_previews[1] = transferSplitSecTokens_Preview(ledgerData, v.ts_args[1]);
            for (uint i = 0; i < v.ts_previews[1].batchCount ; i++) {
                StructLib.SecTokenBatch storage batch = ledgerData._batches[v.ts_previews[1].batchIds[i]];
                uint256 tokFee = a.ledger_A != batch.originator ? applyCapCollar(batch.origTokFee, v.ts_previews[1].transferQty[i], calcFee(batch.origTokFee, v.ts_previews[1].transferQty[i])) : 0;
                v.totalOrigFee[1] += tokFee;
            }
        }

        // validate token balances - sum exchange fee + originator fee(s)
        require(StructLib.sufficientTokens(ledgerData, a.ledger_A, a.tokenTypeId_A, a.qty_A,
                    (exFees.fee_tok_A + v.totalOrigFee[0]) * (a.applyFees && a.qty_A > 0 ? 1 : 0)), "Insufficient tokens A");
        require(StructLib.sufficientTokens(ledgerData, a.ledger_B, a.tokenTypeId_B, a.qty_B,
                    (exFees.fee_tok_B + v.totalOrigFee[1]) * (a.applyFees && a.qty_B > 0 ? 1 : 0)), "Insufficient tokens B");

        // transfer currencies
        if (a.ccy_amount_A > 0) {
            if (a.applyFees && exFees.fee_ccy_A > 0) // exchange fee
                transferCcy(ledgerData, TransferCcyArgs({ from: a.ledger_A, to: a.feeAddrOwner, ccyTypeId: a.ccyTypeId_A, amount: exFees.fee_ccy_A, transferType: TransferType.ExchangeFee }));
            transferCcy(ledgerData, TransferCcyArgs({ from: a.ledger_A, to: a.ledger_B, ccyTypeId: a.ccyTypeId_A, amount: uint256(a.ccy_amount_A), transferType: TransferType.User }));
        }
        if (a.ccy_amount_B > 0) {
            if (a.applyFees && exFees.fee_ccy_B > 0) // exchange fee
                transferCcy(ledgerData, TransferCcyArgs({ from: a.ledger_B, to: a.feeAddrOwner, ccyTypeId: a.ccyTypeId_B, amount: exFees.fee_ccy_B, transferType: TransferType.ExchangeFee }));
            transferCcy(ledgerData, TransferCcyArgs({ from: a.ledger_B, to: a.ledger_A, ccyTypeId: a.ccyTypeId_B, amount: uint256(a.ccy_amount_B), transferType: TransferType.User }));
        }

        // transfer tokens
        if (a.qty_A > 0) {
            if (a.applyFees) {
                if (exFees.fee_tok_A > 0) { // exchange fee
                    maxStId = transferSplitSecTokens(ledgerData, TransferSplitArgs({ from: a.ledger_A, to: a.feeAddrOwner, tokenTypeId: a.tokenTypeId_A, qtyUnit: exFees.fee_tok_A, transferType: TransferType.ExchangeFee, maxStId: maxStId }));
                    v.exchangeFeesPaidQty += uint80(exFees.fee_tok_A);
                }

                for (uint i = 0; i < v.ts_previews[0].batchCount ; i++) { // originator fees
                    StructLib.SecTokenBatch storage batch = ledgerData._batches[v.ts_previews[0].batchIds[i]];
                    uint256 tokFee = a.ledger_A != batch.originator ? applyCapCollar(batch.origTokFee, v.ts_previews[0].transferQty[i], calcFee(batch.origTokFee, v.ts_previews[0].transferQty[i])) : 0;
                    if (tokFee > 0) {
                        maxStId = transferSplitSecTokens(ledgerData, TransferSplitArgs({ from: a.ledger_A, to: batch.originator, tokenTypeId: a.tokenTypeId_A, qtyUnit: tokFee, transferType: TransferType.OriginatorFee, maxStId: maxStId }));
                        v.originatorFeesPaidQty += uint80(tokFee);
                    }
                }
            }
            maxStId = transferSplitSecTokens(ledgerData,
                TransferSplitArgs({ from: v.ts_args[0].from, to: v.ts_args[0].to, tokenTypeId: v.ts_args[0].tokenTypeId, qtyUnit: v.ts_args[0].qtyUnit, transferType: v.ts_args[0].transferType, maxStId: maxStId })
            );
            v.transferedQty += uint80(v.ts_args[0].qtyUnit);
        }
        if (a.qty_B > 0) {
            if (a.applyFees) {
                if (exFees.fee_tok_B > 0) { // exchange fee
                    maxStId = transferSplitSecTokens(ledgerData, TransferSplitArgs({ from: a.ledger_B, to: a.feeAddrOwner, tokenTypeId: a.tokenTypeId_B, qtyUnit: exFees.fee_tok_B, transferType: TransferType.ExchangeFee, maxStId: maxStId }));
                    v.exchangeFeesPaidQty += uint80(exFees.fee_tok_B);
                }

                for (uint i = 0; i < v.ts_previews[1].batchCount ; i++) { // originator fees
                    StructLib.SecTokenBatch storage batch = ledgerData._batches[v.ts_previews[1].batchIds[i]];
                    uint256 tokFee = a.ledger_B != batch.originator ? applyCapCollar(batch.origTokFee, v.ts_previews[1].transferQty[i], calcFee(batch.origTokFee, v.ts_previews[1].transferQty[i])) : 0;
                    if (tokFee > 0) {
                        maxStId = transferSplitSecTokens(ledgerData, TransferSplitArgs({ from: a.ledger_B, to: batch.originator, tokenTypeId: a.tokenTypeId_B, qtyUnit: tokFee, transferType: TransferType.OriginatorFee, maxStId: maxStId }));
                        v.originatorFeesPaidQty += uint80(tokFee);
                    }
                }
            }
            maxStId = transferSplitSecTokens(ledgerData,
                TransferSplitArgs({ from: v.ts_args[1].from, to: v.ts_args[1].to, tokenTypeId: v.ts_args[1].tokenTypeId, qtyUnit: v.ts_args[1].qtyUnit, transferType: v.ts_args[1].transferType, maxStId: maxStId })
            );
            v.transferedQty += uint80(v.ts_args[1].qtyUnit);
        }

        // set globals to final values
        ledgerData._tokens_currentMax_id = maxStId; // packing this as a uint64 (and the fields below) into _tokens_total struct *increases* gas cost! no idea why - reverted
        if (v.exchangeFeesPaidQty > 0) ledgerData._tokens_total.exchangeFeesPaidQty += v.exchangeFeesPaidQty;
        if (v.originatorFeesPaidQty > 0) ledgerData._tokens_total.originatorFeesPaidQty += v.originatorFeesPaidQty;
        ledgerData._tokens_total.transferedQty += v.transferedQty + v.exchangeFeesPaidQty + v.originatorFeesPaidQty;
    }

    //
    // INTERNAL - CCY
    //
    struct TransferCcyArgs {
        address      from;
        address      to;
        uint256      ccyTypeId;
        uint256      amount;
        TransferType transferType;
    }
    function transferCcy(
        StructLib.LedgerStruct storage ledgerData,
        TransferCcyArgs memory a)
    private {
        ledgerData._ledger[a.from].ccyType_balance[a.ccyTypeId] -= int256(a.amount);
        ledgerData._ledger[a.to].ccyType_balance[a.ccyTypeId] += int256(a.amount);
        ledgerData._ccyType_totalTransfered[a.ccyTypeId] += a.amount;
        emit TransferedLedgerCcy(a.from, a.to, a.ccyTypeId, a.amount, a.transferType);

        if (a.transferType == TransferType.ExchangeFee) {
            ledgerData._ccyType_totalFeesPaid[a.ccyTypeId] += a.amount;
        }
    }

    //
    // INTERNAL - TOKENS
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
        uint64 remainingToTransfer;
        bool mergedExisting;
    }
    function transferSplitSecTokens(
        StructLib.LedgerStruct storage ledgerData,
        TransferSplitArgs memory a
    )
    private returns (uint256 updatedMaxStId) {
        uint256[] storage from_stIds = ledgerData._ledger[a.from].tokenType_stIds[a.tokenTypeId];
        uint256[] storage to_stIds = ledgerData._ledger[a.to].tokenType_stIds[a.tokenTypeId];

        // walk tokens - transfer sufficient STs (last one may get split)
        TransferSpltVars memory v;
        v.remainingToTransfer = uint64(a.qtyUnit);

        uint256 maxStId = a.maxStId;
        while (v.remainingToTransfer > 0) {
            uint256 stId = from_stIds[v.ndx];
            uint64 stQty = ledgerData._sts[stId].currentQty;

            if (v.remainingToTransfer >= stQty) {

                // reassign the full ST across the ledger entries

                // remove from origin - replace hot index 0 with value at last (ndx++, in effect)
                from_stIds[v.ndx] = from_stIds[from_stIds.length - 1];
                from_stIds.length--;
                //ledgerData._ledger[from].tokenType_sumQty[a.tokenTypeId] -= stQty;            //* gas - DROP DONE - only used internally, validation params

                // assign to destination
                // while minting >1 ST is disallowed, the merge condition below can never be true:
                    // MERGE - if any existing destination ST is from same batch
                    // bool mergedExisting = false;
                    // for (uint i = 0; i < to_stIds.length; i++) {
                    //     if (_sts_batchId[to_stIds[i]] == batchId) {
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
                        emit TransferedFullSecToken(a.from, a.to, stId, 0, stQty, a.transferType);
                    //}
                //ledgerData._ledger[to].tokenType_sumQty[tokenTypeId] += stQty;                //* gas - DROP DONE - only used internally, validation params

                v.remainingToTransfer -= stQty;
                if (v.remainingToTransfer > 0)
                    require(from_stIds.length > 0, "Insufficient tokens");
            }
            else {
                // split the last ST across the ledger entries, soft-minting a new ST in the destination
                // note: the parent (origin) ST's minted qty also gets split across the two ST;
                //         this is so the total minted in the system is unchanged,
                //         and also so the total burned amount in the ST can still be calculated by _sts_mintedQty[x] - _sts_currentQty[x]
                // note: both parent and child ST point to each other (double-linked list)

                // assign new ST to destination

                    // MERGE - if any existing destination ST is from same batch
                    v.mergedExisting = false;
                    for (uint i = 0; i < to_stIds.length; i++) {

                        //if (ledgerData._sts_batchId[to_stIds[i]] == ledgerData._sts_batchId[stId]) {
                        if (ledgerData._sts[to_stIds[i]].batchId == ledgerData._sts[stId].batchId) {

                            // resize (grow) the destination ST
                            ledgerData._sts[to_stIds[i]].currentQty += v.remainingToTransfer; // PACKED
                            ledgerData._sts[to_stIds[i]].mintedQty += v.remainingToTransfer; // PACKED

                            v.mergedExisting = true;

                            emit TransferedPartialSecToken(a.from, a.to, stId, 0, to_stIds[i], v.remainingToTransfer, a.transferType);
                            break;
                        }
                    }
                    // SOFT-MINT - if no existing destination ST from same batch; inherit batch ID from parent ST
                    if (!v.mergedExisting) {

                        // gas: 50k
                        ledgerData._sts[maxStId + 1].batchId = ledgerData._sts[stId].batchId; // PACKED
                        ledgerData._sts[maxStId + 1].currentQty = v.remainingToTransfer; // PACKED
                        ledgerData._sts[maxStId + 1].mintedQty = v.remainingToTransfer; // PACKED

                        //ledgerData._sts_mintedTimestamp[maxStId + 1] = block.timestamp;                 // gas - DROP DONE - can fetch from events
                        //ledgerData._sts_splitFrom_id[maxStId + 1] = stId;                               // gas - DROP DONE - can fetch from events
                        //ledgerData._ledger[to].tokenType_sumQty[tokenTypeId] += remainingToTransfer; // gas - DROP DONE - only used internally, validation params

                        to_stIds.push(maxStId + 1); // gas: 94k

                        emit TransferedPartialSecToken(a.from, a.to, stId, maxStId + 1, 0, v.remainingToTransfer, a.transferType); // gas: 11k

                        maxStId++;
                    }

                // resize (shrink) the origin ST
                ledgerData._sts[stId].currentQty -= v.remainingToTransfer; // PACKED
                ledgerData._sts[stId].mintedQty -= v.remainingToTransfer; // PACKED

                //ledgerData._sts_splitTo_id[stId] = newStId;                                          // gas - DROP DONE - can index from events
                //ledgerData._ledger[from].tokenType_sumQty[tokenTypeId] -= remainingToTransfer;       // gas - DROP DONE - only used internally, validation params

                v.remainingToTransfer = 0;
            }
        }
        return maxStId;
    }

    //
    // INTERNAL - FEE PREVIEW
    //
    function transfer_feePreview(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.FeeStruct storage globalFees,
        address feeAddrOwner,
        TransferLib.TransferArgs memory a
    )
    internal view
    // 1 exchange fee (single destination) + maximum of MAX_BATCHES_PREVIEW of originator fees on each side (x2) of the transfer
    returns (
        TransferLib.FeesCalc[1 + MAX_BATCHES_PREVIEW * 2] memory feesAll
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
        StructLib.FeeStruct storage exFeeStruct_ccy_A = ledgerData._ledger[a.ledger_A].customFees.ccyType_Set[a.ccyTypeId_A]   ? ledgerData._ledger[a.ledger_A].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_A = ledgerData._ledger[a.ledger_A].customFees.tokType_Set[a.tokenTypeId_A] ? ledgerData._ledger[a.ledger_A].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_ccy_B = ledgerData._ledger[a.ledger_B].customFees.ccyType_Set[a.ccyTypeId_B]   ? ledgerData._ledger[a.ledger_B].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_B = ledgerData._ledger[a.ledger_B].customFees.tokType_Set[a.tokenTypeId_B] ? ledgerData._ledger[a.ledger_B].customFees : globalFees;

        feesAll[ndx++] = TransferLib.FeesCalc({
            fee_ccy_A: a.ledger_A != a.feeAddrOwner && a.ccy_amount_A > 0 ? applyCapCollar(exFeeStruct_ccy_A.ccy, a.ccyTypeId_A, uint256(a.ccy_amount_A), calcFee(exFeeStruct_ccy_A.ccy, a.ccyTypeId_A, uint256(a.ccy_amount_A))) : 0,
            fee_ccy_B: a.ledger_B != a.feeAddrOwner && a.ccy_amount_B > 0 ? applyCapCollar(exFeeStruct_ccy_B.ccy, a.ccyTypeId_B, uint256(a.ccy_amount_B), calcFee(exFeeStruct_ccy_B.ccy, a.ccyTypeId_B, uint256(a.ccy_amount_B))) : 0,
            fee_tok_A: a.ledger_A != a.feeAddrOwner && a.qty_A > 0        ? applyCapCollar(exFeeStruct_tok_A.tok, a.tokenTypeId_A, a.qty_A,               calcFee(exFeeStruct_tok_A.tok, a.tokenTypeId_A, a.qty_A)) : 0,
            fee_tok_B: a.ledger_B != a.feeAddrOwner && a.qty_B > 0        ? applyCapCollar(exFeeStruct_tok_B.tok, a.tokenTypeId_B, a.qty_B,               calcFee(exFeeStruct_tok_B.tok, a.tokenTypeId_B, a.qty_B)) : 0,
               fee_to: feeAddrOwner
        });

        // originator fee(s)
        uint256 maxStId = ledgerData._tokens_currentMax_id;
        if (a.qty_A > 0) {
            TransferSplitPreviewReturn memory preview = transferSplitSecTokens_Preview(ledgerData, TransferSplitArgs({ from: a.ledger_A, to: a.ledger_B, tokenTypeId: a.tokenTypeId_A, qtyUnit: a.qty_A, transferType: TransferType.User, maxStId: maxStId }));
            for (uint i = 0; i < preview.batchCount ; i++) {
                StructLib.SecTokenBatch storage batch = ledgerData._batches[preview.batchIds[i]];
                if (a.ledger_A != batch.originator) {
                    feesAll[ndx++] = TransferLib.FeesCalc({
                        fee_ccy_A: 0,
                        fee_ccy_B: 0,
                        fee_tok_A: applyCapCollar(batch.origTokFee, preview.transferQty[i], calcFee(batch.origTokFee, preview.transferQty[i])),
                        fee_tok_B: 0,
                        fee_to: batch.originator
                    });
                }
            }
        }
        if (a.qty_B > 0) {
            TransferSplitPreviewReturn memory preview = transferSplitSecTokens_Preview(ledgerData, TransferSplitArgs({ from: a.ledger_B, to: a.ledger_A, tokenTypeId: a.tokenTypeId_B, qtyUnit: a.qty_B, transferType: TransferType.User, maxStId: maxStId }));
            for (uint i = 0; i < preview.batchCount ; i++) {
                StructLib.SecTokenBatch storage batch = ledgerData._batches[preview.batchIds[i]];
                if (a.ledger_B != batch.originator) {
                    feesAll[ndx++] = TransferLib.FeesCalc({
                        fee_ccy_A: 0,
                        fee_ccy_B: 0,
                        fee_tok_A: 0,
                        fee_tok_B: applyCapCollar(batch.origTokFee, preview.transferQty[i], calcFee(batch.origTokFee, preview.transferQty[i])),
                        fee_to: batch.originator
                    });
                }
            }
        }
    }

    /**
     * @dev Previews ST transfer across ledger owners
     * @param a TransferSplitArgs args
     * @return The distinct transfer-from batch IDs and the total quantity of tokens that would be transfered from each batch
     */
    struct TransferSplitPreviewReturn {
        uint256[MAX_BATCHES_PREVIEW] batchIds; // TODO: pack these - quadratic gas cost for fixed memory
        uint256[MAX_BATCHES_PREVIEW] transferQty;
        uint256 batchCount;
    }
    function transferSplitSecTokens_Preview(
        StructLib.LedgerStruct storage ledgerData,
        TransferSplitArgs memory a)
    private view
    returns(TransferSplitPreviewReturn memory ret)
    {
        // init ret - grotesque, but can't return (or have as local var) a dynamic array
        uint256[MAX_BATCHES_PREVIEW] memory batchIds;
        uint256[MAX_BATCHES_PREVIEW] memory transferQty;
        ret = TransferSplitPreviewReturn({
               batchIds: batchIds,
            transferQty: transferQty,
             batchCount: 0
        });

        // get distinct batches affected - needed for fixed-size return array declaration
        uint256[] memory from_stIds = ledgerData._ledger[a.from].tokenType_stIds[a.tokenTypeId]; // assignment of storage[] to memory[] is a copy
        require(from_stIds.length > 0, "No tokens");

        uint256 from_stIds_length = from_stIds.length;
        uint256 remainingToTransfer = uint256(a.qtyUnit);
        while (remainingToTransfer > 0) {
            uint256 stId = from_stIds[0];
            uint64 stQty = ledgerData._sts[stId].currentQty; //ledgerData._sts_currentQty[stId];
            uint64 fromBatchId = ledgerData._sts[stId].batchId; //ledgerData._sts_batchId[stId];

            // add to list of distinct batches, maintain transfer quantity from each batch
            bool knownBatch = false;
            for (uint i = 0; i < ret.batchCount; i++) {
                if (ret.batchIds[i] == fromBatchId) {
                    ret.transferQty[i] += remainingToTransfer >= stQty ? stQty : remainingToTransfer;
                    knownBatch = true;
                    break;
                }
            }
            if (!knownBatch) {
                require(ret.batchCount < MAX_BATCHES_PREVIEW, "Excessive batches");
                ret.batchIds[ret.batchCount] = fromBatchId;
                ret.transferQty[ret.batchCount] = remainingToTransfer >= stQty ? stQty : remainingToTransfer;
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

    /**
     * @dev Calculates fixed + basis points total fee based on the fee structure of the supplied currency or token type
     * @param feeStructure Token or currency type fee structure mapping
     * @param typeId Token or currency type ID
     * @param transferAmount Currency amount or token quantity
     * @return Total fee
     */
    function calcFee(
        mapping(uint256 => StructLib.SetFeeArgs) storage feeStructure,
        uint256 typeId,
        uint256 transferAmount)
    internal view returns(uint256 totalFee) {
        return calcFee(feeStructure[typeId], transferAmount);
        //return feeStructure[typeId].fee_fixed + ((transferAmount * 1000000/*precision*/ / 10000/*basis points*/) * feeStructure[typeId].fee_percBips) / 1000000/*precision*/;
    }
    function calcFee(StructLib.SetFeeArgs storage feeStructure, uint256 transferAmount)
    internal view returns(uint256 totalFee) {
        return feeStructure.fee_fixed + ((transferAmount * 1000000/*precision*/ / 10000/*basis points*/) * feeStructure.fee_percBips) / 1000000/*precision*/;
    }

    /**
     * @dev Caps and collars (max and min) the supplied fee based on the fee structure of the supplied currency or token type
     * @param feeStructure Token or currency type fee structure mapping
     * @param typeId Token or currency type ID
     * @param feeAmount Uncapped/uncollared fee
     * @return Capped or collared fee
     */
    function applyCapCollar(
        mapping(uint256 => StructLib.SetFeeArgs) storage feeStructure,
        uint256 typeId,
        uint256 transferAmount,
        uint256 feeAmount)
    internal view returns(uint256 totalFee) {
        return applyCapCollar(feeStructure[typeId], transferAmount, feeAmount);
        // if (transferAmount > 0) {
        //     if (feeAmount > feeStructure[typeId].fee_max && feeStructure[typeId].fee_max > 0) return feeStructure[typeId].fee_max;
        //     if (feeAmount < feeStructure[typeId].fee_min && feeStructure[typeId].fee_min > 0) return feeStructure[typeId].fee_min;
        // } return feeAmount;
    }
    function applyCapCollar(StructLib.SetFeeArgs storage feeStructure, uint256 transferAmount, uint256 feeAmount) internal view returns(uint256 totalFee) {
        if (transferAmount > 0) {
            if (feeAmount > feeStructure.fee_max && feeStructure.fee_max > 0) return feeStructure.fee_max;
            if (feeAmount < feeStructure.fee_min && feeStructure.fee_min > 0) return feeStructure.fee_min;
        } return feeAmount;
    }
}