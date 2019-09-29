pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./AcLedger.sol";

contract EeuBurnable is Owned, AcLedger {
    event BurnedFullEeu(uint256 eeuId, uint256 eeuTypeId, address ledgerOwner, uint256 burnedKG);
    event BurnedPartialEeu(uint256 eeuId, uint256 eeuTypeId, address ledgerOwner, uint256 burnedKG);

    /**
     * @dev Burns carbons by resizing EEUs, and/or removing EEUs from the ledger
     * @dev Removes EEUs (or fractions thereof) from the main list and from the ledger, resizing as necessary
     * @dev The supplied ledger owner must hold the supplied quantity of carbon in aggregate across ledger EEUs, and of the supplied type
     * @param ledgerOwner Ledger owner to burn
     * @param eeuTypeId EEU type to burn
     * @param qtyKG Tonnage to burn
     */
    function retireCarbon(address ledgerOwner, uint256 eeuTypeId, int256 qtyKG) public {
        require(msg.sender == owner, "Restricted method");
        require(_ledger[ledgerOwner].exists == true, "Invalid ledger owner");
        require(qtyKG >= 1000, "Minimum one metric ton of carbon required");
        require(eeuTypeId >= 0 && eeuTypeId < _count_eeuTypes, "Invalid EEU type");

        // check ledger owner has sufficient carbon tonnage of supplied type
        require(sufficientKg(ledgerOwner, eeuTypeId, uint256(qtyKG), 0) == true, "Insufficient carbon held by ledger owner");
        // uint256 kgAvailable = 0;
        // for (uint i = 0; i < _ledger[ledgerOwner].eeuType_eeuIds[eeuTypeId].length; i++) {
        //     kgAvailable += _eeus_KG[_ledger[ledgerOwner].eeuType_eeuIds[eeuTypeId][i]];
        // }
        // require(kgAvailable >= uint256(qtyKG), "Insufficient carbon held by ledger owner");
        //require(_ledger[ledgerOwner].eeuType_sumKG[eeuTypeId] >= uint256(qtyKG), "Insufficient carbon held by ledger owner");

        // burn sufficient EEUs
        uint256 ndx = 0;
        uint256 remainingToBurn = uint256(qtyKG);
        while (remainingToBurn > 0) {
            uint256[] storage eeuType_eeuIds = _ledger[ledgerOwner].eeuType_eeuIds[eeuTypeId];
            uint256 eeuId = eeuType_eeuIds[ndx];
            uint256 eeuKg = _eeus_KG[eeuId];
            uint256 batchId = _eeus_batchId[eeuId];

            if (remainingToBurn >= eeuKg) {
                // burn full EEU
                _eeus_KG[eeuId] = 0;

                // remove from ledger
                eeuType_eeuIds[ndx] = eeuType_eeuIds[eeuType_eeuIds.length - 1];
                eeuType_eeuIds.length--;
                //_ledger[ledgerOwner].eeuType_sumKG[eeuTypeId] -= eeuKg;

                // burn from batch
                _eeuBatches[batchId].burnedKG += eeuKg;

                remainingToBurn -= eeuKg;
                emit BurnedFullEeu(eeuId, eeuTypeId, ledgerOwner, eeuKg);
            } else {
                // resize EEU
                _eeus_KG[eeuId] -= remainingToBurn;

                // retain on ledger
                //_ledger[ledgerOwner].eeuType_sumKG[eeuTypeId] -= remainingToBurn;

                // burn from batch
                _eeuBatches[batchId].burnedKG += remainingToBurn;

                emit BurnedPartialEeu(eeuId, eeuTypeId, ledgerOwner, remainingToBurn);
                remainingToBurn = 0;
            }
        }
        _eeu_totalBurnedKG += uint256(qtyKG);
    }

    /**
     * @dev Returns the total global tonnage of carbon burned
     */
    function getKgCarbonBurned() external view returns (uint256 count) {
        require(msg.sender == owner, "Restricted method");
        return _eeu_totalBurnedKG;
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
