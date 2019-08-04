pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./AcLedger.sol";

contract EeuBurnable is Owned, AcLedger {
    // Events -- TODO: encode full data in events
    event BurnedFullEeu(uint256 id);
    event BurnedPartialEeu(uint256 id);

    /**
     * burns carbons by resizing EEUs, and/or removing EEUs from the ledger.
     * removes EEUs (or fractions thereof) from the main list and from the ledger, resizing as necessary.
     * the supplied ledger owner must hold the supplied quantity of carbon in aggregate across ledger EEUs, and of the supplied type.
     * @param ledgerOwner owner address of the EEUs in the ledger
     * @param eeuType EEU type
     * @param qtyKG tonnage to burn
     */
    function burnEeus(address ledgerOwner, EeuType eeuType, int256 qtyKG) public {
        require(msg.sender == owner, "Restricted method");
        require(ledger[ledgerOwner].exists == true, "Invalid ledger owner");
        require(qtyKG >= 1000, "Minimum one metric ton of carbon required");
        require(eeuType != EeuType.dummy_end, "Invalid EEU type");
        //require(eeuIds.length > 0, 'Invalid eeuIds');

        // check ledger owner has sufficient carbon tonnage of supplied type
        require(ledger[ledgerOwner].type_sumKG[uint256(eeuType)] >= uint256(qtyKG), "Insufficient carbon held by ledger owner");

        // burn sufficient EEUs
        uint256 ndx = 0;
        uint256 remainingToBurn = uint256(qtyKG);
        while (remainingToBurn > 0) {
            uint256[] storage type_eeuIds = ledger[ledgerOwner].type_eeuIds[uint256(eeuType)]; // ??? proper ref. to storage
            uint256 eeuId = type_eeuIds[ndx];
            uint256 eeuKg = eeus_KG[eeuId];
            uint256 batchId = eeus_batchId[eeuId];

            if (remainingToBurn >= eeuKg) {
                // burn full EEU
                eeus_KG[eeuId] = 0;

                // remove from ledger
                type_eeuIds[ndx] = type_eeuIds[type_eeuIds.length - 1];
                type_eeuIds.length--;
                ledger[ledgerOwner].type_sumKG[uint256(eeuType)] -= eeuKg;

                // burn from batch
                eeuBatches[batchId].burnedKG += eeuKg;

                remainingToBurn -= eeuKg;

                emit BurnedFullEeu(eeuId);
            } else {
                // resize EEU
                eeus_KG[eeuId] -= remainingToBurn;

                // retain on ledger
                ledger[ledgerOwner].type_sumKG[uint256(eeuType)] -= remainingToBurn;

                // burn from batch
                eeuBatches[batchId].burnedKG += remainingToBurn;

                remainingToBurn = 0;

                emit BurnedPartialEeu(eeuId);
            }
        }
        eeuKgBurned += uint256(qtyKG);
    }

    function arrayRemoveSwapDelete(uint256 valueToFindAndRemove, uint256[] storage array) private returns (bool found)
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
    }

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
