// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity >=0.4.21 <=0.6.10;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/LedgerLib.sol";
import "../Interfaces/StructLib.sol";
import "../Libs/SpotFeeLib.sol";

contract StMintable is
    Owned, StLedger {

    function mintSecTokenBatch(
        uint256                     tokTypeId,
        uint256                     mintQty,
        int64                       mintSecTokenCount,
        address payable             batchOwner,
        StructLib.SetFeeArgs memory originatorFee,
        uint16                      origCcyFee_percBips_ExFee,
        string[] memory             metaKeys,
        string[] memory             metaValues
        //,uint256                     cftc_maxStId
    )
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.MintSecTokenBatchArgs memory args = TokenLib.MintSecTokenBatchArgs({
                tokTypeId: tokTypeId,
                  mintQty: mintQty,
        mintSecTokenCount: mintSecTokenCount,
               batchOwner: batchOwner,
               origTokFee: originatorFee,
origCcyFee_percBips_ExFee: origCcyFee_percBips_ExFee,
                 metaKeys: metaKeys,
               metaValues: metaValues
               //,cftc_maxStId: cftc_maxStId
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

    // 24k
    function getSecToken_totalMintedQty()
    external view returns (uint256) { return ld._spot_totalMintedQty; }
}
