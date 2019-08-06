pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./AcLedger.sol";

contract EeuBurnable is Owned, AcLedger {
    // todo: test new fields
    event BurnedFullEeu(uint256 id, uint256 eeuTypeId, address ledgerOwner, uint256 burnedKG);
    event BurnedPartialEeu(uint256 id, uint256 eeuTypeId, address ledgerOwner, uint256 burnedKG);

    /**
     * burns carbons by resizing EEUs, and/or removing EEUs from the _ledger.
     * removes EEUs (or fractions thereof) from the main list and from the _ledger, resizing as necessary.
     * the supplied _ledger owner must hold the supplied quantity of carbon in aggregate across _ledger EEUs, and of the supplied type.
     * @param ledgerOwner owner address of the EEUs in the _ledger
     * @param eeuTypeId EEU type
     * @param qtyKG tonnage to burn
     */
    function burnEeus(address ledgerOwner, uint256 eeuTypeId, int256 qtyKG) public {
        require(msg.sender == owner, "Restricted method");
        require(_ledger[ledgerOwner].exists == true, "Invalid _ledger owner");
        require(qtyKG >= 1000, "Minimum one metric ton of carbon required");
        require(eeuTypeId >= 0 && eeuTypeId < _count_eeuTypeIds, "Invalid EEU type");

        // check _ledger owner has sufficient carbon tonnage of supplied type
        require(_ledger[ledgerOwner].type_sumKG[eeuTypeId] >= uint256(qtyKG), "Insufficient carbon held by _ledger owner");

        // burn sufficient EEUs
        uint256 ndx = 0;
        uint256 remainingToBurn = uint256(qtyKG);
        while (remainingToBurn > 0) {
            uint256[] storage type_eeuIds = _ledger[ledgerOwner].type_eeuIds[eeuTypeId];
            uint256 eeuId = type_eeuIds[ndx];
            uint256 eeuKg = _eeus_KG[eeuId];
            uint256 batchId = _eeus_batchId[eeuId];

            if (remainingToBurn >= eeuKg) {
                // burn full EEU
                _eeus_KG[eeuId] = 0;

                // remove from _ledger
                type_eeuIds[ndx] = type_eeuIds[type_eeuIds.length - 1];
                type_eeuIds.length--;
                _ledger[ledgerOwner].type_sumKG[eeuTypeId] -= eeuKg;

                // burn from batch
                _eeuBatches[batchId].burnedKG += eeuKg;

                remainingToBurn -= eeuKg;

                emit BurnedFullEeu(eeuId, eeuTypeId, ledgerOwner, eeuKg);
            } else {
                // resize EEU
                _eeus_KG[eeuId] -= remainingToBurn;

                // retain on _ledger
                _ledger[ledgerOwner].type_sumKG[eeuTypeId] -= remainingToBurn;

                // burn from batch
                _eeuBatches[batchId].burnedKG += remainingToBurn;

                emit BurnedPartialEeu(eeuId, eeuTypeId, ledgerOwner, remainingToBurn);
                remainingToBurn = 0;
            }
        }
        _eeuKgBurned += uint256(qtyKG);
    }

    /**
     * @dev Returns the global no. of KGs carbon burned in EEUs
     */
    function getKgCarbonBurned() external view returns (uint256 count) {
        return _eeuKgBurned;
    }

    /*function arrayRemoveSwapDelete(uint256 valueToFindAndRemove, uint256[] storage array) private returns (bool found)
    {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == valueToFindAndRemove) {
                array[i] = array[array.length - 1];
                //delete array[array.length - 1]; // length-- is sufficient
                array.length--;
                return true;
            }
        }
        return false;
    }*/

    /*function arrayRemoveNewArray(uint valueToFindAndRemove, uint[] memory array)
    internal returns(uint[] memory)  {
        uint[] storage auxArray;
        for (uint i = 0; i < array.length; i++){
            if(array[i] != valueToFindAndRemove)
                auxArray.push(array[i]);
        }
        return auxArray;
    }*/
}
