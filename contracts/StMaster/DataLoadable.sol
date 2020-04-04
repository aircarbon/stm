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
        LoadLib.loadSecTokenBatch(ledgerData, batches, _batches_currentMax_id);
    }

    function createLedgerEntry(
        address ledgerEntryOwner,
        StructLib.LedgerCcyReturn[] memory ccys,
        uint256 spot_sumQtyMinted,
        uint256 spot_sumQtyBurned
    ) public onlyOwner() {
        LoadLib.createLedgerEntry(ledgerData, ledgerEntryOwner, ccys, spot_sumQtyMinted, spot_sumQtyBurned);
    }

    function addSecToken(
        address ledgerEntryOwner,
        uint64 batchId, uint256 stId, uint256 tokenTypeId, int64 mintedQty, int64 currentQty,
        int128 ft_price, int128 ft_lastMarkPrice
    ) public onlyOwner() {
        LoadLib.addSecToken(ledgerData,
            ledgerEntryOwner, batchId, stId, tokenTypeId, mintedQty, currentQty, ft_price, ft_lastMarkPrice
        );
    }

    function setTokenTotals(
        uint80 packed_ExchangeFeesPaidQty, uint80 packed_OriginatorFeesPaidQty, uint80 packed_TransferedQty,
        uint256 currentMax_id, uint256 totalMintedQty, uint256 totalBurnedQty
    ) public onlyOwner() {
        LoadLib.setTokenTotals(ledgerData,
            packed_ExchangeFeesPaidQty, packed_OriginatorFeesPaidQty, packed_TransferedQty,
            currentMax_id, totalMintedQty, totalBurnedQty
        );
    }

    function setTotalCcyFunded(uint256 ccyTypeId, uint256 amount)
    public onlyOwner() {
        LoadLib.setTotalCcyFunded(ledgerData, ccyTypeId, amount);
    }

    function setTotalCcyWithdrawn(uint256 ccyTypeId, uint256 amount)
    public onlyOwner() {
        LoadLib.setTotalCcyWithdrawn(ledgerData, ccyTypeId, amount);
    }
}
