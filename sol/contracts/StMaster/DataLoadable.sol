// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9
// Certik (AD): locked compiler version
pragma solidity 0.8.5;

import "./StErc20.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/LoadLib.sol";

abstract // solc 0.6

 /**
  * @title Loadable Data
  * @author Dominic Morris (7-of-9)
  * @notice loads security token batches and adds a ledger entry
  * <pre>   - inherits Owned ownership smart contract</pre>
  * <pre>   - inherits StLedger security token ledger contract</pre>
  * <pre>   - inherits StErc20 standard ERC20 token contract </pre>
  * <pre>   - inherits StFees fee management contract </pre>
  * <pre>   - uses StructLib interface library</pre>
  * <pre>   - uses LoadLib runtime library</pre>
  */
  
contract DataLoadable is
    StErc20 {

    /**
    * @dev load a single or multiple security token batch(es)
    * @param batches takes an array of security token batches
    * @param _batches_currentMax_id total count of existing batches
    */
    function loadSecTokenBatch(
        StructLib.SecTokenBatch[] memory batches,
        uint64 _batches_currentMax_id
    ) public onlyOwner() {
        LoadLib.loadSecTokenBatch(ld, batches, _batches_currentMax_id);
    }

    /**
    * @dev add an entry to the ledger
    * @param ledgerEntryOwner account address of the ledger owner for the entry
    * @param ccys ledger entries for currency types structure that includes currency identifier, name, unit, balance, reserved
    * @param spot_sumQtyMinted spot exchange total assets minted quantity
    * @param spot_sumQtyBurned spot exchange total assets burned quantity 
    */
    function createLedgerEntry(
        address ledgerEntryOwner,
        StructLib.LedgerCcyReturn[] memory ccys,
        uint256 spot_sumQtyMinted,
        uint256 spot_sumQtyBurned
    ) public onlyOwner() {
        LoadLib.createLedgerEntry(ld, ledgerEntryOwner, ccys, spot_sumQtyMinted, spot_sumQtyBurned);
    }

    /**
    * @dev add a new security token
    * @param ledgerEntryOwner account address of the ledger entry owner
    * @param batchId unique batch identifier for each security token type
    * @param stId security token identifier of the batch
    * @param tokTypeId token type of the batch
    * @param mintedQty existence check field: should never be non-zero
    * @param currentQty current (variable) unit qty in the ST (i.e. burned = currentQty - mintedQty)
    * @param ft_price becomes average price after combining [futures only]
    * @param ft_lastMarkPrice last mark price [futures only]
    * @param ft_ledgerOwner for takePay() lookup of ledger owner by ST [futures only]
    * @param ft_PL running total P&L [futures only]
    */
    function addSecToken(
        address ledgerEntryOwner,
        uint64 batchId, uint256 stId, uint256 tokTypeId, int64 mintedQty, int64 currentQty,
        int128 ft_price, int128 ft_lastMarkPrice, address ft_ledgerOwner, int128 ft_PL
    ) public onlyOwner() {
        LoadLib.addSecToken(ld,
            ledgerEntryOwner, batchId, stId, tokTypeId, mintedQty, currentQty, ft_price, ft_lastMarkPrice, ft_ledgerOwner, ft_PL
        );
    }

    /**
     * @dev setting totals for security token
     * @param base_id 1-based - assigned (once, when set to initial zero value) by Mint()
     * @param currentMax_id 1-based identifiers updated by Mint() and by transferSplitSecTokens()
     * @param totalMintedQty total burned quantity in the spot exchange
     * @param totalBurnedQty total burned quantity in the spot exchange
     */
    function setTokenTotals(
        //uint80 packed_ExchangeFeesPaidQty, uint80 packed_OriginatorFeesPaidQty, uint80 packed_TransferedQty,
        uint256 base_id,
        uint256 currentMax_id, uint256 totalMintedQty, uint256 totalBurnedQty
    ) public onlyOwner() {
        LoadLib.setTokenTotals(ld,
            //packed_ExchangeFeesPaidQty, packed_OriginatorFeesPaidQty, packed_TransferedQty,
            base_id,
            currentMax_id, totalMintedQty, totalBurnedQty
        );
    }

    // function setCcyTotals(
    //     //LoadLib.SetCcyTotalArgs memory a
    //     uint256 ccyTypeId,
    //     uint256 totalFunded,
    //     uint256 totalWithdrawn,
    //     uint256 totalTransfered,
    //     uint256 totalFeesPaid
    // ) public onlyOwner() {
    //     LoadLib.setCcyTotals(ld, ccyTypeId, totalFunded, totalWithdrawn, totalTransfered, totalFeesPaid);
    // }
}
