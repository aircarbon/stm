pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./AcLedger.sol";

contract EeuTradable is Owned, AcLedger {
    // events...

    /**
     * @dev Transfers or trades assets between ledger accounts
     * @dev (allows one-sided transfers, and allows transfers of same asset types)
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
     */
    function transfer(
        address ledger_A,
        address ledger_B,
        uint256 kg_A,
        uint256 eeuTypeId_A,
        uint256 kg_B,
        uint256 eeuTypeId_B,
        int256 ccy_amount_A,
        uint256 ccyTypeId_A,
        int256 ccy_amount_B,
        uint256 ccyTypeId_B)
    public {
        require(msg.sender == owner, "Restricted method");

        require(_ledger[ledger_A].exists == true, "Invalid ledger owner A");
        require(_ledger[ledger_B].exists == true, "Invalid ledger owner B");
        require(kg_A >= 0 || kg_B >= 0 || ccy_amount_A >= 0 || ccy_amount_B >= 0, "Invalid transfer");
        require(!(ccy_amount_A < 0 || ccy_amount_B < 0), "Invalid currency amounts");
        require(_ledger[ledger_A].eeuType_sumKG[eeuTypeId_A] >= kg_A, "Insufficient carbon held by ledger owner A");
        require(_ledger[ledger_B].eeuType_sumKG[eeuTypeId_B] >= kg_B, "Insufficient carbon held by ledger owner B");
        require(_ledger[ledger_A].ccyType_balance[ccyTypeId_A] >= ccy_amount_A, "Insufficient currency held by ledger owner A");
        require(_ledger[ledger_B].ccyType_balance[ccyTypeId_B] >= ccy_amount_B, "Insufficient currency held by ledger owner B");

        // transfer currencies
        if (ccy_amount_A > 0) {
            _ledger[ledger_A].ccyType_balance[ccyTypeId_A] -= ccy_amount_A;
            _ledger[ledger_B].ccyType_balance[ccyTypeId_A] += ccy_amount_A;

            _ccyType_totalTransfered[ccyTypeId_A] += uint256(ccy_amount_A);
            // todo: emit event...
        }
        if (ccy_amount_B > 0) {
            _ledger[ledger_B].ccyType_balance[ccyTypeId_B] -= ccy_amount_B;
            _ledger[ledger_A].ccyType_balance[ccyTypeId_B] += ccy_amount_B;

            _ccyType_totalTransfered[ccyTypeId_B] += uint256(ccy_amount_B);
            // todo: emit event...
        }

        // transfer EEUs
        transferSplitEeus(ledger_A, ledger_B, kg_A, eeuTypeId_A);
        transferSplitEeus(ledger_B, ledger_A, kg_B, eeuTypeId_B);

        // TODO...
        // merge (optimization): for both sender and receiver - after split:
        // simply combine same-type ** AND SAME BATCH ** EEUs into a single larger EEU
        // so, only ever should be a single EEU per owner per type per batch in the ledger
        // (implies the "retirement" of old merged EEU IDs)
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
                _ledger[from].eeuType_sumKG[eeuTypeId] -= eeuKg;

                // assign to destination
                to_eeuIds.push(eeuId);
                _ledger[to].eeuType_sumKG[eeuTypeId] += eeuKg;

                remainingToTransfer -= eeuKg;
                // todo: emit event...
            }
            else {
                // split the last EEU across the ledger entries, soft-minting a new EEU in the destination
                // note: the parent (origin) EEU's minted qty also gets split across the two EEUS;
                //         this is so the total minted in the system is unchanged,
                //         and also so the total burned amount in the EEU can still be calculated by _eeus_mintedKG[x] - _eeus_KG[x]
                // note: both parent and child EEU point to each other like a double-linked list

                // soft-mint a new EEU
                uint256 newId = _eeuCurMaxId + 1;
                _eeus_batchId[newId] = batchId; // inherit batch from parent EEU
                _eeus_mintedKG[newId] = remainingToTransfer;
                _eeus_KG[newId] = remainingToTransfer;
                _eeus_mintedTimestamp[newId] = block.timestamp;
                _eeus_splitFromEeuId[newId] = eeuId;
                _eeuCurMaxId++;

                // resize the origin EEU
                _eeus_KG[eeuId] -= remainingToTransfer;
                _eeus_mintedKG[eeuId] -= remainingToTransfer;
                _eeus_splitToEeuId[eeuId] = newId;
                _ledger[from].eeuType_sumKG[eeuTypeId] -= remainingToTransfer;

                // assign new EEU
                _ledger[to].eeuType_eeuIds[eeuTypeId].push(newId);
                _ledger[to].eeuType_sumKG[eeuTypeId] += remainingToTransfer;

                // todo: emit event...
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
