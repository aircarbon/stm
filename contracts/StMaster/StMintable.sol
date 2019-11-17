pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Lib/LedgerLib.sol";

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
        require(tokenTypeId >= 0 && tokenTypeId < stTypesData._count_tokenTypes, "Invalid ST type");
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
        LedgerLib.SecTokenBatch memory newBatch = LedgerLib.SecTokenBatch({
                         id: ledgerData._batches_currentMax_id + 1,
            mintedTimestamp: block.timestamp,
                tokenTypeId: tokenTypeId,
                  mintedQty: uint256(mintQty),
                  burnedQty: 0,
                   metaKeys: metaKeys,
                 metaValues: metaValues
        });
        ledgerData._batches[newBatch.id] = newBatch;
        ledgerData._batches_currentMax_id++;
        emit MintedSecTokenBatch(newBatch.id, tokenTypeId, batchOwner, uint256(mintQty), uint256(mintSecTokenCount));

        // create ledger entry as required
        if (ledgerData._ledger[batchOwner].exists == false) {
            ledgerData._ledger[batchOwner] = LedgerLib.Ledger({
                  exists: true
            });
            ledgerData._ledgerOwners.push(batchOwner);
        }

        // mint & assign STs
        for (int256 ndx = 0; ndx < mintSecTokenCount; ndx++) {
            uint256 newId = ledgerData._tokens_currentMax_id + 1 + uint256(ndx);

            // mint ST
            uint256 stQty = uint256(mintQty) / uint256(mintSecTokenCount);
            ledgerData._sts_batchId[newId] = newBatch.id;
            ledgerData._sts_mintedQty[newId] = stQty;
            ledgerData._sts_currentQty[newId] = stQty;
            //ledgerData._sts_mintedTimestamp[newId] = block.timestamp;

            emit MintedSecToken(newId, newBatch.id, tokenTypeId, batchOwner, stQty);

            // assign
            ledgerData._ledger[batchOwner].tokenType_stIds[tokenTypeId].push(newId);

            // maintain fast ST ownership lookup - by keccak256(ledgerOwner||stId)
            // not currently used (was used when burning by stId)
            //ledgerData._ownsSecTokenId[keccak256(abi.encodePacked(batchOwner, newId))] = true;
        }
        //ledgerData._ledger[batchOwner].tokenType_sumQty[tokenTypeId] += uint256(mintQty);

        ledgerData._tokens_currentMax_id += uint256(mintSecTokenCount);
        ledgerData._tokens_totalMintedQty += uint256(mintQty);
    }

    /**
     * @dev Returns the global ST count (variable-sized: ST count != total ST quantities)
     */
    function getSecToken_countMinted() external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return ledgerData._tokens_currentMax_id; // 1-based
    }

    /**
     * @dev Returns the global sum of total quantities in all STs minted, in the contract base unit
     */
    function getSecToken_totalMintedQty() external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return ledgerData._tokens_totalMintedQty;
    }
}
