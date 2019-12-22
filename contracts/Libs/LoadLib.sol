pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";

library LoadLib {
     function loadSecTokenBatch(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.SecTokenBatch[] memory batches,
        uint64 _batches_currentMax_id
    )
    public {
        require(!ledgerData._contractSealed, "Contract is sealed");
        for (uint256 i = 0; i < batches.length; i++) {
            ledgerData._batches[batches[i].id] = batches[i];
        }
        ledgerData._batches_currentMax_id = _batches_currentMax_id;
    }

    function createLedgerEntry(
        StructLib.LedgerStruct storage ledgerData,
        address ledgerEntryOwner
    )
    public {
        require(!ledgerData._contractSealed, "Contract is sealed");
        ledgerData._ledger[ledgerEntryOwner] = StructLib.Ledger({
                exists: true,
            customFees: StructLib.FeeStruct()
        });
        ledgerData._ledgerOwners.push(ledgerEntryOwner);
    }

    function addSecToken(
        StructLib.LedgerStruct storage ledgerData,
        address ledgerEntryOwner,
        uint64 batchId, uint256 stId, uint256 tokenTypeId, uint64 mintedQty, uint64 currentQty,
        uint256 _tokens_currentMax_id, uint256 _tokens_totalMintedQty)
    public {
        ledgerData._sts[stId].batchId = batchId;
        ledgerData._sts[stId].mintedQty = mintedQty;
        ledgerData._sts[stId].currentQty = currentQty;
        ledgerData._ledger[ledgerEntryOwner].tokenType_stIds[tokenTypeId].push(stId);
        ledgerData._tokens_currentMax_id = _tokens_currentMax_id;
        ledgerData._tokens_totalMintedQty = _tokens_totalMintedQty;
    }

    function setTokenTotals(
        StructLib.LedgerStruct storage ledgerData,
        uint80 totalExchangeFeesPaidQty,
        uint80 totalOriginatorFeesPaidQty,
        uint80 totalTransferedQty)
    public {
        ledgerData._tokens_total.exchangeFeesPaidQty = totalExchangeFeesPaidQty;
        ledgerData._tokens_total.originatorFeesPaidQty += totalOriginatorFeesPaidQty;
        ledgerData._tokens_total.transferedQty = totalTransferedQty;
    }
}
