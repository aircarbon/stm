pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./AcLedger.sol";

contract EeuMintable is Owned, AcLedger {
    event MintedEeuBatch(uint256 batchId, uint256 eeuTypeId, address batchOwner, uint256 qtyKG, uint256 qtyEeus);
    event MintedEeu(uint256 eeuId, uint256 batchId, uint256 eeuTypeId, address ledgerOwner, uint256 mintedKG);

    /**
     * @dev Mints and assigns initial ownership of a new EEU batch
     * @param eeuTypeId The EEU-type for the batch
     * @param qtyKG The KG quanity of carbon to mint across the EEUs
     * @param qtyEeus The quantity of EEUs to mint - recommended, due to memory & gas cost, always set to 1
     * @param batchOwner The ledger owner to assign the minted EEUs to
     */
    function mintEeuBatch(uint256 eeuTypeId, int256 qtyKG, int256 qtyEeus, address batchOwner) public {
        require(msg.sender == owner, "Restricted method");
        require(eeuTypeId >= 0 && eeuTypeId < _count_eeuTypes, "Invalid EEU type");
        //require(qtyEeus >= 1, "Minimum one EEU required");
        require(qtyEeus == 1, "Exactly one EEU required");
        require(qtyKG >= 1000, "Minimum one metric ton of carbon required");
        require(qtyKG % qtyEeus == 0, "Carbon weight must divide evenly into EEUs");

        // create new EEU batch
        EeuBatch memory newBatch = EeuBatch({
                         id: _batchCurMaxId + 1,
            mintedTimestamp: block.timestamp,
                  eeuTypeId: eeuTypeId,
                   mintedKG: uint256(qtyKG),
                   burnedKG: 0
        });
        _eeuBatches[newBatch.id] = newBatch;
        _batchCurMaxId++;
        emit MintedEeuBatch(newBatch.id, eeuTypeId, batchOwner, uint256(qtyKG), uint256(qtyEeus));

        // create ledger entry as required
        if (_ledger[batchOwner].exists == false) {
            _ledger[batchOwner] = Ledger({
                  exists: true
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
            //_eeus_mintedTimestamp[newId] = block.timestamp;

            emit MintedEeu(newId, newBatch.id, eeuTypeId, batchOwner, eeuKG);

            // assign
            _ledger[batchOwner].eeuType_eeuIds[eeuTypeId].push(newId);

            // maintain fast EEU ownership lookup - by keccak256(ledgerOwner||eeuId)
            // not currently used (was used when burning by eeuId)
            //_ownsEeuId[keccak256(abi.encodePacked(batchOwner, newId))] = true;
        }
        //_ledger[batchOwner].eeuType_sumKG[eeuTypeId] += uint256(qtyKG);

        _eeuCurMaxId += uint256(qtyEeus);
        _eeu_totalMintedKG += uint256(qtyKG);
    }

    /**
     * @dev Returns the total global number of EEUs minted
     */
    function getEeuMintedCount() external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return _eeuCurMaxId; // 1-based
    }

    /**
     * @dev Returns the total global tonnage of carbon minted
     */
    function getKgCarbonMinted() external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return _eeu_totalMintedKG;
    }
}
