pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./AcLedger.sol";

contract EeuMintable is Owned, AcLedger {
    // Events -- TODO: encode full data in events
    event MintedEeuBatch(uint256 id);
    event MintedEeu(uint256 id);

    /**
     * mint and assign ownership new EEU batch
     * @param eeuTypeId EEU-type for the batch
     * @param qtyKG KG quanity of carbon to mint across the EEUs
     * @param qtyEeus quantity of EEUs in the batch
     * @param batchOwner who to assign the minted EEUs to
     */
    function mintEeuBatch(/*EeuType eeuType*/uint256 eeuTypeId, int256 qtyKG, int256 qtyEeus, address batchOwner) public {
        require(msg.sender == owner, "Restricted method");
        require(qtyKG >= 1000, "Minimum one metric ton of carbon required");
        //require(eeuType != EeuType.dummy_end, "Invalid EEU type");
        require(eeuTypeId >= 0 && eeuTypeId < _count_eeuTypeIds, "Invalid EEU type");
        require(qtyEeus >= 1, "Minimum one EEU required");
        require(qtyKG % qtyEeus == 0, "Carbon weight must divide evenly into EEUs");

        // create new EEU batch
        EeuBatch memory newBatch = EeuBatch({
                         id: _batchCurMaxId + 1,
            mintedTimestamp: block.timestamp,
                  eeuTypeId: eeuTypeId,
                   mintedKG: uint256(qtyKG),
                   burnedKG: 0
        });
        //_eeuBatches.push(newBatch);
        _eeuBatches[newBatch.id] = newBatch;
        _batchCurMaxId++;
        emit MintedEeuBatch(newBatch.id);

        // create _ledger entry as required
        if (_ledger[batchOwner].exists == false) {
            _ledger[batchOwner] = Ledger({
                  exists: true
              //usdCents: 0,
              //  ethWei: 0
            });
            _ledgerOwners.push(batchOwner);
        }

        // mint & assign EEUs
        for (int256 ndx = 0; ndx < qtyEeus; ndx++) {
            uint256 newId = _eeuCurMaxId + 1 + uint256(ndx);

            // mint EEU
            uint256 eeuKG = uint256(qtyKG) / uint256(qtyEeus);
            _eeus_batchId[newId] = newBatch.id;
            _eeus_mintedKG[newId] = eeuKG;
            _eeus_KG[newId] = eeuKG;
            _eeus_mintedTimestamp[newId] = block.timestamp;

            emit MintedEeu(newId);

            // assign
            _ledger[batchOwner].type_eeuIds[eeuTypeId].push(newId);

            // maintain fast EEU ownership lookup - by keccak256(ledgerOwner||eeuId)
            // not currently used (was used when burning by eeuId)
            //_ownsEeuId[keccak256(abi.encodePacked(batchOwner, newId))] = true;
        }
        //_ledger[batchOwner].eeu_sumKG += uint(qtyKG);
        _ledger[batchOwner].type_sumKG[eeuTypeId] += uint256(qtyKG);

        _eeuCurMaxId += uint256(qtyEeus);
        _eeuKgMinted += uint256(qtyKG);
    }

    
    /**
     * @dev Returns the global no. of EEUs minted
     */
    function getEeuMintedCount() external view returns (uint256 count) {
        return _eeuCurMaxId; // 1-based
    }
    
    /**
     * @dev Returns the global no. of KGs carbon minted in EEUs
     */
    function getKgCarbonMinted() external view returns (uint256 count) {
        return _eeuKgMinted;
    }
}
