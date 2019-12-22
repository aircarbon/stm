pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";
import "./StFees.sol";
import "./StErc20.sol";

import "../Libs/StructLib.sol";
import "../Libs/TokenLib.sol";
import "../Libs/LoadLib.sol";

contract StDataLoadable is Owned, StLedger, StFees, StErc20 {

    function loadSecTokenBatch(StructLib.SecTokenBatch[] memory batches, uint64 _batches_currentMax_id) public onlyOwner() {
        LoadLib.loadSecTokenBatch(ledgerData, batches, _batches_currentMax_id);
    }

    function createLedgerEntry(address ledgerEntryOwner) public onlyOwner() {
        LoadLib.createLedgerEntry(ledgerData, ledgerEntryOwner);
    }

    function addSecToken(address ledgerEntryOwner,
        uint64 batchId, uint256 stId, uint256 tokenTypeId, uint64 mintedQty, uint64 currentQty,
        uint256 _tokens_currentMax_id, uint256 _tokens_totalMintedQty
    ) public onlyOwner() {
        LoadLib.addSecToken(ledgerData,
            ledgerEntryOwner, batchId, stId, tokenTypeId, mintedQty, currentQty,
            _tokens_currentMax_id, _tokens_totalMintedQty
        );
    }

    function setTokenTotals(
        uint80 totalExchangeFeesPaidQty,
        uint80 totalOriginatorFeesPaidQty,
        uint80 totalTransferedQty)
    public onlyOwner() {
        LoadLib.setTokenTotals(ledgerData,
            totalExchangeFeesPaidQty, totalOriginatorFeesPaidQty, totalTransferedQty
        );
    }
}
