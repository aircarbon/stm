pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "./IOwned.sol";

import "../Interfaces/StructLib.sol";

/**
 * @notice Token minting
 */
 contract IStMintable is IOwned {

    /**
     * @notice Mints and assigns ownership of a new token batch
     * @param tokenTypeId ST-type for the batch
     * @param mintQty quantity in contact base unit (e.g. KG) to mint across the supplied no. of STs
     * @param mintSecTokenCount Number of STs to mint - enforced: due to memory & gas cost, always set to 1
     * @param batchOwner Ledger owner to assign the minted ST(s) to
     * @param originatorFee Originator (batch ledger owner) token fee structure to apply on all token transfers from this batch
     * @param metaKeys Batch metadata keys
     * @param metaValues Batch metadata values
     */
    function mintSecTokenBatch(
        uint256                     tokenTypeId,
        uint256                     mintQty,
        int64                       mintSecTokenCount,
        address payable             batchOwner,
        StructLib.SetFeeArgs memory originatorFee,
        string[] memory           metaKeys,
        string[] memory           metaValues)
    public onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }

    /**
     * @notice Adds a new metadata entry (KVP) to the specified token batch
     * @param batchId ID of the batch
     * @param metaKeyNew New metadata key - must not already exist in the batch
     * @param metaValueNew New metadata value
     */
    function addMetaSecTokenBatch(
        uint64 batchId,
        string calldata metaKeyNew,
        string calldata metaValueNew)
    external onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }

    /**
     * @notice Sets (overwrites if present) the originator fee structure for the specified token batch
     * @param batchId ID of the batch
     * @param originatorFee Originator fee structure for the batch's tokens
     */
    function setOriginatorFeeTokenBatch(
        uint64 batchId,
        StructLib.SetFeeArgs calldata originatorFee)
    external onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }

    /**
     * @notice Returns the global token count
     * @dev Tokens are variable-sized, i.e. token count != total quantities in all tokens
     */
    function getSecToken_countMinted()
    external view onlyOwner() returns (uint256) { revert("Not implemented"); }

    /**
     * @dev Returns the sum total quantities in all tokens minted
     */
    function getSecToken_totalMintedQty()
    external view onlyOwner() returns (uint256) { revert("Not implemented"); }
}