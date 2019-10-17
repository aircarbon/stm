pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./AcLedger.sol";


contract EeuTransferable is Owned, AcLedger {
    event TransferedLedgerCcy(address from, address to, uint256 ccyTypeId, uint256 amount, bool isFee);
    event TransferedFullEeu(address from, address to, uint256 eeuId, uint256 mergedToEeuId, /*uint256 eeuTypeId,*/ uint256 qtyKG, bool isFee);
    event TransferedPartialEeu(address from, address to, uint256 splitFromEeuId, uint256 newEeuId, uint256 mergedToEeuId, /*uint256 eeuTypeId,*/ uint256 qtyKG, bool isFee);

    /**
     * Global Fee Structure
     * NOTE: fees are applied ON TOP OF the supplied transfer amounts to the transfer() fn.
     *       i.e. transfer amounts are not inclusive of fees, they are additional
     */
    mapping(uint256 => uint256) public fee_eeuType_Fixed; // fixed KG EEU fee per transfer TX
    event SetFeeEeuTypeFixed(uint256 eeuTypeId, uint256 new_fee_kgTx_Fixed);
    function setFee_EeuType_Fixed(uint256 eeuTypeId, uint256 new_fee_kgTx_Fixed) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(eeuTypeId >= 0 && eeuTypeId < _count_eeuTypes, "Invalid EEU type");
        fee_eeuType_Fixed[eeuTypeId] = new_fee_kgTx_Fixed;
        emit SetFeeEeuTypeFixed(eeuTypeId, new_fee_kgTx_Fixed);
    }
    mapping(uint256 => uint256) public fee_ccyType_Fixed; // fixed currency fee per transfer TX
    event SetFeeCcyTypeFixed(uint256 ccyTypeId, uint256 new_fee_ccyTx_Fixed);
    function setFee_CcyType_Fixed(uint256 ccyTypeId, uint256 new_fee_ccyTx_Fixed) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(ccyTypeId >= 0 && ccyTypeId < _count_ccyTypes, "Invalid currency type");
        fee_ccyType_Fixed[ccyTypeId] = new_fee_ccyTx_Fixed;
        emit SetFeeCcyTypeFixed(ccyTypeId, new_fee_ccyTx_Fixed);
    }
    //
    // TODO: % fees...
    //

    /**
     * @dev Returns the total global tonnage of carbon fees paid
     */
    function getKgCarbonFeesPaid() external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return _eeu_totalFeesPaidKG;
    }

    /**
     * @dev Returns the total global amount of fees paid for the supplied currency
     */
    function getTotalCcyFeesPaid(uint256 ccyTypeId) external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return _ccyType_totalFeesPaid[ccyTypeId];
    }

    /**
     * @dev Transfers or trades assets between ledger accounts
     * @dev allows: one-sided transfers, allows transfers of same asset types and transfers (trades) of different asset types
     * @dev disallows: movement from a single origin of more than one asset-type
     * @dev optionally applies: fees per the current fee structure, and paying them to contract owner's ledger entry
     * @param ledger_A Ledger owner A
     * @param ledger_B Ledger owner B
     * @param kg_A KG quantity of carbon to move from A to B
     * @param eeuTypeId_A EEU type to move from A to B
     * @param kg_B KG quanity of carbon to move from B to A
     * @param eeuTypeId_B EEU type to move from B to A
     * @param ccy_amount_A Amount of currency to move from A to B
     * @param ccyTypeId_A Currency type to move from A to B
     * @param ccy_amount_B Amount of currency to move from B to A
     * @param ccyTypeId_B Currency type to move from B to A
     * @param applyFees Whether or not to apply fees (both legs, on top of the supplied ccy/eeu transfer amounts), per the global fee structure
     */
    function transfer(
        address ledger_A,
        address ledger_B,

        uint256 kg_A,           // EEU KGs moving from A (excluding fees, if any)
        uint256 eeuTypeId_A,    // EEU type moving from A
        uint256 kg_B,           // " from B
        uint256 eeuTypeId_B,    // " from B

        int256  ccy_amount_A,   // currency amount moving from A (excluding fees, if any) -- (signed value: ledger ccyType_balance supports (theoretical) -ve balances)
        uint256 ccyTypeId_A,    // currency type moving from A
        int256  ccy_amount_B,   // " from B                                               -- (signed value: ledger ccyType_balance supports (theoretical) -ve balances)
        uint256 ccyTypeId_B,    // " from B

        bool    applyFees       // apply global fee structure to the transfer (both legs)
    ) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");

        require(_ledger[ledger_A].exists == true, "Invalid ledger owner A");
        require(_ledger[ledger_B].exists == true, "Invalid ledger owner B");
        require(ledger_A != ledger_B, "Self transfer disallowed");
        require(kg_A > 0 || kg_B > 0 || ccy_amount_A > 0 || ccy_amount_B > 0, "Invalid transfer");
        require(!(ccy_amount_A < 0 || ccy_amount_B < 0), "Invalid currency amounts"); // disallow negative ccy transfers

        // prevent single-origin muliple asset type movement
        require(!((kg_A > 0 && ccy_amount_A > 0) || (kg_B > 0 && ccy_amount_B > 0)), 'Single-origin multiple-asset disallowed');

        // calc total amounts with fees if any
        // ## "stack too deep"
        //uint256 kg_A_incFee = kg_A + (fee_eeuType_Fixed[eeuTypeId_A] * (applyFees ? 1 : 0));
        //uint256 kg_B_incFee = kg_B + (fee_eeuType_Fixed[eeuTypeId_B] * (applyFees ? 1 : 0));
        //int256  ccy_amount_A_incFee = ccy_amount_A + (int256(fee_ccyType_Fixed[ccyTypeId_A]) * (applyFees ? 1 : 0));
        //int256  ccy_amount_B_incFee = ccy_amount_B + (int256(fee_ccyType_Fixed[ccyTypeId_B]) * (applyFees ? 1 : 0));

        // validate currency balances
        require(sufficientCcy(ledger_A, ccyTypeId_A, ccy_amount_A,
                              (int256(fee_ccyType_Fixed[ccyTypeId_A]) * (applyFees && ccy_amount_A > 0 ? 1 : 0))), "Insufficient currency held by ledger owner A");
        require(sufficientCcy(ledger_B, ccyTypeId_B, ccy_amount_B,
                              (int256(fee_ccyType_Fixed[ccyTypeId_B]) * (applyFees && ccy_amount_B > 0 ? 1 : 0))), "Insufficient currency held by ledger owner B");

        // validate KG balances
        require(sufficientKg(ledger_A, eeuTypeId_A, kg_A,
                             (fee_eeuType_Fixed[eeuTypeId_A] * (applyFees && kg_A > 0 ? 1 : 0))), "Insufficient carbon held by ledger owner A");
        require(sufficientKg(ledger_B, eeuTypeId_B, kg_B,
                             (fee_eeuType_Fixed[eeuTypeId_B] * (applyFees && kg_B > 0 ? 1 : 0))), "Insufficient carbon held by ledger owner B");

        // transfer currencies
        if (ccy_amount_A > 0) {
            if (applyFees) {
                if (fee_ccyType_Fixed[ccyTypeId_A] > 0) { // fixed fee
                    transferCcy(TransferCcyArgs({ from: ledger_A, to: owner, ccyTypeId: ccyTypeId_A, amount: fee_ccyType_Fixed[ccyTypeId_A], isFee: true }));
                    _ccyType_totalFeesPaid[ccyTypeId_A] += fee_ccyType_Fixed[ccyTypeId_A];
                }
            }
            transferCcy(TransferCcyArgs({ from: ledger_A, to: ledger_B, ccyTypeId: ccyTypeId_A, amount: uint256(ccy_amount_A), isFee: false }));
        }
        if (ccy_amount_B > 0) {
            if (applyFees) {
                if (fee_ccyType_Fixed[ccyTypeId_B] > 0) { // fixed fee
                    transferCcy(TransferCcyArgs({ from: ledger_B, to: owner, ccyTypeId: ccyTypeId_B, amount: fee_ccyType_Fixed[ccyTypeId_B], isFee: true }));
                    _ccyType_totalFeesPaid[ccyTypeId_B] += fee_ccyType_Fixed[ccyTypeId_B];
                }
            }
            transferCcy(TransferCcyArgs({ from: ledger_B, to: ledger_A, ccyTypeId: ccyTypeId_B, amount: uint256(ccy_amount_B), isFee: false }));
        }

        // transfer EEUs
        if (kg_A > 0) {
            if (applyFees) {
                if (fee_eeuType_Fixed[eeuTypeId_A] > 0) { // fixed fee
                    transferSplitEeus(TransferSplitArgs({ from: ledger_A, to: owner, eeuTypeId: eeuTypeId_A, qtyKG: fee_eeuType_Fixed[eeuTypeId_A], isFee: true }));
                    _eeu_totalFeesPaidKG += fee_eeuType_Fixed[eeuTypeId_A];
                }
            }
            transferSplitEeus(TransferSplitArgs({ from: ledger_A, to: ledger_B, eeuTypeId: eeuTypeId_A, qtyKG: kg_A, isFee: false }));
        }
        if (kg_B > 0) {
            if (applyFees) {
                if (fee_eeuType_Fixed[eeuTypeId_B] > 0) { // fixed fee
                    transferSplitEeus(TransferSplitArgs({ from: ledger_B, to: owner, eeuTypeId: eeuTypeId_B, qtyKG: fee_eeuType_Fixed[eeuTypeId_B], isFee: true }));
                    _eeu_totalFeesPaidKG += fee_eeuType_Fixed[eeuTypeId_B];
                }
            }
            transferSplitEeus(TransferSplitArgs({ from: ledger_B, to: ledger_A, eeuTypeId: eeuTypeId_B, qtyKG: kg_B, isFee: false }));
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
    function transferCcy(TransferCcyArgs memory a) private {
        _ledger[a.from].ccyType_balance[a.ccyTypeId] -= int256(a.amount);
        _ledger[a.to].ccyType_balance[a.ccyTypeId] += int256(a.amount);
        _ccyType_totalTransfered[a.ccyTypeId] += a.amount;
        emit TransferedLedgerCcy(a.from, a.to, a.ccyTypeId, a.amount, a.isFee);
    }

    /**
     * @dev Transfers EEUs across ledger owners, splitting (soft-minting) the last EEU as necessary
     * @dev (the residual amount left in the origin last EEU after splitting is similar to a UTXO change output)
     * @param a args
     */
    struct TransferSplitArgs {
        address from;
        address to;
        uint256 eeuTypeId;
        uint256 qtyKG;
        bool isFee;
    }
    function transferSplitEeus(TransferSplitArgs memory a) private {

        // transfer sufficient EEUs (last one may gets split)
        uint256 ndx = 0;
        uint256 remainingToTransfer = uint256(a.qtyKG);
        while (remainingToTransfer > 0) {
            uint256[] storage from_eeuIds = _ledger[a.from].eeuType_eeuIds[a.eeuTypeId];
            uint256[] storage to_eeuIds = _ledger[a.to].eeuType_eeuIds[a.eeuTypeId];
            uint256 eeuId = from_eeuIds[ndx];
            uint256 eeuKg = _eeus_KG[eeuId];

            if (remainingToTransfer >= eeuKg) {
                // reassign the full EEU across the ledger entries

                // remove from origin
                from_eeuIds[ndx] = from_eeuIds[from_eeuIds.length - 1];
                from_eeuIds.length--;
                //_ledger[from].eeuType_sumKG[a.eeuTypeId] -= eeuKg;                 //* gas - DROP DONE - only used internally, validation params

                // assign to destination
                // while minting >1 EEU is disallowed, the merge condition below can never be true:

                    // MERGE - if any existing destination EEU is from same batch
                    // bool mergedExisting = false;
                    // for (uint i = 0; i < to_eeuIds.length; i++) {
                    //     if (_eeus_batchId[to_eeuIds[i]] == batchId) {

                    //         // resize (grow) the destination EEU
                    //         _eeus_KG[to_eeuIds[i]] += eeuKg;                       // TODO gas - pack/combine
                    //         _eeus_mintedKG[to_eeuIds[i]] += eeuKg;                 // TODO gas - pack/combine

                    //         // retire the old EEU from the main list
                    //         _eeus_KG[eeuId] = 0;
                    //         _eeus_mintedKG[eeuId] = 0;

                    //         mergedExisting = true;
                    //         emit TransferedFullEeu(a.from, a.to, eeuId, to_eeuIds[i], eeuKg/*, a.eeuTypeId*/, isFee);
                    //         break;
                    //     }
                    // }
                    // TRANSFER - if no existing destination EEU from same batch
                    //if (!mergedExisting) {
                        to_eeuIds.push(eeuId);
                        emit TransferedFullEeu(a.from, a.to, eeuId, 0, /*a.eeuTypeId,*/ eeuKg, a.isFee);
                    //}

                //_ledger[to].eeuType_sumKG[eeuTypeId] += eeuKg;                   //* gas - DROP DONE - only used internally, validation params

                remainingToTransfer -= eeuKg;
            }
            else {
                // split the last EEU across the ledger entries, soft-minting a new EEU in the destination
                // note: the parent (origin) EEU's minted qty also gets split across the two EEUS;
                //         this is so the total minted in the system is unchanged,
                //         and also so the total burned amount in the EEU can still be calculated by _eeus_mintedKG[x] - _eeus_KG[x]
                // note: both parent and child EEU point to each other like a double-linked list

                // assign new EEU to destination

                    // MERGE - if any existing destination EEU is from same batch
                    bool mergedExisting = false;
                    for (uint i = 0; i < to_eeuIds.length; i++) {
                        if (_eeus_batchId[to_eeuIds[i]] == _eeus_batchId[eeuId]) {
                            // resize (grow) the destination EEU
                            _eeus_KG[to_eeuIds[i]] += remainingToTransfer;                // TODO gas - pack/combine
                            _eeus_mintedKG[to_eeuIds[i]] += remainingToTransfer;          // TODO gas - pack/combine

                            mergedExisting = true;
                            emit TransferedPartialEeu(a.from, a.to, eeuId, 0, to_eeuIds[i], /*a.eeuTypeId,*/ remainingToTransfer, a.isFee);
                            break;
                        }
                    }
                    // SOFT-MINT - if no existing destination EEU from same batch
                    if (!mergedExisting) {
                        uint256 newId = _eeuCurMaxId + 1;
                        _eeus_batchId[newId] = _eeus_batchId[eeuId];                      // inherit batch from parent EEU  // TODO gas - pack/combine
                        _eeus_KG[newId] = remainingToTransfer;                            // TODO gas - pack/combine
                        _eeus_mintedKG[newId] = remainingToTransfer;                      // TODO gas - pack/combine
                        //_eeus_mintedTimestamp[newId] = block.timestamp;                 // gas - DROP DONE - can fetch from events
                        //_eeus_splitFromEeuId[newId] = eeuId;                            // gas - DROP DONE - can fetch from events
                        to_eeuIds.push(newId);
                        _eeuCurMaxId++;
                        //_ledger[to].eeuType_sumKG[eeuTypeId] += remainingToTransfer;    // gas - DROP DONE - only used internally, validation params

                        emit TransferedPartialEeu(a.from, a.to, eeuId, newId, 0, /*a.eeuTypeId,*/ remainingToTransfer, a.isFee);
                    }

                // resize (shrink) the origin EEU
                _eeus_KG[eeuId] -= remainingToTransfer;                           // TODO gas - pack/combine
                _eeus_mintedKG[eeuId] -= remainingToTransfer;                     // TODO gas - pack/combine
                //_eeus_splitToEeuId[eeuId] = newId;                              // gas - DROP DONE - can index from events
                //_ledger[from].eeuType_sumKG[eeuTypeId] -= remainingToTransfer;  // gas - DROP DONE - only used internally, validation params

                remainingToTransfer = 0;
            }
        }
        _eeu_totalTransferedKG += a.qtyKG;
    }

    /**
     * @dev Returns the total global currency amount transfered for the supplied currency
     */
    function getTotalCcyTransfered(uint256 ccyTypeId) external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return _ccyType_totalTransfered[ccyTypeId];
    }

    /**
     * @dev Returns the total global tonnage of carbon transfered
     */
    function getTotalKgTransfered() external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return _eeu_totalTransferedKG;
    }
}
