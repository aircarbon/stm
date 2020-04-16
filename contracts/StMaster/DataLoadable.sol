pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/IDataLoadable.sol";

import "./Owned.sol";
import "./StLedger.sol";
import "./StFees.sol";
import "./StErc20.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/TokenLib.sol";
import "../Libs/LoadLib.sol";

contract DataLoadable is IDataLoadable,
    Owned, StLedger, StFees, StErc20 {

    function loadSecTokenBatch(StructLib.SecTokenBatch[] memory batches, uint64 _batches_currentMax_id) public onlyOwner() {
        LoadLib.loadSecTokenBatch(ld, batches, _batches_currentMax_id);
    }

    function createLedgerEntry(
        address ledgerEntryOwner,
        StructLib.LedgerCcyReturn[] memory ccys,
        uint256 spot_sumQtyMinted,
        uint256 spot_sumQtyBurned
    ) public onlyOwner() {
        LoadLib.createLedgerEntry(ld, ledgerEntryOwner, ccys, spot_sumQtyMinted, spot_sumQtyBurned);
    }

    function addSecToken(
        address ledgerEntryOwner,
        uint64 batchId, uint256 stId, uint256 tokenTypeId, int64 mintedQty, int64 currentQty,
        int128 ft_price, int128 ft_lastMarkPrice, address ft_ledgerOwner
    ) public onlyOwner() {
        LoadLib.addSecToken(ld,
            ledgerEntryOwner, batchId, stId, tokenTypeId, mintedQty, currentQty, ft_price, ft_lastMarkPrice, ft_ledgerOwner
        );
    }

    function setTokenTotals(
        uint80 packed_ExchangeFeesPaidQty, uint80 packed_OriginatorFeesPaidQty, uint80 packed_TransferedQty,
        uint256 currentMax_id, uint256 totalMintedQty, uint256 totalBurnedQty
    ) public onlyOwner() {
        LoadLib.setTokenTotals(ld,
            packed_ExchangeFeesPaidQty, packed_OriginatorFeesPaidQty, packed_TransferedQty,
            currentMax_id, totalMintedQty, totalBurnedQty
        );
    }

     function setCcyTotals(
        uint256 ccyTypeId,
        uint256 totalFunded,
        uint256 totalWithdrawn,
        uint256 totalTransfered,
        uint256 totalFeesPaid
    ) public onlyOwner() {
        LoadLib.setCcyTotals(ld, ccyTypeId, totalFunded, totalWithdrawn, totalTransfered, totalFeesPaid);
    }
}
