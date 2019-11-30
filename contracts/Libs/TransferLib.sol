pragma solidity 0.5.13;
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

    struct FeesCalc {
        uint256 fee_ccy_A;
        uint256 fee_ccy_B;
        uint256 fee_tok_A;
        uint256 fee_tok_B;
    }
    function transfer(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.FeeStruct storage globalFees,     // global fee structure
        TransferLib.TransferArgs memory a,          // args
        address feeAddrOwner)                       // exchange fees: receive address
    public {
        require(ledgerData._ledger[a.ledger_A].exists == true, "Invalid ledger owner A");
        require(ledgerData._ledger[a.ledger_B].exists == true, "Invalid ledger owner B");
        require(a.ledger_A != a.ledger_B, "Self transfer disallowed");
        require(a.qty_A > 0 || a.qty_B > 0 || a.ccy_amount_A > 0 || a.ccy_amount_B > 0, "Invalid transfer");
        require(!(a.ccy_amount_A < 0 || a.ccy_amount_B < 0), "Invalid currency amounts"); // disallow negative ccy transfers

        // disallow single origin multiple asset type movement
        require(!((a.qty_A > 0 && a.ccy_amount_A > 0) || (a.qty_B > 0 && a.ccy_amount_B > 0)), "Same origin multiple asset transfer disallowed");

        // exchange fees - calc total payable (fixed + basis points), cap & collar
        StructLib.FeeStruct storage exFeeStruct_ccy_A = ledgerData._ledger[a.ledger_A].customFees.ccyType_Set[a.ccyTypeId_A]   ? ledgerData._ledger[a.ledger_A].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_A = ledgerData._ledger[a.ledger_A].customFees.tokType_Set[a.tokenTypeId_A] ? ledgerData._ledger[a.ledger_A].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_ccy_B = ledgerData._ledger[a.ledger_B].customFees.ccyType_Set[a.ccyTypeId_B]   ? ledgerData._ledger[a.ledger_B].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_B = ledgerData._ledger[a.ledger_B].customFees.tokType_Set[a.tokenTypeId_B] ? ledgerData._ledger[a.ledger_B].customFees : globalFees;
        FeesCalc memory exFees = FeesCalc({
            fee_ccy_A: applyCapCollar(exFeeStruct_ccy_A.ccy, a.ccyTypeId_A, uint256(a.ccy_amount_A), calcFee(exFeeStruct_ccy_A.ccy, a.ccyTypeId_A, uint256(a.ccy_amount_A))),
            fee_ccy_B: applyCapCollar(exFeeStruct_ccy_B.ccy, a.ccyTypeId_B, uint256(a.ccy_amount_B), calcFee(exFeeStruct_ccy_B.ccy, a.ccyTypeId_B, uint256(a.ccy_amount_B))),
            fee_tok_A: applyCapCollar(exFeeStruct_tok_A.tok, a.tokenTypeId_A, a.qty_A,               calcFee(exFeeStruct_tok_A.tok, a.tokenTypeId_A, a.qty_A)),
            fee_tok_B: applyCapCollar(exFeeStruct_tok_B.tok, a.tokenTypeId_B, a.qty_B,               calcFee(exFeeStruct_tok_B.tok, a.tokenTypeId_B, a.qty_B))
        });

        //
        // calc originator fees
        // TODO: need to call transferSplitSecTokens() in preview mode, to return list of n transfer-from batchIds and transfer amounts from each batch
        //       we then have n sets of potential originator SetFeeArgs from the transfer-from batches...
        //       we then can make n StructLib.FeeStruct's derived from the transfer-from batch tokenType & the SetFeeArgs's
        //
        // StructLib.FeeStruct storage exFeeStruct_tok_A = ledgerData._batches[]
        // StructLib.FeeStruct storage exFeeStruct_tok_B = //...
        // FeesCalc memory exFees = FeesCalc({
        //     fee_ccy_A: 0, // originator fees are only in tokens
        //     fee_ccy_B: 0,
        //     fee_tok_A: applyCapCollar(exFeeStruct_tok_A.tok, a.tokenTypeId_A, a.qty_A,               calcFee(exFeeStruct_tok_A.tok, a.tokenTypeId_A, a.qty_A)),
        // });

        // sum them for validation...

        // validate currency balances
        require(StructLib.sufficientCcy(ledgerData, a.ledger_A, a.ccyTypeId_A, a.ccy_amount_A,
                    int256(exFees.fee_ccy_A) * (a.applyFees && a.ccy_amount_A > 0 ? 1 : 0)), "Insufficient currency held by ledger owner A");
        require(StructLib.sufficientCcy(ledgerData, a.ledger_B, a.ccyTypeId_B, a.ccy_amount_B,
                    int256(exFees.fee_ccy_B) * (a.applyFees && a.ccy_amount_B > 0 ? 1 : 0)), "Insufficient currency held by ledger owner B");

        // validate token balances
        require(StructLib.sufficientTokens(ledgerData, a.ledger_A, a.tokenTypeId_A, a.qty_A,
                    exFees.fee_tok_A * (a.applyFees && a.qty_A > 0 ? 1 : 0)), "Insufficient tokens held by ledger owner A");
        require(StructLib.sufficientTokens(ledgerData, a.ledger_B, a.tokenTypeId_B, a.qty_B,
                    exFees.fee_tok_B * (a.applyFees && a.qty_B > 0 ? 1 : 0)), "Insufficient tokens held by ledger owner B");

        // transfer currencies
        if (a.ccy_amount_A > 0) {
            if (a.applyFees) {
                if (exFees.fee_ccy_A > 0) { // exchange fees
                    transferCcy(ledgerData, TransferCcyArgs({ from: a.ledger_A, to: feeAddrOwner, ccyTypeId: a.ccyTypeId_A,
                        amount: exFees.fee_ccy_A,
                         isFee: true }));
                }
            }
            transferCcy(ledgerData, TransferCcyArgs({ from: a.ledger_A, to: a.ledger_B, ccyTypeId: a.ccyTypeId_A, amount: uint256(a.ccy_amount_A), isFee: false }));
        }
        if (a.ccy_amount_B > 0) {
            if (a.applyFees) {
                if (exFees.fee_ccy_B > 0) { // exchange fees
                    transferCcy(ledgerData, TransferCcyArgs({ from: a.ledger_B, to: feeAddrOwner, ccyTypeId: a.ccyTypeId_B,
                        amount: exFees.fee_ccy_B,
                         isFee: true }));
                }
            }
            transferCcy(ledgerData, TransferCcyArgs({ from: a.ledger_B, to: a.ledger_A, ccyTypeId: a.ccyTypeId_B, amount: uint256(a.ccy_amount_B), isFee: false }));
        }

        // transfer tokens
        if (a.qty_A > 0) {
            if (a.applyFees) {
                if (exFees.fee_tok_A > 0) { // exchange fees
                    transferSplitSecTokens(ledgerData, TransferSplitArgs({ from: a.ledger_A, to: feeAddrOwner, tokenTypeId: a.tokenTypeId_A,
                        qtyUnit: exFees.fee_tok_A,
                          isFee: true }));
                }
            }
            transferSplitSecTokens(ledgerData,
                TransferSplitArgs({ from: a.ledger_A, to: a.ledger_B, tokenTypeId: a.tokenTypeId_A, qtyUnit: a.qty_A, isFee: false }));
        }
        if (a.qty_B > 0) {
            if (a.applyFees) {
                if (exFees.fee_tok_B > 0) { // exchange fees
                    transferSplitSecTokens(ledgerData, TransferSplitArgs({ from: a.ledger_B, to: feeAddrOwner, tokenTypeId: a.tokenTypeId_B,
                        qtyUnit: exFees.fee_tok_B,
                          isFee: true }));
                }
            }
            transferSplitSecTokens(ledgerData,
                TransferSplitArgs({ from: a.ledger_B, to: a.ledger_A, tokenTypeId: a.tokenTypeId_B, qtyUnit: a.qty_B, isFee: false }));
        }
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
    private returns(uint256 totalFee) {
        return // fixed fee + basis point fee
            feeStructure[typeId].fee_fixed
            + ((transferAmount * 1000000/*precision*/ / 10000/*basis points*/) * feeStructure[typeId].fee_percBips) / 1000000/*precision*/;
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
    private returns(uint256 totalFee) {
        if (transferAmount > 0) {
            if (feeAmount > feeStructure[typeId].fee_max && feeStructure[typeId].fee_max > 0)
                return feeStructure[typeId].fee_max;
            if (feeAmount < feeStructure[typeId].fee_min && feeStructure[typeId].fee_min > 0)
                return feeStructure[typeId].fee_min;
        }
        return feeAmount;
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
                        uint256 newStId = ledgerData._tokens_currentMax_id + 1;
                        ledgerData._sts_batchId[newStId] = ledgerData._sts_batchId[stId];           // inherit batch from parent ST  // TODO gas - pack/combine
                        ledgerData._sts_currentQty[newStId] = remainingToTransfer;                  // TODO gas - pack/combine
                        ledgerData._sts_mintedQty[newStId] = remainingToTransfer;                   // TODO gas - pack/combine
                        //ledgerData._sts_mintedTimestamp[newStId] = block.timestamp;               // gas - DROP DONE - can fetch from events
                        //ledgerData._sts_splitFrom_id[newStId] = stId;                             // gas - DROP DONE - can fetch from events
                        to_stIds.push(newStId);
                        ledgerData._tokens_currentMax_id++;
                        //ledgerData._ledger[to].tokenType_sumQty[tokenTypeId] += remainingToTransfer;    // gas - DROP DONE - only used internally, validation params

                        emit TransferedPartialSecToken(a.from, a.to, stId, newStId, 0, /*a.tokenTypeId,*/ remainingToTransfer, a.isFee);
                    }

                // resize (shrink) the origin ST
                ledgerData._sts_currentQty[stId] -= remainingToTransfer;                            // TODO gas - pack/combine
                ledgerData._sts_mintedQty[stId] -= remainingToTransfer;                             // TODO gas - pack/combine
                //ledgerData._sts_splitTo_id[stId] = newStId;                                         // gas - DROP DONE - can index from events
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