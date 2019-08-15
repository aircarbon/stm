pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./AcLedger.sol";

contract EeuTransferable is Owned, AcLedger {
    event TransferedLedgerCcy(address from, address to, uint256 ccyTypeId, int256 amount);
    event TransferedFullEeu(address from, address to, uint256 eeuId, uint256 mergedToEeuId, uint256 eeuTypeId);
    event TransferedPartialEeu(address from, address to, uint256 splitFromEeuId, uint256 newEeuId, uint256 mergedToEeuId, uint256 eeuTypeId);

    /**
     * @dev Transfers or trades assets between ledger accounts
     * @dev allows: one-sided transfers, allows transfers of same asset types and transfers (trades) of different asset types
     * @dev disallows: movement from a single origin of more than one asset-type
     * @param ledger_A Ledger owner A
     * @param ledger_B Ledger owner B
     * @param kg_A The KG quantity of carbon to move from A to B
     * @param eeuTypeId_A The EEU type to move from A to B
     * @param kg_B The KG quanity of carbon to move from B to A
     * @param eeuTypeId_B The EEU type to move from A to B
     * @param ccy_amount_A The amount of currency to move from A to B
     * @param ccyTypeId_A The currency type to move from A to B
     * @param ccy_amount_B The amount of currency to move from B to A
     * @param ccyTypeId_B The currency type to move from B to A
     *
     * configurable fees
     * TODO: both sides - fixed value or % value FEE - with system/exchange account passed in as receiver
     *       take fees (both sides possibly) before applying main transfer
     *       throw if insufficient to cover fees
     */
    function transfer(
        address ledger_A,
        address ledger_B,
        // EEU data
        uint256 kg_A,           // EEU KGs moving from A
        uint256 eeuTypeId_A,    // EEU type moving from A
        uint256 kg_B,           // " from B
        uint256 eeuTypeId_B,    // " from B
        // ccy data
        int256  ccy_amount_A,   // currency amount moving from A
        uint256 ccyTypeId_A,    // currency type moving from A
        int256  ccy_amount_B,   // " from B
        uint256 ccyTypeId_B     // " from B
    ) public {
        require(msg.sender == owner, "Restricted method");

        require(_ledger[ledger_A].exists == true, "Invalid ledger owner A");
        require(_ledger[ledger_B].exists == true, "Invalid ledger owner B");
        require(kg_A > 0 || kg_B > 0 || ccy_amount_A > 0 || ccy_amount_B > 0, "Invalid transfer");
        require(!(ccy_amount_A < 0 || ccy_amount_B < 0), "Invalid currency amounts");

        // prevent single-origin muliple asset type movement
        require(!((kg_A > 0 && ccy_amount_A > 0) || (kg_B > 0 && ccy_amount_B > 0)), 'Single-origin multiple asset disallowed');

        // validate KG balances
        uint256 kgAvailable_typeA = 0;
        for (uint i = 0; i < _ledger[ledger_A].eeuType_eeuIds[eeuTypeId_A].length; i++) {
            kgAvailable_typeA += _eeus_KG[_ledger[ledger_A].eeuType_eeuIds[eeuTypeId_A][i]];
        }
        require(kgAvailable_typeA >= kg_A, "Insufficient carbon held by ledger owner A");
        //require(_ledger[ledger_A].eeuType_sumKG[eeuTypeId_A] >= kg_A, "Insufficient carbon held by ledger owner A");

        // validate KG balances
        uint256 kgAvailable_typeB = 0;
        for (uint i = 0; i < _ledger[ledger_B].eeuType_eeuIds[eeuTypeId_B].length; i++) {
            kgAvailable_typeB += _eeus_KG[_ledger[ledger_B].eeuType_eeuIds[eeuTypeId_B][i]];
        }
        require(kgAvailable_typeB >= kg_B, "Insufficient carbon held by ledger owner B");
        //require(_ledger[ledger_B].eeuType_sumKG[eeuTypeId_B] >= kg_B, "Insufficient carbon held by ledger owner B");

        // validate currency balances
        require(_ledger[ledger_A].ccyType_balance[ccyTypeId_A] >= ccy_amount_A, "Insufficient currency held by ledger owner A");
        require(_ledger[ledger_B].ccyType_balance[ccyTypeId_B] >= ccy_amount_B, "Insufficient currency held by ledger owner B");

        // transfer currencies
        if (ccy_amount_A > 0) {
            _ledger[ledger_A].ccyType_balance[ccyTypeId_A] -= ccy_amount_A;
            _ledger[ledger_B].ccyType_balance[ccyTypeId_A] += ccy_amount_A;

            _ccyType_totalTransfered[ccyTypeId_A] += uint256(ccy_amount_A);
            emit TransferedLedgerCcy(ledger_A, ledger_B, ccyTypeId_A, ccy_amount_A);
        }
        if (ccy_amount_B > 0) {
            _ledger[ledger_B].ccyType_balance[ccyTypeId_B] -= ccy_amount_B;
            _ledger[ledger_A].ccyType_balance[ccyTypeId_B] += ccy_amount_B;

            _ccyType_totalTransfered[ccyTypeId_B] += uint256(ccy_amount_B);
            emit TransferedLedgerCcy(ledger_B, ledger_A, ccyTypeId_B, ccy_amount_B);
        }

        // transfer EEUs
        if (kg_A > 0) {
            transferSplitEeus(ledger_A, ledger_B, kg_A, eeuTypeId_A);
        }
        if (kg_B > 0) {
            transferSplitEeus(ledger_B, ledger_A, kg_B, eeuTypeId_B);
        }

        // TODO...
        //
        // merge (optimization): for both sender and receiver - after split:
        // simply combine same-type ** AND SAME BATCH ** EEUs into a single larger EEU
        // so, only ever should be a single EEU per owner per type per batch in the ledger
        //   (implies the "retirement" of old merged EEU IDs)
        //
        // then, disable minting > 1 eeu count
    }

    /**
     * @dev Transfers EEUs across ledger owners, splitting (soft-minting) the last EEU as necessary
     * @dev (the residual amount left in the origin last EEU after splitting is similar to a UTXO change output)
     * @param from Transfer from
     * @param to Transfer to
     * @param qtyKG The KG quantity of carbon to transfer
     * @param eeuTypeId The EEU type to transfer
     */
    function transferSplitEeus(address from, address to, uint256 qtyKG, uint256 eeuTypeId) private {
        // transfer sufficient EEUs (last one may gets split)
        uint256 ndx = 0;
        uint256 remainingToTransfer = uint256(qtyKG);
        while (remainingToTransfer > 0) {
            uint256[] storage from_eeuIds = _ledger[from].eeuType_eeuIds[eeuTypeId];
            uint256[] storage to_eeuIds = _ledger[to].eeuType_eeuIds[eeuTypeId];
            uint256 eeuId = from_eeuIds[ndx];
            uint256 eeuKg = _eeus_KG[eeuId];
            uint256 batchId = _eeus_batchId[eeuId];

            if (remainingToTransfer >= eeuKg) {
                // reassign the full EEU across the ledger entries

                // remove from origin
                from_eeuIds[ndx] = from_eeuIds[from_eeuIds.length - 1];
                from_eeuIds.length--;
                //_ledger[from].eeuType_sumKG[eeuTypeId] -= eeuKg;                 //* gas - DROP DONE - only used internally, validation params

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
                    //         emit TransferedFullEeu(from, to, eeuId, to_eeuIds[i], eeuTypeId);
                    //         break;
                    //     }
                    // }
                    // TRANSFER - if no existing destination EEU from same batch
                    //if (!mergedExisting) {
                        to_eeuIds.push(eeuId);
                        emit TransferedFullEeu(from, to, eeuId, 0, eeuTypeId);
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
                        if (_eeus_batchId[to_eeuIds[i]] == batchId) {
                            // resize (grow) the destination EEU
                            _eeus_KG[to_eeuIds[i]] += remainingToTransfer;                // TODO gas - pack/combine
                            _eeus_mintedKG[to_eeuIds[i]] += remainingToTransfer;          // TODO gas - pack/combine

                            mergedExisting = true;
                            emit TransferedPartialEeu(from, to, eeuId, 0, to_eeuIds[i], eeuTypeId);
                            break;
                        }
                    }
                    // SOFT-MINT - if no existing destination EEU from same batch
                    if (!mergedExisting) {
                        uint256 newId = _eeuCurMaxId + 1;
                        _eeus_batchId[newId] = batchId; // inherit batch from parent EEU  // TODO gas - pack/combine
                        _eeus_KG[newId] = remainingToTransfer;                            // TODO gas - pack/combine
                        _eeus_mintedKG[newId] = remainingToTransfer;                      // TODO gas - pack/combine
                        //_eeus_mintedTimestamp[newId] = block.timestamp;                 // gas - DROP DONE - can fetch from events
                        //_eeus_splitFromEeuId[newId] = eeuId;                            // gas - DROP DONE - can fetch from events
                        to_eeuIds.push(newId);
                        _eeuCurMaxId++;
                        //_ledger[to].eeuType_sumKG[eeuTypeId] += remainingToTransfer;    // gas - DROP DONE - only used internally, validation params

                        emit TransferedPartialEeu(from, to, eeuId, newId, 0, eeuTypeId);
                    }

                // resize (shrink) the origin EEU
                _eeus_KG[eeuId] -= remainingToTransfer;                           // TODO gas - pack/combine
                _eeus_mintedKG[eeuId] -= remainingToTransfer;                     // TODO gas - pack/combine
                //_eeus_splitToEeuId[eeuId] = newId;                              // gas - DROP DONE - can index from events
                //_ledger[from].eeuType_sumKG[eeuTypeId] -= remainingToTransfer;  // gas - DROP DONE - only used internally, validation params

                remainingToTransfer = 0;
            }
        }
        _eeu_totalTransferedKG += qtyKG;
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
