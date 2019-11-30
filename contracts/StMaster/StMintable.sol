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
     * @param origTokFee Originator (batch ledger owner) token fee structure to apply on all token transfers from this batch
     * @param metaKeys Batch metadata keys
     * @param metaValues Batch metadata values
     */
    function mintSecTokenBatch(
        uint256                     tokenTypeId,
        int256                      mintQty,
        int256                      mintSecTokenCount,
        address                     batchOwner,
        StructLib.SetFeeArgs memory origTokFee,
        string[] memory             metaKeys,
        string[] memory             metaValues)
    public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");

        TokenLib.MintSecTokenBatchArgs memory args = TokenLib.MintSecTokenBatchArgs({
            tokenTypeId: tokenTypeId,
                mintQty: mintQty,
      mintSecTokenCount: mintSecTokenCount,
             batchOwner: batchOwner,
             origTokFee: origTokFee,
               metaKeys: metaKeys,
             metaValues: metaValues
        });
        TokenLib.mintSecTokenBatch(ledgerData, stTypesData, args);
    }

    function addMetaSecTokenBatch(
        uint256 batchId,
        string memory metaKeyNew,
        string memory metaValueNew)
    public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        TokenLib.addMetaSecTokenBatch(ledgerData, batchId, metaKeyNew, metaValueNew);
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
