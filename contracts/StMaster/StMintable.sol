pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

contract StMintable is Owned, StLedger {
    event MintedSecTokenBatch(uint256 batchId, uint256 tokenTypeId, address batchOwner, uint256 mintQty, uint256 mintSecTokenCount);
    event MintedSecToken(uint256 stId, uint256 batchId, uint256 tokenTypeId, address ledgerOwner, uint256 mintedQty);

    /**
     * @dev Mints and assigns ownership of a new ST batch
     * @param tokenTypeId ST-type for the batch
     * @param mintQty quantity in contact base unit (e.g. KG) to mint across the supplied no. of STs
     * @param mintSecTokenCount Number of STs to mint - enforced: due to memory & gas cost, always set to 1
     * @param batchOwner Ledger owner to assign the minted ST(s) to
     * @param metaKeys Batch metadata keys
     * @param metaValues Batch metadata values
     */
    function mintSecTokenBatch(
        uint256 tokenTypeId,
        int256  mintQty,
        int256  mintSecTokenCount,
        address batchOwner,
        string[] memory metaKeys,
        string[] memory metaValues)
    public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(tokenTypeId >= 0 && tokenTypeId < _count_tokenTypes, "Invalid ST type");
        //require(mintSecTokenCount >= 1, "Minimum one ST required");
        require(mintSecTokenCount == 1, "Exactly one ST required");
        require(mintQty >= 1, "Minimum one mintQty required");
        require(mintQty % mintSecTokenCount == 0, "mintQty must divide evenly into mintSecTokenCount");
        
        // ### string[] param lengths are reported as zero!
        /*require(metaKeys.length == 0, "At least one metadata key must be provided");
        require(metaKeys.length <= 42, "Maximum metadata KVP length is 42");
        require(metaKeys.length != metaValues.length, "Metadata keys/values length mismatch");
        for (uint i = 0; i < metaKeys.length; i++) {
            require(bytes(metaKeys[i]).length == 0 || bytes(metaValues[i]).length == 0, "Zero-length metadata key or value supplied");
        }*/

        // create new ST batch
        SecTokenBatch memory newBatch = SecTokenBatch({
                         id: _batches_currentMax_id + 1,
            mintedTimestamp: block.timestamp,
                tokenTypeId: tokenTypeId,
                  mintedQty: uint256(mintQty),
                  burnedQty: 0,
                   metaKeys: metaKeys,
                 metaValues: metaValues
        });
        _batches[newBatch.id] = newBatch;
        _batches_currentMax_id++;
        emit MintedSecTokenBatch(newBatch.id, tokenTypeId, batchOwner, uint256(mintQty), uint256(mintSecTokenCount));

        // create ledger entry as required
        if (_ledger[batchOwner].exists == false) {
            _ledger[batchOwner] = Ledger({
                  exists: true
            });
            _ledgerOwners.push(batchOwner);
        }

        // mint & assign STs
        for (int256 ndx = 0; ndx < mintSecTokenCount; ndx++) {
            uint256 newId = _tokens_currentMax_id + 1 + uint256(ndx);

            // mint ST
            uint256 stQty = uint256(mintQty) / uint256(mintSecTokenCount);
            _sts_batchId[newId] = newBatch.id;
            _sts_mintedQty[newId] = stQty;
            _sts_currentQty[newId] = stQty;
            //_sts_mintedTimestamp[newId] = block.timestamp;

            emit MintedSecToken(newId, newBatch.id, tokenTypeId, batchOwner, stQty);

            // assign
            _ledger[batchOwner].tokenType_stIds[tokenTypeId].push(newId);

            // maintain fast ST ownership lookup - by keccak256(ledgerOwner||stId)
            // not currently used (was used when burning by stId)
            //_ownsSecTokenId[keccak256(abi.encodePacked(batchOwner, newId))] = true;
        }
        //_ledger[batchOwner].tokenType_sumQty[tokenTypeId] += uint256(mintQty);

        _tokens_currentMax_id += uint256(mintSecTokenCount);
        _tokens_totalMintedQty += uint256(mintQty);
    }

    /**
     * @dev Returns the global ST count (variable-sized: ST count != total ST quantities)
     */
    // DEMO TMP: remove for easier migration (todo - separate contracts?)
    function getSecToken_countMinted() external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return _tokens_currentMax_id; // 1-based
    }

    /**
     * @dev Returns the global sum of total quantities in all STs minted, in the contract base unit
     */
    // DEMO TMP: remove for easier migration (todo - separate contracts?)
    function getSecToken_totalMintedQty() external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return _tokens_totalMintedQty;
    }
}
