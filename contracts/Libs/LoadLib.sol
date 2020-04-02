pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

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
        address ledgerEntryOwner,
        StructLib.LedgerCcyReturn[] memory ccys,
        uint256 spot_sumQtyMinted,
        uint256 spot_sumQtyBurned
    )
    public {
        require(!ledgerData._contractSealed, "Contract is sealed");

        if (!ledgerData._ledger[ledgerEntryOwner].exists) {
            ledgerData._ledgerOwners.push(ledgerEntryOwner);
        }

        ledgerData._ledger[ledgerEntryOwner] = StructLib.Ledger({
                         exists: true,
                     customFees: StructLib.FeeStruct(),
            spot_sumQtyMinted: spot_sumQtyMinted,
            spot_sumQtyBurned: spot_sumQtyBurned
        });

        for (uint256 i = 0 ; i < ccys.length ; i++) {
            ledgerData._ledger[ledgerEntryOwner].ccyType_balance[ccys[i].ccyTypeId] = ccys[i].balance;
        }
    }

    function addSecToken(
        StructLib.LedgerStruct storage ledgerData,
        address ledgerEntryOwner,
        uint64 batchId, uint256 stId, uint256 tokenTypeId, int64 mintedQty, int64 currentQty
    )
    public {
        require(!ledgerData._contractSealed, "Contract is sealed");
        ledgerData._sts[stId].batchId = batchId;
        ledgerData._sts[stId].mintedQty = mintedQty;
        ledgerData._sts[stId].currentQty = currentQty;
        ledgerData._ledger[ledgerEntryOwner].tokenType_stIds[tokenTypeId].push(stId);
    }

    function setTokenTotals(
        StructLib.LedgerStruct storage ledgerData,
        uint80 packed_ExchangeFeesPaidQty, uint80 packed_OriginatorFeesPaidQty, uint80 packed_TransferedQty,
        uint256 currentMax_id, uint256 totalMintedQty, uint256 totalBurnedQty
    )
    public {
        require(!ledgerData._contractSealed, "Contract is sealed");
        ledgerData._tokens_total.exchangeFeesPaidQty = packed_ExchangeFeesPaidQty;
        ledgerData._tokens_total.originatorFeesPaidQty = packed_OriginatorFeesPaidQty;
        ledgerData._tokens_total.transferedQty = packed_TransferedQty;

        ledgerData._tokens_currentMax_id = currentMax_id;
        ledgerData._tokens_totalMintedQty = totalMintedQty;
        ledgerData._tokens_totalBurnedQty = totalBurnedQty;
    }

    function setTotalCcyFunded(
        StructLib.LedgerStruct storage ledgerData,
        uint256 ccyTypeId, uint256 amount)
    public {
        require(!ledgerData._contractSealed, "Contract is sealed");
        ledgerData._ccyType_totalFunded[ccyTypeId] = amount;
    }

    function setTotalCcyWithdrawn(
        StructLib.LedgerStruct storage ledgerData,
        uint256 ccyTypeId, uint256 amount)
    public {
        require(!ledgerData._contractSealed, "Contract is sealed");
        ledgerData._ccyType_totalWithdrawn[ccyTypeId] = amount;
    }

}
