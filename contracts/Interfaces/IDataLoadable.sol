pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "./IOwned.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/TokenLib.sol";
import "../Libs/LoadLib.sol";

/**
 * @notice Contract upgrade methods
 * @dev Data integrity between upgrades is verifiable through getLedgerHashcode()
 */
 contract IDataLoadable is IOwned {

    function loadSecTokenBatch(
        StructLib.SecTokenBatch[] memory batches,
        uint64 _batches_currentMax_id)
    public onlyOwner() { revert("Not implemented"); }

    function createLedgerEntry(
        address ledgerEntryOwner,
        StructLib.LedgerCcyReturn[] memory ccys,
        uint256 spot_sumQtyMinted,
        uint256 spot_sumQtyBurned
    ) public onlyOwner() { revert("Not implemented"); }

    function addSecToken(
        address ledgerEntryOwner,
        uint64 batchId, uint256 stId, uint256 tokenTypeId, int64 mintedQty, int64 currentQty
    ) public onlyOwner() { revert("Not implemented"); }

    function setTokenTotals(
        uint80 packed_ExchangeFeesPaidQty, uint80 packed_OriginatorFeesPaidQty, uint80 packed_TransferedQty,
        uint256 currentMax_id, uint256 totalMintedQty, uint256 totalBurnedQty
    ) public onlyOwner() { revert("Not implemented"); }

    function setTotalCcyFunded(uint256 ccyTypeId, uint256 amount)
    public onlyOwner() { revert("Not implemented"); }

    function setTotalCcyWithdrawn(uint256 ccyTypeId, uint256 amount)
    public onlyOwner() { revert("Not implemented"); }
}
