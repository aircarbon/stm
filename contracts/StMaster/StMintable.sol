pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/LedgerLib.sol";
import "../Libs/StructLib.sol";
import "../Libs/FeeLib.sol";

contract StMintable is Owned, StLedger {
    /**
     * @dev Mints and assigns ownership of a new ST batch
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
        string[] memory             metaKeys,
        string[] memory             metaValues)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.MintSecTokenBatchArgs memory args = TokenLib.MintSecTokenBatchArgs({
            tokenTypeId: tokenTypeId,
                mintQty: mintQty,
      mintSecTokenCount: mintSecTokenCount,
             batchOwner: batchOwner,
             origTokFee: originatorFee,
               metaKeys: metaKeys,
             metaValues: metaValues
        });
        TokenLib.mintSecTokenBatch(ledgerData, stTypesData, args);
    }

    /**
     * @dev Adds a new KVP metadata to the batch
     * @param batchId ID of the batch
     * @param metaKeyNew New metadata key - must not already exist in the batch
     * @param metaValueNew New metadata value
     */
    function addMetaSecTokenBatch(
        uint64 batchId,
        string memory metaKeyNew,
        string memory metaValueNew)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.addMetaSecTokenBatch(ledgerData, batchId, metaKeyNew, metaValueNew);
    }

    /**
     * @dev Sets (overwrites if present) the originator fee structure for the batch
     * @param batchId ID of the batch
     * @param originatorFee Originator fee structure for the batch's tokens
     */
    function setOriginatorFeeTokenBatch(
        uint64 batchId,
        StructLib.SetFeeArgs memory originatorFee)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.setOriginatorFeeTokenBatch(ledgerData, batchId, originatorFee);
    }

    /**
     * @dev Returns the global ST count (variable-sized: ST count != total ST quantities)
     */
    function getSecToken_countMinted()
    external view onlyOwner() returns (uint256) {
        return ledgerData._tokens_currentMax_id; // 1-based
    }

    /**
     * @dev Returns the global sum of total quantities in all STs minted, in the contract base unit
     */
    function getSecToken_totalMintedQty()
    external view onlyOwner() returns (uint256) {
        return ledgerData._tokens_totalMintedQty;
    }
}
