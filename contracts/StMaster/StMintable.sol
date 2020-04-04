pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/IStMintable.sol";

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/LedgerLib.sol";
import "../Interfaces/StructLib.sol";
import "../Libs/FeeLib.sol";

contract StMintable is IStMintable,
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
        TokenLib.mintSecTokenBatch(ledgerData, stTypesData, args);
    }

    function addMetaSecTokenBatch(
        uint64 batchId,
        string calldata metaKeyNew,
        string calldata metaValueNew)
    external onlyOwner() onlyWhenReadWrite() {
        TokenLib.addMetaSecTokenBatch(ledgerData, batchId, metaKeyNew, metaValueNew);
    }

    function setOriginatorFeeTokenBatch(
        uint64 batchId,
        StructLib.SetFeeArgs calldata originatorFee)
    external onlyOwner() onlyWhenReadWrite() {
        TokenLib.setOriginatorFeeTokenBatch(ledgerData, batchId, originatorFee);
    }

    function setOriginatorFeeCurrencyBatch(
        uint64 batchId,
        uint16 origCcyFee_percBips_ExFee)
    external onlyOwner() onlyWhenReadWrite() {
        TokenLib.setOriginatorFeeCurrencyBatch(ledgerData, batchId, origCcyFee_percBips_ExFee);
    }

    function getSecToken_countMinted()
    external view returns (uint256) {
        return ledgerData._tokens_currentMax_id; // 1-based
    }

    function getSecToken_totalMintedQty()
    external view returns (uint256) {
        return ledgerData._spot_totalMintedQty;
    }
}
