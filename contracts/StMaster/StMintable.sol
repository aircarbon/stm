pragma solidity >=0.4.21 <=0.6.6;
pragma experimental ABIEncoderV2;

//import "../Interfaces/IStMintable.sol";

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/LedgerLib.sol";
import "../Interfaces/StructLib.sol";
import "../Libs/SpotFeeLib.sol";

contract StMintable is //IStMintable,
    Owned, StLedger {

    function mintSecTokenBatch(
        uint256                     tokenTypeId,
        uint256                     mintQty,
        int64                       mintSecTokenCount,
        address payable             batchOwner,
        StructLib.SetFeeArgs memory originatorFee,
        uint16                      origCcyFee_percBips_ExFee,
        string[] memory             metaKeys,
        string[] memory             metaValues)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.MintSecTokenBatchArgs memory args = TokenLib.MintSecTokenBatchArgs({
              tokenTypeId: tokenTypeId,
                  mintQty: mintQty,
        mintSecTokenCount: mintSecTokenCount,
               batchOwner: batchOwner,
               origTokFee: originatorFee,
origCcyFee_percBips_ExFee: origCcyFee_percBips_ExFee,
                 metaKeys: metaKeys,
               metaValues: metaValues
        });
        TokenLib.mintSecTokenBatch(ld, std, args);
    }

    function addMetaSecTokenBatch(
        uint64 batchId,
        string calldata metaKeyNew,
        string calldata metaValueNew)
    external onlyOwner() onlyWhenReadWrite() {
        TokenLib.addMetaSecTokenBatch(ld, batchId, metaKeyNew, metaValueNew);
    }

    function setOriginatorFeeTokenBatch(
        uint64 batchId,
        StructLib.SetFeeArgs calldata originatorFee)
    external onlyOwner() onlyWhenReadWrite() {
        TokenLib.setOriginatorFeeTokenBatch(ld, batchId, originatorFee);
    }

    function setOriginatorFeeCurrencyBatch(
        uint64 batchId,
        uint16 origCcyFee_percBips_ExFee)
    external onlyOwner() onlyWhenReadWrite() {
        TokenLib.setOriginatorFeeCurrencyBatch(ld, batchId, origCcyFee_percBips_ExFee);
    }

    function getSecToken_countMinted()
    external view returns (uint256) {
        return ld._tokens_currentMax_id; // 1-based
    }

    // 24k - exception/retain - needed for erc20 total supply
    function getSecToken_totalMintedQty()
    external view returns (uint256) {
        return ld._spot_totalMintedQty;
    }
}
