pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";

library TransferLib {
    event TransferedLedgerCcy(address from, address to, uint256 ccyTypeId, uint256 amount, bool isFee);
    event TransferedFullSecToken(address from, address to, uint256 stId, uint256 mergedToSecTokenId, /*uint256 tokenTypeId,*/ uint256 qty, bool isFee);
    event TransferedPartialSecToken(address from, address to, uint256 splitFromSecTokenId, uint256 newSecTokenId, uint256 mergedToSecTokenId, /*uint256 tokenTypeId,*/ uint256 qty, bool isFee);

    struct TransferArgs {
        address ledger_A;
        address ledger_B;

        uint256 qty_A;           // ST quantity moving from A (excluding fees, if any)
        uint256 tokenTypeId_A;   // ST type moving from A
        uint256 qty_B;           // " from B
        uint256 tokenTypeId_B;   // " from B

        int256  ccy_amount_A;    // currency amount moving from A (excluding fees, if any) -- (signed value: ledger ccyType_balance supports (theoretical) -ve balances)
        uint256 ccyTypeId_A;     // currency type moving from A
        int256  ccy_amount_B;    // " from B                                               -- (signed value: ledger ccyType_balance supports (theoretical) -ve balances)
        uint256 ccyTypeId_B;     // " from B

        bool    applyFees;       // apply global fee structure to the transfer (both legs)
    }

    struct FeeSummary {
        uint256 fee_ccy_fix_A;
        uint256 fee_ccy_bps_A;
        uint256 fee_ccy_fix_B;
        uint256 fee_ccy_bps_B;
        uint256 fee_tok_fix_A;
        uint256 fee_tok_bps_A;
        uint256 fee_tok_fix_B;
        uint256 fee_tok_bps_B;
    }
    function transfer(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.FeeStruct storage globalFees,
        TransferLib.TransferArgs memory a,
        address feeAddrOwner)   // exchange fees receive address
    public {
        require(ledgerData._ledger[a.ledger_A].exists == true, "Invalid ledger owner A");
        require(ledgerData._ledger[a.ledger_B].exists == true, "Invalid ledger owner B");
        require(a.ledger_A != a.ledger_B, "Self transfer disallowed");
        require(a.qty_A > 0 || a.qty_B > 0 || a.ccy_amount_A > 0 || a.ccy_amount_B > 0, "Invalid transfer");
        require(!(a.ccy_amount_A < 0 || a.ccy_amount_B < 0), "Invalid currency amounts"); // disallow negative ccy transfers

        // prevent single origin multiple asset type movement
        require(!((a.qty_A > 0 && a.ccy_amount_A > 0) || (a.qty_B > 0 && a.ccy_amount_B > 0)), "Same origin multiple asset transfer disallowed");

        // CAP/COLLAR: ...

        FeeSummary memory feeSummary = FeeSummary({ // struct consumes fewer stack slots
            fee_ccy_fix_A: (globalFees.fee_ccyType_Fix[a.ccyTypeId_A]),
            fee_ccy_bps_A: (((uint256(a.ccy_amount_A)*1000000 / 10000) * globalFees.fee_ccyType_Bps[a.ccyTypeId_A]) / 1000000),
            fee_ccy_fix_B: (globalFees.fee_ccyType_Fix[a.ccyTypeId_B]),
            fee_ccy_bps_B: (((uint256(a.ccy_amount_B)*1000000 / 10000) * globalFees.fee_ccyType_Bps[a.ccyTypeId_B]) / 1000000),
            fee_tok_fix_A: globalFees.fee_tokType_Fix[a.tokenTypeId_A],
            fee_tok_bps_A: ((uint256(a.qty_A)*1000000 / 10000) * globalFees.fee_tokType_Bps[a.tokenTypeId_A]) / 1000000,
            fee_tok_fix_B: globalFees.fee_tokType_Fix[a.tokenTypeId_B],
            fee_tok_bps_B: ((uint256(a.qty_B)*1000000 / 10000) * globalFees.fee_tokType_Bps[a.tokenTypeId_B]) / 1000000
        });

        // validate currency balances
        require(StructLib.sufficientCcy(ledgerData, a.ledger_A, a.ccyTypeId_A, a.ccy_amount_A,
                (
                    int256(feeSummary.fee_ccy_fix_A + feeSummary.fee_ccy_bps_A)
                )
                * (a.applyFees && a.ccy_amount_A > 0 ? 1 : 0)), "Insufficient currency held by ledger owner A");
        require(StructLib.sufficientCcy(ledgerData, a.ledger_B, a.ccyTypeId_B, a.ccy_amount_B,
                (
                    int256(feeSummary.fee_ccy_fix_B + feeSummary.fee_ccy_bps_B)
                )
                * (a.applyFees && a.ccy_amount_B > 0 ? 1 : 0)), "Insufficient currency held by ledger owner B");

        // validate token balances
        require(StructLib.sufficientTokens(ledgerData, a.ledger_A, a.tokenTypeId_A, a.qty_A,
                (
                    feeSummary.fee_tok_fix_A + feeSummary.fee_tok_bps_A
                )
                * (a.applyFees && a.qty_A > 0 ? 1 : 0)), "Insufficient tokens held by ledger owner A");
        require(StructLib.sufficientTokens(ledgerData, a.ledger_B, a.tokenTypeId_B, a.qty_B,
                (
                    feeSummary.fee_tok_fix_B + feeSummary.fee_tok_bps_B
                )
                * (a.applyFees && a.qty_B > 0 ? 1 : 0)), "Insufficient tokens held by ledger owner B");

        // transfer currencies
        if (a.ccy_amount_A > 0) {
            if (a.applyFees) {
                if (feeSummary.fee_ccy_fix_A + feeSummary.fee_ccy_bps_A > 0) {
                    transferCcy(ledgerData, TransferCcyArgs({ from: a.ledger_A, to: feeAddrOwner, ccyTypeId: a.ccyTypeId_A,
                        amount: feeSummary.fee_ccy_fix_A + feeSummary.fee_ccy_bps_A,
                         isFee: true }));
                }
            }
            transferCcy(ledgerData, TransferCcyArgs({ from: a.ledger_A, to: a.ledger_B, ccyTypeId: a.ccyTypeId_A, amount: uint256(a.ccy_amount_A), isFee: false }));
        }
        if (a.ccy_amount_B > 0) {
            if (a.applyFees) {
                if (feeSummary.fee_ccy_fix_B + feeSummary.fee_ccy_bps_B > 0) {
                    transferCcy(ledgerData, TransferCcyArgs({ from: a.ledger_B, to: feeAddrOwner, ccyTypeId: a.ccyTypeId_B,
                        amount: feeSummary.fee_ccy_fix_B + feeSummary.fee_ccy_bps_B,
                         isFee: true }));
                }
            }
            transferCcy(ledgerData, TransferCcyArgs({ from: a.ledger_B, to: a.ledger_A, ccyTypeId: a.ccyTypeId_B, amount: uint256(a.ccy_amount_B), isFee: false }));
        }

        // transfer tokens
        if (a.qty_A > 0) {
            if (a.applyFees) {
                if (feeSummary.fee_tok_fix_A + feeSummary.fee_tok_bps_A > 0) {
                    transferSplitSecTokens(ledgerData, TransferSplitArgs({ from: a.ledger_A, to: feeAddrOwner, tokenTypeId: a.tokenTypeId_A,
                        qtyUnit: feeSummary.fee_tok_fix_A + feeSummary.fee_tok_bps_A,
                          isFee: true }));
                }
            }
            transferSplitSecTokens(ledgerData,
                TransferSplitArgs({ from: a.ledger_A, to: a.ledger_B, tokenTypeId: a.tokenTypeId_A, qtyUnit: a.qty_A, isFee: false }));
        }
        if (a.qty_B > 0) {
            if (a.applyFees) {
                if (feeSummary.fee_tok_fix_B + feeSummary.fee_tok_bps_B > 0) {
                    transferSplitSecTokens(ledgerData, TransferSplitArgs({ from: a.ledger_B, to: feeAddrOwner, tokenTypeId: a.tokenTypeId_B,
                        qtyUnit: feeSummary.fee_tok_fix_B + feeSummary.fee_tok_bps_B,
                          isFee: true }));
                }
            }
            transferSplitSecTokens(ledgerData,
                TransferSplitArgs({ from: a.ledger_B, to: a.ledger_A, tokenTypeId: a.tokenTypeId_B, qtyUnit: a.qty_B, isFee: false }));
        }
    }

    /**
     * @dev Transfers currency across ledger owners
     * @param a args
     */
    struct TransferCcyArgs {
        address from;
        address to;
        uint256 ccyTypeId;
        uint256 amount;
        bool isFee;
    }
    function transferCcy(
        StructLib.LedgerStruct storage ledgerData,
        TransferCcyArgs memory a)
    private {
        ledgerData._ledger[a.from].ccyType_balance[a.ccyTypeId] -= int256(a.amount);
        ledgerData._ledger[a.to].ccyType_balance[a.ccyTypeId] += int256(a.amount);
        ledgerData._ccyType_totalTransfered[a.ccyTypeId] += a.amount;
        emit TransferedLedgerCcy(a.from, a.to, a.ccyTypeId, a.amount, a.isFee);

        if (a.isFee) {
            ledgerData._ccyType_totalFeesPaid[a.ccyTypeId] += a.amount;
        }
    }

    /**
     * @dev Transfers STs across ledger owners, splitting (soft-minting) the last ST as necessary
     * @dev (the residual amount left in the origin's last ST after splitting is similar to a UTXO change output)
     * @param a args
     */
    struct TransferSplitArgs {
        address from;
        address to;
        uint256 tokenTypeId;
        uint256 qtyUnit;
        bool isFee;
    }
    function transferSplitSecTokens(
        StructLib.LedgerStruct storage ledgerData,
        TransferSplitArgs memory a)
    private {

        // transfer sufficient STs (last one may get split)
        uint256 ndx = 0;
        uint256 remainingToTransfer = uint256(a.qtyUnit);
        while (remainingToTransfer > 0) {
            uint256[] storage from_stIds = ledgerData._ledger[a.from].tokenType_stIds[a.tokenTypeId];
            uint256[] storage to_stIds = ledgerData._ledger[a.to].tokenType_stIds[a.tokenTypeId];
            uint256 stId = from_stIds[ndx];
            uint256 stQty = ledgerData._sts_currentQty[stId];

            if (remainingToTransfer >= stQty) {
                // reassign the full ST across the ledger entries

                // remove from origin
                from_stIds[ndx] = from_stIds[from_stIds.length - 1];
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
                    //         emit TransferedFullSecToken(a.from, a.to, stId, to_stIds[i], stQty/*, a.tokenTypeId*/, isFee);
                    //         break;
                    //     }
                    // }
                    // TRANSFER - if no existing destination ST from same batch
                    //if (!mergedExisting) {
                        to_stIds.push(stId);
                        emit TransferedFullSecToken(a.from, a.to, stId, 0, /*a.tokenTypeId,*/ stQty, a.isFee);
                    //}

                //ledgerData._ledger[to].tokenType_sumQty[tokenTypeId] += stQty;                //* gas - DROP DONE - only used internally, validation params

                remainingToTransfer -= stQty;
            }
            else {
                // split the last ST across the ledger entries, soft-minting a new ST in the destination
                // note: the parent (origin) ST's minted qty also gets split across the two ST;
                //         this is so the total minted in the system is unchanged,
                //         and also so the total burned amount in the ST can still be calculated by _sts_mintedQty[x] - _sts_currentQty[x]
                // note: both parent and child ST point to each other (double-linked list)

                // assign new ST to destination

                    // MERGE - if any existing destination ST is from same batch
                    bool mergedExisting = false;
                    for (uint i = 0; i < to_stIds.length; i++) {
                        if (ledgerData._sts_batchId[to_stIds[i]] == ledgerData._sts_batchId[stId]) {
                            // resize (grow) the destination ST
                            ledgerData._sts_currentQty[to_stIds[i]] += remainingToTransfer;         // TODO gas - pack/combine
                            ledgerData._sts_mintedQty[to_stIds[i]] += remainingToTransfer;          // TODO gas - pack/combine

                            mergedExisting = true;
                            emit TransferedPartialSecToken(a.from, a.to, stId, 0, to_stIds[i], /*a.tokenTypeId,*/ remainingToTransfer, a.isFee);
                            break;
                        }
                    }
                    // SOFT-MINT - if no existing destination ST from same batch
                    if (!mergedExisting) {
                        uint256 newId = ledgerData._tokens_currentMax_id + 1;
                        ledgerData._sts_batchId[newId] = ledgerData._sts_batchId[stId];             // inherit batch from parent ST  // TODO gas - pack/combine
                        ledgerData._sts_currentQty[newId] = remainingToTransfer;                    // TODO gas - pack/combine
                        ledgerData._sts_mintedQty[newId] = remainingToTransfer;                     // TODO gas - pack/combine
                        //ledgerData._sts_mintedTimestamp[newId] = block.timestamp;                 // gas - DROP DONE - can fetch from events
                        //ledgerData._sts_splitFrom_id[newId] = stId;                               // gas - DROP DONE - can fetch from events
                        to_stIds.push(newId);
                        ledgerData._tokens_currentMax_id++;
                        //ledgerData._ledger[to].tokenType_sumQty[tokenTypeId] += remainingToTransfer;    // gas - DROP DONE - only used internally, validation params

                        emit TransferedPartialSecToken(a.from, a.to, stId, newId, 0, /*a.tokenTypeId,*/ remainingToTransfer, a.isFee);
                    }

                // resize (shrink) the origin ST
                ledgerData._sts_currentQty[stId] -= remainingToTransfer;                            // TODO gas - pack/combine
                ledgerData._sts_mintedQty[stId] -= remainingToTransfer;                             // TODO gas - pack/combine
                //ledgerData._sts_splitTo_id[stId] = newId;                                         // gas - DROP DONE - can index from events
                //ledgerData._ledger[from].tokenType_sumQty[tokenTypeId] -= remainingToTransfer;    // gas - DROP DONE - only used internally, validation params

                remainingToTransfer = 0;
            }
        }
        ledgerData._tokens_totalTransferedQty += a.qtyUnit;

        if (a.isFee) {
            ledgerData._tokens_totalFeesPaidQty += a.qtyUnit;
        }
    }
}