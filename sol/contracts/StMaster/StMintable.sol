// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9
// Certik (AD): locked compiler version
pragma solidity 0.8.5;

import "./StLedger.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/LedgerLib.sol";
import "../Libs/SpotFeeLib.sol";

 /**
  * @title Mintable Security Tokens
  * @author Dominic Morris (7-of-9)
  * @notice retirement of security tokens
  * <pre>   - inherits Owned ownership smart contract</pre>
  * <pre>   - inherits StLedger security token ledger contract</pre>
  * <pre>   - uses StructLib interface library</pre>
  * <pre>   - uses LedgerLib runtime library</pre>
  * <pre>   - uses SpotFeeLib runtime library</pre>
  */

abstract contract StMintable is
    StLedger {

    /**
     * @dev mint a fresh security token batch
     * @param tokTypeId token type
     * @param mintQty unit quantity of tokens to be minted
     * @param mintSecTokenCount set as 1
     * @param batchOwner account address of the issuer or batch originator
     * @param originatorFee batch originator token fee setting on all transfers of tokens from this batch
     * @param origCcyFee_percBips_ExFee batch originator currency fee setting on all transfers of tokens from this batch - % of exchange currency 
     * @param metaKeys meta-data keys that attribute to partial fungibility of the tokens
     * @param metaValues meta-data values that attribute to partial fungibility of the tokens
     */
     
    function mintSecTokenBatch(
        uint256                     tokTypeId,
        uint256                     mintQty,
        int64                       mintSecTokenCount,
        address payable             batchOwner,
        StructLib.SetFeeArgs memory originatorFee,
        uint16                      origCcyFee_percBips_ExFee,
        string[] memory             metaKeys,
        string[] memory             metaValues
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
        });
        TokenLib.mintSecTokenBatch(ld, std, args);
    }

    /**
     * @dev add additional meta data to a security token batch
     * @param batchId unique identifier of the security token batch
     * @param metaKeyNew new meta-data key
     * @param metaValueNew new meta-data value
     */
    function addMetaSecTokenBatch(
        uint64 batchId,
        string calldata metaKeyNew,
        string calldata metaValueNew)
    external onlyOwner() onlyWhenReadWrite() {
        TokenLib.addMetaSecTokenBatch(ld, batchId, metaKeyNew, metaValueNew);
    }

    /**
     * @dev add additional meta data to a security token batch
     * @param batchId unique identifier of the security token batch
     * @param originatorFee set new originator fee value
     */
    function setOriginatorFeeTokenBatch(
        uint64 batchId,
        StructLib.SetFeeArgs calldata originatorFee)
    external onlyOwner() onlyWhenReadWrite() {
        TokenLib.setOriginatorFeeTokenBatch(ld, batchId, originatorFee);
    }
    
    /**a
     * @dev add additional meta data to a security token batch
     * @param batchId unique identifier of the security token batch
     * @param origCcyFee_percBips_ExFee set new originator fee % (bips)
     */
    function setOriginatorFeeCurrencyBatch(
        uint64 batchId,
        uint16 origCcyFee_percBips_ExFee)
    external onlyOwner() onlyWhenReadWrite() {
        TokenLib.setOriginatorFeeCurrencyBatch(ld, batchId, origCcyFee_percBips_ExFee);
    }

    // 24k
    /**
     * @dev returns the security token total minted quantity
     * @return totalMintedQty
     * @param totalMintedQty returns the security token total burned quantity
     */
    function getSecToken_totalMintedQty()
    external view returns (uint256 totalMintedQty) { return ld._spot_totalMintedQty; }
}
