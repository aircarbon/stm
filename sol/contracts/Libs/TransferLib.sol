// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9
// Certik (AD): locked compiler version
pragma solidity 0.8.5;

import "../Interfaces/StructLib.sol";

import "../StMaster/StMaster.sol";

library TransferLib {
    event TransferedFullSecToken(address indexed from, address indexed to, uint256 indexed stId, uint256 mergedToSecTokenId, uint256 qty, StructLib.TransferType transferType);
    event TransferedPartialSecToken(address indexed from, address indexed to, uint256 indexed splitFromSecTokenId, uint256 newSecTokenId, uint256 mergedToSecTokenId, uint256 qty, StructLib.TransferType transferType);
    event TradedCcyTok(uint256 ccyTypeId, uint256 ccyAmount, uint256 tokTypeId, address indexed /*tokens*/from, address indexed /*tokens*/to, uint256 tokQty, uint256 ccyFeeFrom, uint256 ccyFeeTo);

    uint256 constant MAX_BATCHES_PREVIEW = 128; // for fee previews: max distinct batch IDs that can participate in one side of a trade fee preview

    //
    // PUBLIC - transfer/trade
    //
    struct TransferVars { // misc. working vars for transfer() fn - struct packed to preserve stack slots
        TransferSplitPreviewReturn[2] ts_previews; // [0] = A->B, [1] = B->A
        TransferSplitArgs[2]          ts_args;
        uint256[2]                    totalOrigFee;
        uint80                        transferedQty;
        uint80                        exchangeFeesPaidQty;
        uint80                        originatorFeesPaidQty;
    }
    // Certik: (Minor) TRA-01 | Equal ID Transfers The transfers of equal IDs are not prohibited in the transferOrTrade function
    // Review: TODO - (Minor) TRA-01 | Check with Certik as this might break critical transfer / trading functionality
    function transferOrTrade(
        StructLib.LedgerStruct storage   ld,
        StructLib.StTypesStruct storage  std,
        StructLib.CcyTypesStruct storage ctd,
        StructLib.FeeStruct storage      globalFees,
        StructLib.TransferArgs memory    a
    )
    public {
        // split-ledger: controller runs same method on base type (i.e. re-entrant)...
        //               each run is segmented by switches on controller vs. base types...
        //                  >> controller only updates/reads/validates ccy
        //                  >> base only updates/reads/validates tok's

        // TODO: for one-sided (ccy && token) transfers, output the supplied transferType in event... (space for this, for token events?!)

        TransferVars memory v;
        uint256 maxStId = ld._tokens_currentMax_id;

        require(ld._contractSealed, "Contract is not sealed");
        require(a.qty_A > 0 || a.qty_B > 0 || a.ccy_amount_A > 0 || a.ccy_amount_B > 0, "Bad null transfer");
        require(a.qty_A <= 0x7FFFFFFFFFFFFFFF, "Bad qty_A"); //* (2^64 /2: max signed int64) [was: 0xffffffffffffffff]
        require(a.qty_B <= 0x7FFFFFFFFFFFFFFF, "Bad qty_B"); //*

        // disallow single origin multiple asset type transfers
        require(!((a.qty_A > 0 && a.ccy_amount_A > 0) || (a.qty_B > 0 && a.ccy_amount_B > 0)), "Bad transfer types");

        // disallow currency swaps - we need single consistent ccy type on each side for ccy-fee mirroring
        // i.e. disallow swaps of two different currency-types (note: do allow: swaps of two different token-types)
        require(a.ccyTypeId_A == 0 || a.ccyTypeId_B == 0, "Bad ccy swap");

        // validate currency/token types
        if (ld.contractType != StructLib.ContractType.CASHFLOW_BASE) {
            if (a.ccy_amount_A > 0) require(a.ccyTypeId_A > 0 && a.ccyTypeId_A <= ctd._ct_Count, "Bad ccyTypeId A");
            if (a.ccy_amount_B > 0) require(a.ccyTypeId_B > 0 && a.ccyTypeId_B <= ctd._ct_Count, "Bad ccyTypeId B");
        }
        if (a.qty_A > 0) require(a.tokTypeId_A > 0, "Bad tokTypeId_A");
        if (a.qty_B > 0) require(a.tokTypeId_B > 0, "Bad tokTypeId_B");

        // require a transferType for one-sided transfers;
        // disallow transferType on two-sided trades (both ccy-tok trades, and [edgecase] tok-tok trades)
        if ((a.ccyTypeId_A > 0 && a.tokTypeId_B == 0) || (a.ccyTypeId_B > 0 && a.tokTypeId_A == 0) ||
            (a.tokTypeId_A > 0 && a.ccyTypeId_B == 0 && a.tokTypeId_B == 0) || (a.tokTypeId_B > 0 && a.ccyTypeId_A == 0 && a.tokTypeId_A == 0)
        ) {
             //require(a.transferType >= StructLib.TransferType.MintFee && a.transferType <= StructLib.TransferType.Adjustment, "Bad transferType");
            require(a.transferType >= StructLib.TransferType.SettlePay, "Bad transferType");
        }
        else require(a.transferType == StructLib.TransferType.Undefined, "Invalid transfer type");

        // cashflow controller: delegate token actions to base type
        if (ld.contractType == StructLib.ContractType.CASHFLOW_CONTROLLER) { //**
            if (a.qty_A > 0) {
                StMaster base_A = StMaster(std._tt_addr[a.tokTypeId_A]);
                base_A.transferOrTrade(StructLib.TransferArgs({ 
                     ledger_A: a.ledger_A,
                     ledger_B: a.ledger_B,
                        qty_A: a.qty_A,
                    k_stIds_A: a.k_stIds_A,
                  tokTypeId_A: 1/*a.tokTypeId_A*/, // base: UNI_TOKEN (controller does type ID mapping for clients)
                        qty_B: a.qty_B,
                    k_stIds_B: a.k_stIds_B,
                  tokTypeId_B: a.tokTypeId_B,
                 ccy_amount_A: a.ccy_amount_A,
                  ccyTypeId_A: a.ccyTypeId_A,
                 ccy_amount_B: a.ccy_amount_B,
                  ccyTypeId_B: a.ccyTypeId_B,
                    applyFees: a.applyFees,
                 feeAddrOwner: a.feeAddrOwner,
                 transferType: a.transferType
                }));
            }
            if (a.qty_B > 0) {
                StMaster base_B = StMaster(std._tt_addr[a.tokTypeId_B]);
                base_B.transferOrTrade(StructLib.TransferArgs({ 
                     ledger_A: a.ledger_A,
                     ledger_B: a.ledger_B,
                        qty_A: a.qty_A,
                    k_stIds_A: a.k_stIds_A,
                  tokTypeId_A: a.tokTypeId_A,
                        qty_B: a.qty_B,
                    k_stIds_B: a.k_stIds_B,
                  tokTypeId_B: 1/*a.tokTypeId_B*/, // base: UNI_TOKEN (controller does type ID mapping for clients)
                 ccy_amount_A: a.ccy_amount_A,
                  ccyTypeId_A: a.ccyTypeId_A,
                 ccy_amount_B: a.ccy_amount_B,
                  ccyTypeId_B: a.ccyTypeId_B,
                    applyFees: a.applyFees,
                 feeAddrOwner: a.feeAddrOwner,
                 transferType: a.transferType
                }));
            }
        }

        // transfer by ST ID: check supplied STs belong to supplied owner(s), and implied quantities match supplied quantities
        if (ld.contractType != StructLib.ContractType.CASHFLOW_CONTROLLER) { //**
            checkStIds(ld, a);
        }

        // erc20 support - initialize ledger entry if not known
        StructLib.initLedgerIfNew(ld, a.ledger_A);
        StructLib.initLedgerIfNew(ld, a.ledger_B);

        //
        // exchange fees (global or ledger override) (disabled if fee-reciever[contract owner] == fee-payer)
        // calc total payable (fixed + basis points), cap & collar
        //
        StructLib.FeeStruct storage exFeeStruct_ccy_A = ld._ledger[a.ledger_A].spot_customFees.ccyType_Set[a.ccyTypeId_A] ? ld._ledger[a.ledger_A].spot_customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_A = ld._ledger[a.ledger_A].spot_customFees.tokType_Set[a.tokTypeId_A] ? ld._ledger[a.ledger_A].spot_customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_ccy_B = ld._ledger[a.ledger_B].spot_customFees.ccyType_Set[a.ccyTypeId_B] ? ld._ledger[a.ledger_B].spot_customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_B = ld._ledger[a.ledger_B].spot_customFees.tokType_Set[a.tokTypeId_B] ? ld._ledger[a.ledger_B].spot_customFees : globalFees;
        StructLib.FeesCalc memory exFees = StructLib.FeesCalc({ // exchange fees (disabled if fee-reciever == fee-payer)
            fee_ccy_A: a.ledger_A != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_ccy_A.ccy[a.ccyTypeId_A], uint256(a.ccy_amount_A), a.qty_B) : 0,
            fee_ccy_B: a.ledger_B != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_ccy_B.ccy[a.ccyTypeId_B], uint256(a.ccy_amount_B), a.qty_A) : 0,
            fee_tok_A: a.ledger_A != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_tok_A.tok[a.tokTypeId_A], a.qty_A,                 0)       : 0,
            fee_tok_B: a.ledger_B != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_tok_B.tok[a.tokTypeId_B], a.qty_B,                 0)       : 0,
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
                //exFees.fee_ccy_B = exFees.fee_ccy_A; // symmetric mirror

                // asymmetric mirror
                exFeeStruct_ccy_B = ld._ledger[a.ledger_B].spot_customFees.ccyType_Set[a.ccyTypeId_B]   ? ld._ledger[a.ledger_B].spot_customFees : globalFees;
                exFees.fee_ccy_B = a.ledger_B != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_ccy_B.ccy[a.ccyTypeId_B], uint256(a.ccy_amount_A), a.qty_B) : 0; // ??!
            }
        }
        else if (exFees.fee_ccy_B > 0 && exFees.fee_ccy_A == 0) {
            if (exFeeStruct_ccy_B.ccy[a.ccyTypeId_B].ccy_mirrorFee == true) {
                a.ccyTypeId_A = a.ccyTypeId_B;
                //exFees.fee_ccy_A = exFees.fee_ccy_B; // symmetric mirror

                // asymmetric mirror
                exFeeStruct_ccy_A = ld._ledger[a.ledger_A].spot_customFees.ccyType_Set[a.ccyTypeId_A] ? ld._ledger[a.ledger_A].spot_customFees : globalFees;
                exFees.fee_ccy_A = a.ledger_A != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_ccy_A.ccy[a.ccyTypeId_A], uint256(a.ccy_amount_B), a.qty_A) : 0; // ??!
            }
        }

        //
        // originator token fees (disabled if fee-reciever[batch originator] == fee-payer)
        // potentially multiple: up to one originator token fee per distinct token batch
        //
        if (ld.contractType != StructLib.ContractType.CASHFLOW_CONTROLLER) { //**
            if (a.qty_A > 0) {
                v.ts_args[0] = TransferSplitArgs({ from: a.ledger_A, to: a.ledger_B, tokTypeId: a.tokTypeId_A, qtyUnit: a.qty_A, transferType: a.transferType == StructLib.TransferType.Undefined ? StructLib.TransferType.User : a.transferType, maxStId: maxStId, k_stIds_take: a.k_stIds_A/*, k_stIds_skip: new uint256[](0)*/ });
                v.ts_previews[0] = transferSplitSecTokens_Preview(ld, v.ts_args[0]);
                for (uint i = 0; i < v.ts_previews[0].batchCount ; i++) {
                    StructLib.SecTokenBatch storage batch = ld._batches[v.ts_previews[0].batchIds[i]];
                    uint256 tokFee = a.ledger_A != batch.originator ? calcFeeWithCapCollar(batch.origTokFee, v.ts_previews[0].transferQty[i], 0) : 0;
                    v.totalOrigFee[0] += tokFee;
                }
            }
            if (a.qty_B > 0) {
                v.ts_args[1] = TransferSplitArgs({ from: a.ledger_B, to: a.ledger_A, tokTypeId: a.tokTypeId_B, qtyUnit: a.qty_B, transferType: a.transferType == StructLib.TransferType.Undefined ? StructLib.TransferType.User : a.transferType, maxStId: maxStId, k_stIds_take: a.k_stIds_B/*, k_stIds_skip: new uint256[](0)*/ });
                v.ts_previews[1] = transferSplitSecTokens_Preview(ld, v.ts_args[1]);
                for (uint i = 0; i < v.ts_previews[1].batchCount ; i++) {
                    StructLib.SecTokenBatch storage batch = ld._batches[v.ts_previews[1].batchIds[i]];
                    uint256 tokFee = a.ledger_B != batch.originator ? calcFeeWithCapCollar(batch.origTokFee, v.ts_previews[1].transferQty[i], 0) : 0;
                    v.totalOrigFee[1] += tokFee;
                }
            }
        }

        // validate currency balances - transfer amount & fees
        if (ld.contractType != StructLib.ContractType.CASHFLOW_BASE) { //**
            require(StructLib.sufficientCcy(ld, a.ledger_A, a.ccyTypeId_A, a.ccy_amount_A/*amount sending*/, a.ccy_amount_B/*amount receiving*/, int256(exFees.fee_ccy_A * uint256(a.applyFees /*&& a.ccy_amount_A > 0 */? 1 : 0))), "Insufficient currency A");
            require(StructLib.sufficientCcy(ld, a.ledger_B, a.ccyTypeId_B, a.ccy_amount_B/*amount sending*/, a.ccy_amount_A/*amount receiving*/, int256(exFees.fee_ccy_B * uint256(a.applyFees /*&& a.ccy_amount_B > 0 */? 1 : 0))), "Insufficient currency B");
        }

        // validate token balances - sum exchange token fee + originator token fee(s)
        if (ld.contractType != StructLib.ContractType.CASHFLOW_CONTROLLER) { //**
            require(StructLib.sufficientTokens(ld, a.ledger_A, a.tokTypeId_A, int256(a.qty_A), int256((exFees.fee_tok_A + v.totalOrigFee[0]) * (a.applyFees && a.qty_A > 0 ? 1 : 0))), "Insufficient tokens A");
            require(StructLib.sufficientTokens(ld, a.ledger_B, a.tokTypeId_B, int256(a.qty_B), int256((exFees.fee_tok_B + v.totalOrigFee[1]) * (a.applyFees && a.qty_B > 0 ? 1 : 0))), "Insufficient tokens B");
        }

        //
        // transfer currencies
        //
        if (ld.contractType != StructLib.ContractType.CASHFLOW_BASE) { //**
            if (a.ccy_amount_A > 0) { // user transfer from A
                StructLib.transferCcy(ld, StructLib.TransferCcyArgs({ from: a.ledger_A, to: a.ledger_B, ccyTypeId: a.ccyTypeId_A, amount: uint256(a.ccy_amount_A), transferType: a.transferType == StructLib.TransferType.Undefined ? StructLib.TransferType.User : a.transferType }));
            }
            if (a.applyFees && exFees.fee_ccy_A > 0) { // exchange fee transfer from A
                StructLib.transferCcy(ld, StructLib.TransferCcyArgs({ from: a.ledger_A, to: a.feeAddrOwner, ccyTypeId: a.ccyTypeId_A, amount: exFees.fee_ccy_A, transferType: StructLib.TransferType.ExchangeFee }));
            }

            if (a.ccy_amount_B > 0) { // user transfer from B
                StructLib.transferCcy(ld, StructLib.TransferCcyArgs({ from: a.ledger_B, to: a.ledger_A, ccyTypeId: a.ccyTypeId_B, amount: uint256(a.ccy_amount_B), transferType: a.transferType == StructLib.TransferType.Undefined ? StructLib.TransferType.User : a.transferType }));
            }
            if (a.applyFees && exFees.fee_ccy_B > 0) { // exchange fee transfer from B
                StructLib.transferCcy(ld, StructLib.TransferCcyArgs({ from: a.ledger_B, to: a.feeAddrOwner, ccyTypeId: a.ccyTypeId_B, amount: exFees.fee_ccy_B, transferType: StructLib.TransferType.ExchangeFee }));
            }
        }

        //
        // apply originator currency fees per batch (capped % of total exchange currency fee)
        //
        if (ld.contractType != StructLib.ContractType.CASHFLOW_BASE) { //**
            if (a.applyFees) {
                uint256 tot_exFee_ccy = exFees.fee_ccy_A + exFees.fee_ccy_B;

                if (tot_exFee_ccy > 0) {
                    require(a.ccyTypeId_A != 0 || a.ccyTypeId_B != 0, "Unexpected: undefined currency types");
                    if (a.ccyTypeId_A != 0 && a.ccyTypeId_B != 0) {
                        require(a.ccyTypeId_A == a.ccyTypeId_B, "Unexpected: mirrored currency type mismatch");
                    }
                    uint256 ccyTypeId = a.ccyTypeId_A != 0 ? a.ccyTypeId_A : a.ccyTypeId_B;

                    // apply for A->B token batches
                    applyOriginatorCcyFees(ld, v.ts_previews[0], tot_exFee_ccy, a.qty_A, a.feeAddrOwner, ccyTypeId);

                    // apply for B->A token batches
                    applyOriginatorCcyFees(ld, v.ts_previews[1], tot_exFee_ccy, a.qty_B, a.feeAddrOwner, ccyTypeId);
                }
            }
        }

        //
        // transfer tokens
        //
        if (ld.contractType != StructLib.ContractType.CASHFLOW_CONTROLLER) { //**
            if (a.qty_A > 0) {
                if (a.applyFees) {
                    // exchange token fee transfer from A
                    if (exFees.fee_tok_A > 0) {
                        maxStId = transferSplitSecTokens(ld, TransferSplitArgs({ from: a.ledger_A, to: a.feeAddrOwner, tokTypeId: a.tokTypeId_A, qtyUnit: exFees.fee_tok_A, transferType: StructLib.TransferType.ExchangeFee, maxStId: maxStId, k_stIds_take: a.k_stIds_A/*, k_stIds_skip: new uint256[](0)*/ }));
                        v.exchangeFeesPaidQty += uint80(exFees.fee_tok_A);
                    }

                    // batch originator token fee transfer(s) from A
                    for (uint i = 0; i < v.ts_previews[0].batchCount ; i++) { // originator token fees
                        StructLib.SecTokenBatch storage batch = ld._batches[v.ts_previews[0].batchIds[i]];
                        uint256 tokFee = a.ledger_A != batch.originator ? calcFeeWithCapCollar(batch.origTokFee, v.ts_previews[0].transferQty[i], 0) : 0;
                        if (tokFee > 0) {
                            maxStId = transferSplitSecTokens(ld, TransferSplitArgs({ from: a.ledger_A, to: batch.originator, tokTypeId: a.tokTypeId_A, qtyUnit: tokFee, transferType: StructLib.TransferType.OriginatorFee, maxStId: maxStId, k_stIds_take: a.k_stIds_A/*, k_stIds_skip: new uint256[](0)*/ }));
                            v.originatorFeesPaidQty += uint80(tokFee);
                        }
                    }
                }
                // user transfer from A
                maxStId = transferSplitSecTokens(ld,
                    TransferSplitArgs({ from: v.ts_args[0].from, to: v.ts_args[0].to, tokTypeId: v.ts_args[0].tokTypeId, qtyUnit: v.ts_args[0].qtyUnit, transferType: v.ts_args[0].transferType, maxStId: maxStId, k_stIds_take: a.k_stIds_A/*, k_stIds_skip: new uint256[](0)*/ })
                );
                v.transferedQty += uint80(v.ts_args[0].qtyUnit);
            }
            if (a.qty_B > 0) {
                if (a.applyFees) {
                    // exchange token fee transfer from B
                    if (exFees.fee_tok_B > 0) {
                        maxStId = transferSplitSecTokens(ld, TransferSplitArgs({ from: a.ledger_B, to: a.feeAddrOwner, tokTypeId: a.tokTypeId_B, qtyUnit: exFees.fee_tok_B, transferType: StructLib.TransferType.ExchangeFee, maxStId: maxStId, k_stIds_take: a.k_stIds_B/*, k_stIds_skip: new uint256[](0)*/ }));
                        v.exchangeFeesPaidQty += uint80(exFees.fee_tok_B);
                    }

                    // batch originator token fee transfer(s) from B
                    for (uint i = 0; i < v.ts_previews[1].batchCount ; i++) { // originator token fees
                        StructLib.SecTokenBatch storage batch = ld._batches[v.ts_previews[1].batchIds[i]];
                        uint256 tokFee = a.ledger_B != batch.originator ? calcFeeWithCapCollar(batch.origTokFee, v.ts_previews[1].transferQty[i], 0) : 0;
                        if (tokFee > 0) {
                            maxStId = transferSplitSecTokens(ld, TransferSplitArgs({ from: a.ledger_B, to: batch.originator, tokTypeId: a.tokTypeId_B, qtyUnit: tokFee, transferType: StructLib.TransferType.OriginatorFee, maxStId: maxStId, k_stIds_take: a.k_stIds_B/*, k_stIds_skip: new uint256[](0)*/ }));
                            v.originatorFeesPaidQty += uint80(tokFee);
                        }
                    }
                }
                // user transfer from B
                maxStId = transferSplitSecTokens(ld,
                    TransferSplitArgs({ from: v.ts_args[1].from, to: v.ts_args[1].to, tokTypeId: v.ts_args[1].tokTypeId, qtyUnit: v.ts_args[1].qtyUnit, transferType: v.ts_args[1].transferType, maxStId: maxStId, k_stIds_take: a.k_stIds_B/*, k_stIds_skip: new uint256[](0)*/ })
                );
                v.transferedQty += uint80(v.ts_args[1].qtyUnit);
            }

            // set globals to final values
            ld._tokens_currentMax_id = maxStId; // packing this as a uint64 (and the fields below) into _spot_total struct *increases* gas cost! no idea why - reverted
        }

        // 24k
        //if (v.exchangeFeesPaidQty > 0) ld._spot_total.exchangeFeesPaidQty += v.exchangeFeesPaidQty;
        //if (v.originatorFeesPaidQty > 0) ld._spot_total.originatorFeesPaidQty += v.originatorFeesPaidQty;
        //ld._spot_total.transferedQty += v.transferedQty + v.exchangeFeesPaidQty + v.originatorFeesPaidQty;

        // emit trade events
        if (ld.contractType != StructLib.ContractType.CASHFLOW_BASE) { //**
            if (a.ccy_amount_A > 0 && a.qty_B > 0) {
                emit TradedCcyTok(a.ccyTypeId_A, uint256(a.ccy_amount_A), a.tokTypeId_B, a.ledger_B, a.ledger_A, a.qty_B, a.applyFees ? exFees.fee_ccy_B : 0, a.applyFees ? exFees.fee_ccy_A : 0);
            }
            if (a.ccy_amount_B > 0 && a.qty_A > 0) {
                emit TradedCcyTok(a.ccyTypeId_B, uint256(a.ccy_amount_B), a.tokTypeId_A, a.ledger_A, a.ledger_B, a.qty_A, a.applyFees ? exFees.fee_ccy_A : 0, a.applyFees ? exFees.fee_ccy_B : 0);
            }
        }
    }

    //
    // PUBLIC - fee preview (FULL - includes originator token fees)
    //
    function transfer_feePreview(
        StructLib.LedgerStruct storage  ld,
        StructLib.StTypesStruct storage std,
        StructLib.FeeStruct storage     globalFees,
        address                         feeAddrOwner,
        StructLib.TransferArgs memory   a
    )
    public view
    // 1 exchange fee (single destination) + maximum of MAX_BATCHES_PREVIEW of originator fees on each side (x2) of the transfer
    returns (
        StructLib.FeesCalc[1 + MAX_BATCHES_PREVIEW * 2] memory feesAll
        //
        // SPLITTING
        // want to *also* return the # of full & partial ST transfers, involved in *ALL* the transfer actions (not just fees)
        // each set of { partialCount, fullCount } should be grouped by transfer-type: USER, EX_FEE, ORIG_FEE
        // transfer could then take params: { StructLib.TransferType: partialStart, partialEnd, fullStart, fullEnd } -- basically pagination of the sub-transfers
        //
        // TEST SETUP COULD BE: ~100 minted batches 1 ton each, and move 99 tons A-B (type USER, multi-batch)
        //       try to make orchestrator that batches by (eg.) 10...
        //       (exactly the same for type ORIG_FEE multi-batch)
        //
    ) {
        uint ndx = 0;

        // transfer by ST ID: check supplied STs belong to supplied owner(s), and implied quantities match supplied quantities
        if (ld.contractType != StructLib.ContractType.CASHFLOW_CONTROLLER) { //**
            checkStIds(ld, a);
        }

        // exchange fee
        StructLib.FeeStruct storage exFeeStruct_ccy_A = ld._ledger[a.ledger_A].spot_customFees.ccyType_Set[a.ccyTypeId_A] ? ld._ledger[a.ledger_A].spot_customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_A = ld._ledger[a.ledger_A].spot_customFees.tokType_Set[a.tokTypeId_A] ? ld._ledger[a.ledger_A].spot_customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_ccy_B = ld._ledger[a.ledger_B].spot_customFees.ccyType_Set[a.ccyTypeId_B] ? ld._ledger[a.ledger_B].spot_customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_B = ld._ledger[a.ledger_B].spot_customFees.tokType_Set[a.tokTypeId_B] ? ld._ledger[a.ledger_B].spot_customFees : globalFees;
        feesAll[ndx++] = StructLib.FeesCalc({
            fee_ccy_A: a.ledger_A != a.feeAddrOwner && a.ccy_amount_A > 0 ? calcFeeWithCapCollar(exFeeStruct_ccy_A.ccy[a.ccyTypeId_A], uint256(a.ccy_amount_A), a.qty_B) : 0,
            fee_ccy_B: a.ledger_B != a.feeAddrOwner && a.ccy_amount_B > 0 ? calcFeeWithCapCollar(exFeeStruct_ccy_B.ccy[a.ccyTypeId_B], uint256(a.ccy_amount_B), a.qty_A) : 0,
            fee_tok_A: a.ledger_A != a.feeAddrOwner && a.qty_A > 0        ? calcFeeWithCapCollar(exFeeStruct_tok_A.tok[a.tokTypeId_A], a.qty_A,                 0)       : 0,
            fee_tok_B: a.ledger_B != a.feeAddrOwner && a.qty_B > 0        ? calcFeeWithCapCollar(exFeeStruct_tok_B.tok[a.tokTypeId_B], a.qty_B,                 0)       : 0,
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
                //feesAll[0].fee_ccy_B = feesAll[0].fee_ccy_A; // symmetric mirror

                // asymmetric mirror
                exFeeStruct_ccy_B = ld._ledger[a.ledger_B].spot_customFees.ccyType_Set[a.ccyTypeId_B] ? ld._ledger[a.ledger_B].spot_customFees : globalFees;
                feesAll[0].fee_ccy_B = a.ledger_B != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_ccy_B.ccy[a.ccyTypeId_B], uint256(a.ccy_amount_A), a.qty_B) : 0; // ??!
            }
        }
        else if (feesAll[0].fee_ccy_B > 0 && feesAll[0].fee_ccy_A == 0) {
            if (exFeeStruct_ccy_B.ccy[a.ccyTypeId_B].ccy_mirrorFee == true) {
                a.ccyTypeId_A = a.ccyTypeId_B;
                //feesAll[0].fee_ccy_A = feesAll[0].fee_ccy_B; // symmetric mirror

                // asymmetric mirror
                exFeeStruct_ccy_A = ld._ledger[a.ledger_A].spot_customFees.ccyType_Set[a.ccyTypeId_A] ? ld._ledger[a.ledger_A].spot_customFees : globalFees;
                feesAll[0].fee_ccy_A = a.ledger_A != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_ccy_A.ccy[a.ccyTypeId_A], uint256(a.ccy_amount_B), a.qty_A) : 0; // ??!
            }
        }

        // originator token fee(s) - per batch
        if (ld.contractType != StructLib.ContractType.CASHFLOW_CONTROLLER) { //**
            uint256 maxStId = ld._tokens_currentMax_id;
            if (a.qty_A > 0) {
                TransferSplitPreviewReturn memory preview = transferSplitSecTokens_Preview(ld, TransferSplitArgs({ from: a.ledger_A, to: a.ledger_B, tokTypeId: a.tokTypeId_A, qtyUnit: a.qty_A, transferType: StructLib.TransferType.User, maxStId: maxStId, k_stIds_take: a.k_stIds_A/*, k_stIds_skip: new uint256[](0)*/ }));
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
                TransferSplitPreviewReturn memory preview = transferSplitSecTokens_Preview(ld, TransferSplitArgs({ from: a.ledger_B, to: a.ledger_A, tokTypeId: a.tokTypeId_B, qtyUnit: a.qty_B, transferType: StructLib.TransferType.User, maxStId: maxStId, k_stIds_take: a.k_stIds_B/*, k_stIds_skip: new uint256[](0)*/ }));
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
        else { // controller - delegate token fee previews to base type(s) & merge results
            if (a.qty_A > 0) {
                StMaster base_A = StMaster(std._tt_addr[a.tokTypeId_A]);
                StructLib.FeesCalc[1 + MAX_BATCHES_PREVIEW * 2] memory feesBase = base_A.transfer_feePreview(StructLib.TransferArgs({ 
                     ledger_A: a.ledger_A,
                     ledger_B: a.ledger_B,
                        qty_A: a.qty_A,
                    k_stIds_A: a.k_stIds_A,
                  tokTypeId_A: 1/*a.tokTypeId_A*/, // base: UNI_TOKEN (controller does type ID mapping for clients)
                        qty_B: a.qty_B,
                    k_stIds_B: a.k_stIds_B,
                  tokTypeId_B: a.tokTypeId_B,
                 ccy_amount_A: a.ccy_amount_A,
                  ccyTypeId_A: a.ccyTypeId_A,
                 ccy_amount_B: a.ccy_amount_B,
                  ccyTypeId_B: a.ccyTypeId_B,
                    applyFees: a.applyFees,
                 feeAddrOwner: a.feeAddrOwner,
                 transferType: a.transferType
                }));
                for (uint i = 1 ; i < feesBase.length ; i++) {
                    if (feesBase[i].fee_tok_A > 0) {
                        feesAll[i] = feesBase[i];
                    }
                }
            }
            if (a.qty_B > 0) {
                StMaster base_B = StMaster(std._tt_addr[a.tokTypeId_B]);
                StructLib.FeesCalc[1 + MAX_BATCHES_PREVIEW * 2] memory feesBase = base_B.transfer_feePreview(StructLib.TransferArgs({ 
                     ledger_A: a.ledger_A,
                     ledger_B: a.ledger_B,
                        qty_A: a.qty_A,
                    k_stIds_A: a.k_stIds_A,
                  tokTypeId_A: a.tokTypeId_A,
                        qty_B: a.qty_B,
                    k_stIds_B: a.k_stIds_B,
                  tokTypeId_B: 1/*a.tokTypeId_B*/, // base: UNI_TOKEN (controller does type ID mapping for clients)
                 ccy_amount_A: a.ccy_amount_A,
                  ccyTypeId_A: a.ccyTypeId_A,
                 ccy_amount_B: a.ccy_amount_B,
                  ccyTypeId_B: a.ccyTypeId_B,
                    applyFees: a.applyFees,
                 feeAddrOwner: a.feeAddrOwner,
                 transferType: a.transferType
                }));
                for (uint i = 1 ; i < feesBase.length ; i++) {
                    if (feesBase[i].fee_tok_B > 0) {
                        feesAll[i] = feesBase[i];
                    }
                }
            }
        }
    }

    //
    // PUBLIC - fee preview (FAST - returns only the exchange fee[s])
    //
    function transfer_feePreview_ExchangeOnly(
        StructLib.LedgerStruct storage ld,
        StructLib.FeeStruct storage    globalFees,
        address                        feeAddrOwner,
        StructLib.TransferArgs memory  a
    )
    public view returns (StructLib.FeesCalc[1] memory feesAll) { // 1 exchange fee only (single destination)
        uint ndx = 0;

        // transfer by ST ID: check supplied STs belong to supplied owner(s), and implied quantities match supplied quantities
        if (ld.contractType != StructLib.ContractType.CASHFLOW_CONTROLLER) { //**
            checkStIds(ld, a);
        }

        // TODO: refactor - this is common/identical to transfer_feePreview...

        // exchange fee
        StructLib.FeeStruct storage exFeeStruct_ccy_A = ld._ledger[a.ledger_A].spot_customFees.ccyType_Set[a.ccyTypeId_A] ? ld._ledger[a.ledger_A].spot_customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_A = ld._ledger[a.ledger_A].spot_customFees.tokType_Set[a.tokTypeId_A] ? ld._ledger[a.ledger_A].spot_customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_ccy_B = ld._ledger[a.ledger_B].spot_customFees.ccyType_Set[a.ccyTypeId_B] ? ld._ledger[a.ledger_B].spot_customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_B = ld._ledger[a.ledger_B].spot_customFees.tokType_Set[a.tokTypeId_B] ? ld._ledger[a.ledger_B].spot_customFees : globalFees;
        feesAll[ndx++] = StructLib.FeesCalc({
            fee_ccy_A: a.ledger_A != a.feeAddrOwner && a.ccy_amount_A > 0 ? calcFeeWithCapCollar(exFeeStruct_ccy_A.ccy[a.ccyTypeId_A], uint256(a.ccy_amount_A), a.qty_B) : 0,
            fee_ccy_B: a.ledger_B != a.feeAddrOwner && a.ccy_amount_B > 0 ? calcFeeWithCapCollar(exFeeStruct_ccy_B.ccy[a.ccyTypeId_B], uint256(a.ccy_amount_B), a.qty_A) : 0,
            fee_tok_A: a.ledger_A != a.feeAddrOwner && a.qty_A > 0        ? calcFeeWithCapCollar(exFeeStruct_tok_A.tok[a.tokTypeId_A], a.qty_A,                 0)       : 0,
            fee_tok_B: a.ledger_B != a.feeAddrOwner && a.qty_B > 0        ? calcFeeWithCapCollar(exFeeStruct_tok_B.tok[a.tokTypeId_B], a.qty_B,                 0)       : 0,
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
                //feesAll[0].fee_ccy_B = feesAll[0].fee_ccy_A; // symmetric mirror

                // asymmetric mirror
                exFeeStruct_ccy_B = ld._ledger[a.ledger_B].spot_customFees.ccyType_Set[a.ccyTypeId_B] ? ld._ledger[a.ledger_B].spot_customFees : globalFees;
                feesAll[0].fee_ccy_B = a.ledger_B != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_ccy_B.ccy[a.ccyTypeId_B], uint256(a.ccy_amount_A), a.qty_B) : 0;
            }
        }
        else if (feesAll[0].fee_ccy_B > 0 && feesAll[0].fee_ccy_A == 0) {
            if (exFeeStruct_ccy_B.ccy[a.ccyTypeId_B].ccy_mirrorFee == true) {
                a.ccyTypeId_A = a.ccyTypeId_B;
                //feesAll[0].fee_ccy_A = feesAll[0].fee_ccy_B; // symmetric mirror

                // asymmetric mirror
                exFeeStruct_ccy_A = ld._ledger[a.ledger_A].spot_customFees.ccyType_Set[a.ccyTypeId_A] ? ld._ledger[a.ledger_A].spot_customFees : globalFees;
                feesAll[0].fee_ccy_A = a.ledger_A != a.feeAddrOwner ? calcFeeWithCapCollar(exFeeStruct_ccy_A.ccy[a.ccyTypeId_A], uint256(a.ccy_amount_B), a.qty_A) : 0;
            }
        }
    }

    //
    // INTERNAL - calculate & send batch originator ccy fees (shares of exchange ccy fee)
    //
    function applyOriginatorCcyFees(
        StructLib.LedgerStruct storage    ld,
        TransferSplitPreviewReturn memory ts_preview,
        uint256                           tot_exFee_ccy,
        uint256                           tot_qty,
        address                           feeAddrOwner,
        uint256                           ccyTypeId
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

            // currency fee transfer: from exchange owner account to batch originator
            StructLib.transferCcy(ld, StructLib.TransferCcyArgs({ from: feeAddrOwner, to: batch.originator, ccyTypeId: ccyTypeId, amount: BFEE, transferType: StructLib.TransferType.OriginatorFee }));
        }
    }

    //
    // INTERNAL - transfer (split/merge) tokens
    //
    struct TransferSplitArgs {
        address                from;
        address                to;
        uint256                tokTypeId;
        uint256                qtyUnit;
        StructLib.TransferType transferType;
        uint256                maxStId;
        uint256[]              k_stIds_take; // IFF len>0: only use these specific tokens (skip any others)
      //uint256[]              k_stIds_skip; // IFF len>0: don't use these specific tokens (use any others) -- UNUSED, CAN REMOVE
    }
    struct TransferSpltVars {
        uint256 ndx;
        int64   remainingToTransfer;
        bool    mergedExisting;
        int64   stQty;
    }
    function transferSplitSecTokens(
        StructLib.LedgerStruct storage ld,
        TransferSplitArgs memory       a
    )
    private returns (uint256 updatedMaxStId) {

        uint256[] storage from_stIds = ld._ledger[a.from].tokenType_stIds[a.tokTypeId];
        uint256[] storage to_stIds = ld._ledger[a.to].tokenType_stIds[a.tokTypeId];

        // walk tokens - transfer sufficient STs (last one may get split)
        TransferSpltVars memory v;
        require(a.qtyUnit >= 0 && a.qtyUnit <= 0x7FFFFFFFFFFFFFFF, "Bad qtyUnit"); // max signed int64
        v.remainingToTransfer = int64(uint64(a.qtyUnit));

        uint256 maxStId = a.maxStId;
        while (v.remainingToTransfer > 0) {
            uint256 stId = from_stIds[v.ndx];
            v.stQty = ld._sts[stId].currentQty;
            // Certik: (Minor) TRA-02 | Potentially Negative Quantity The v.stQty value may be negative within the transferSplitSecTokens function
            // Resolved: (Minor) TRA-02 | Added a check to ensure only non-negative values of v.stQty
            require(v.stQty >= 0, "Unexpected stQty");

            // if specific avoid (skip) tokens are specified, then skip them;
            // and inverse - if specific use (take) tokens are specified, then skip over others
            bool skip = false;
            // if (a.k_stIds_skip.length > 0) {
            //     for (uint256 i = 0; i < a.k_stIds_skip.length; i++) {
            //         if (a.k_stIds_skip[i] == stId) { skip = true; break; }
            //     }
            // }
            if (a.k_stIds_take.length > 0) {
                skip = true;
                for (uint256 i = 0; i < a.k_stIds_take.length; i++) {
                    if (a.k_stIds_take[i] == stId) { skip = false; break; } // i.e. take wins over skip (if same STID is specified in both take and skip list)
                }
            }
            if (skip) {
                v.ndx++;
            }
            else {
                if (v.remainingToTransfer >= v.stQty) { // reassign the FULL ST across the ledger entries

                    // remove from origin ledger - replace hot index 0 with value at last (ndx++, in effect)
                    from_stIds[v.ndx] = from_stIds[from_stIds.length - 1];
                    from_stIds.pop(); // solc 0.6

                    // assign to destination
                    //  IFF minting >1 ST is disallowed AND
                    //  IFF validation of available qty's is already performed,
                    //  THEN the merge condition below *** wrt. batchId can *never* be true:
                        
                    // MERGE - if any existing destination ST is from same batch
                    v.mergedExisting = false;
                    for (uint i = 0; i < to_stIds.length; i++) {
                        if (ld._sts[to_stIds[i]].batchId == ld._sts[stId].batchId) {
                            // resize (grow) the destination global ST
                            ld._sts[to_stIds[i]].currentQty += v.stQty; // PACKED
                            ld._sts[to_stIds[i]].mintedQty += v.stQty; // PACKED

                            // v1.1b - FIX: resize (shrink) the source global ST
                            ld._sts[stId].currentQty -= v.stQty;
                            ld._sts[stId].mintedQty -= v.stQty;
                            
                            v.mergedExisting = true;
                            emit TransferedFullSecToken(a.from, a.to, stId, to_stIds[i], uint256(uint64(v.stQty)), a.transferType);
                            break;
                        }
                    }
                    // TRANSFER - if no existing destination ST from same batch
                    if (!v.mergedExisting) {
                        to_stIds.push(stId);
                        emit TransferedFullSecToken(a.from, a.to, stId, 0, uint256(uint64(v.stQty)), a.transferType);
                    }

                    v.remainingToTransfer -= v.stQty;
                    if (v.remainingToTransfer > 0) {
                        require(from_stIds.length > 0, "Insufficient tokens");
                    }
                }
                else { // move PART of an ST across the ledger entries

                    // SPLIT the ST across the ledger entries, soft-minting a new ST in the destination
                    // note: the parent (origin) ST's minted qty also gets split across the two STs;
                    //         this is so the total minted in the system is unchanged,
                    //           (and also so the total burned amount in the ST can still be calculated by mintedQty[x] - currentQty[x])

                    // assign new ST to destination

                        // MERGE - if any existing destination ST is from same batch
                        v.mergedExisting = false;
                        for (uint i = 0; i < to_stIds.length; i++) {
                            if (ld._sts[to_stIds[i]].batchId == ld._sts[stId].batchId) {

                                // resize (grow) the destination ST
                                ld._sts[to_stIds[i]].currentQty += v.remainingToTransfer; // PACKED
                                ld._sts[to_stIds[i]].mintedQty += v.remainingToTransfer; // PACKED

                                v.mergedExisting = true;
                                emit TransferedPartialSecToken(a.from, a.to, stId, 0, to_stIds[i], uint256(uint64(v.remainingToTransfer)), a.transferType);
                                break;
                            }
                        }
                        // SOFT-MINT - if no existing destination ST from same batch; inherit batch ID from parent ST
                        if (!v.mergedExisting) {
                            ld._sts[maxStId + 1].batchId = ld._sts[stId].batchId; // PACKED
                            ld._sts[maxStId + 1].currentQty = v.remainingToTransfer; // PACKED
                            ld._sts[maxStId + 1].mintedQty = v.remainingToTransfer; // PACKED

                            to_stIds.push(maxStId + 1); // gas: 94k
                            emit TransferedPartialSecToken(a.from, a.to, stId, maxStId + 1, 0, uint256(uint64(v.remainingToTransfer)), a.transferType); // gas: 11k
                            maxStId++;
                        }

                    // resize (shrink) the origin ST
                    ld._sts[stId].currentQty -= v.remainingToTransfer; // PACKED
                    ld._sts[stId].mintedQty -= v.remainingToTransfer; // PACKED

                    v.remainingToTransfer = 0;
                }
            } // !skip
        } // while
        return maxStId;
    }

    //
    // INTERNAL - token transfer preview
    //
    /**
     * @dev Previews token transfer across ledger owners
     * @param a TransferSplitArgs args
     * @return The distinct transfer-from batch IDs and the total quantity of tokens that would be transfered from each batch
     */
    struct TransferSplitPreviewReturn {
        uint64[MAX_BATCHES_PREVIEW]  batchIds; // todo: pack these - quadratic gas cost for fixed memory
        uint256[MAX_BATCHES_PREVIEW] transferQty;
        uint256                      batchCount;

        // calc fields for batch originator ccy fee - % of exchange currency fee
        uint256                      TC;        // total cut        - sum originator batch origCcyFee_percBips_ExFee for all batches
        uint256                      TC_capped; // total cut capped - capped (10000 bps) total cut
    }
    function transferSplitSecTokens_Preview(
        StructLib.LedgerStruct storage ld,
        TransferSplitArgs memory       a
    )
    private view returns(TransferSplitPreviewReturn memory ret)
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
        uint256[] memory from_stIds = ld._ledger[a.from].tokenType_stIds[a.tokTypeId]; // assignment of storage[] to memory[] is a copy
        require(from_stIds.length > 0, "No tokens");

        uint256 ndx = 0;
        uint256 from_stIds_length = from_stIds.length;
        require(a.qtyUnit >= 0 && a.qtyUnit <= 0x7FFFFFFFFFFFFFFF, "Bad qtyUnit"); // max signed int64
        int64 remainingToTransfer = int64(uint64(a.qtyUnit));
        while (remainingToTransfer > 0) {
            uint256 stId = from_stIds[ndx];
            int64 stQty = ld._sts[stId].currentQty;
            uint64 fromBatchId = ld._sts[stId].batchId;

            bool skip = false;
            // if (a.k_stIds_skip.length > 0) {
            //     for (uint256 i = 0; i < a.k_stIds_skip.length; i++) {
            //         if (a.k_stIds_skip[i] == stId) { skip = true; break; }
            //     }
            // }
            if (a.k_stIds_take.length > 0) {
                skip = true;
                for (uint256 i = 0; i < a.k_stIds_take.length; i++) {
                    if (a.k_stIds_take[i] == stId) { skip = false; break; }
                }
            }
            if (skip) {
                ndx++;
            }
            else {
                // add to list of distinct batches, maintain transfer quantity from each batch
                bool knownBatch = false;
                for (uint i = 0; i < ret.batchCount; i++) {
                    if (ret.batchIds[i] == fromBatchId) {
                        ret.transferQty[i] += uint256(remainingToTransfer >= stQty ? uint64(stQty) : uint64(remainingToTransfer));
                        knownBatch = true;
                        break;
                    }
                }
                if (!knownBatch) {
                    require(ret.batchCount < MAX_BATCHES_PREVIEW, "Too many batches: try sending a smaller amount");
                    ret.batchIds[ret.batchCount] = fromBatchId;
                    ret.transferQty[ret.batchCount] = uint256(remainingToTransfer >= stQty ? uint64(stQty) : uint64(remainingToTransfer));
                    ret.batchCount++;
                }
                if (remainingToTransfer >= stQty) { // full ST transfer, and more needed

                    from_stIds[ndx] = from_stIds[from_stIds_length - 1]; // replace in origin copy (ndx++, in effect)
                    //from_stIds.length--;  // memory array can't be resized
                    from_stIds_length--;    // so instead

                    remainingToTransfer -= stQty;
                    if (remainingToTransfer > 0) {
                        require(from_stIds_length > 0, "Insufficient tokens");
                    }
                }
                else { // partial ST transfer, and no more needed
                    remainingToTransfer = 0;
                }
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
     * @return totalFee Capped or collared fee
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

    //
    // INTERNAL - param validation: security token IDs
    //
    function checkStIds(StructLib.LedgerStruct storage ld, StructLib.TransferArgs memory a) private view {
        if (a.k_stIds_A.length > 0) {
            uint256 stQty;
            for (uint256 i = 0; i < a.k_stIds_A.length; i++) {
                require(StructLib.tokenExistsOnLedger(ld, a.tokTypeId_A, a.ledger_A, a.k_stIds_A[i]), "Bad stId A");
                stQty += uint256(uint64(ld._sts[a.k_stIds_A[i]].currentQty));
            }
            //require(stQty == a.qty_A, "qty_A / k_stIds_A mismatch");
        }
        if (a.k_stIds_B.length > 0) {
            uint256 stQty;
            for (uint256 i = 0; i < a.k_stIds_B.length; i++) {
                require(StructLib.tokenExistsOnLedger(ld, a.tokTypeId_B, a.ledger_B, a.k_stIds_B[i]), "Bad stId B");
                stQty += uint256(uint64(ld._sts[a.k_stIds_B[i]].currentQty));
            }
            //require(stQty == a.qty_B, "qty_B / k_stIds_B mismatch");
        }
    }
}