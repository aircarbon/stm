pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

library LoadLib {
     function loadSecTokenBatch(
        StructLib.LedgerStruct storage ld,
        StructLib.SecTokenBatch[] memory batches,
        uint64 _batches_currentMax_id
    )
    public {
        require(!ld._contractSealed, "Contract is sealed");
        for (uint256 i = 0; i < batches.length; i++) {
            ld._batches[batches[i].id] = batches[i];
        }
        ld._batches_currentMax_id = _batches_currentMax_id;
    }

    function createLedgerEntry(
        StructLib.LedgerStruct storage ld,
        address ledgerEntryOwner,
        StructLib.LedgerCcyReturn[] memory ccys,
        uint256 spot_sumQtyMinted,
        uint256 spot_sumQtyBurned
    )
    public {
        require(!ld._contractSealed, "Contract is sealed");

        if (!ld._ledger[ledgerEntryOwner].exists) {
            ld._ledgerOwners.push(ledgerEntryOwner);
        }

        ld._ledger[ledgerEntryOwner] = StructLib.Ledger({
                         exists: true,
                spot_customFees: StructLib.FeeStruct(),
              spot_sumQtyMinted: spot_sumQtyMinted,
              spot_sumQtyBurned: spot_sumQtyBurned
        });

        for (uint256 i = 0 ; i < ccys.length ; i++) {
            ld._ledger[ledgerEntryOwner].ccyType_balance[ccys[i].ccyTypeId] = ccys[i].balance;
            ld._ledger[ledgerEntryOwner].ccyType_reserved[ccys[i].ccyTypeId] = ccys[i].reserved;
        }
    }

    function addSecToken(
        StructLib.LedgerStruct storage ld,
        address ledgerEntryOwner,
        uint64 batchId, uint256 stId, uint256 tokenTypeId, int64 mintedQty, int64 currentQty,
        int128 ft_price, int128 ft_lastMarkPrice
    )
    public {
        require(!ld._contractSealed, "Contract is sealed");
        ld._sts[stId].batchId = batchId;
        ld._sts[stId].mintedQty = mintedQty;
        ld._sts[stId].currentQty = currentQty;
        ld._sts[stId].ft_price = ft_price;
        ld._sts[stId].ft_lastMarkPrice = ft_lastMarkPrice;
        ld._ledger[ledgerEntryOwner].tokenType_stIds[tokenTypeId].push(stId);
    }

    function setTokenTotals(
        StructLib.LedgerStruct storage ld,
        uint80 packed_ExchangeFeesPaidQty, uint80 packed_OriginatorFeesPaidQty, uint80 packed_TransferedQty,
        uint256 currentMax_id, uint256 totalMintedQty, uint256 totalBurnedQty
    )
    public {
        require(!ld._contractSealed, "Contract is sealed");
        ld._spot_total.exchangeFeesPaidQty = packed_ExchangeFeesPaidQty;
        ld._spot_total.originatorFeesPaidQty = packed_OriginatorFeesPaidQty;
        ld._spot_total.transferedQty = packed_TransferedQty;

        ld._tokens_currentMax_id = currentMax_id;
        ld._spot_totalMintedQty = totalMintedQty;
        ld._spot_totalBurnedQty = totalBurnedQty;
    }

    function setCcyTotals(
        StructLib.LedgerStruct storage ld,
        uint256 ccyTypeId,
        uint256 totalFunded,
        uint256 totalWithdrawn,
        uint256 totalTransfered,
        uint256 totalFeesPaid
    )
    public {
        require(!ld._contractSealed, "Contract is sealed");
        ld._ccyType_totalFunded[ccyTypeId] = totalFunded;
        ld._ccyType_totalWithdrawn[ccyTypeId] = totalWithdrawn;
        ld._ccyType_totalTransfered[ccyTypeId] = totalTransfered;
        ld._ccyType_totalFeesPaid[ccyTypeId] = totalFeesPaid;
    }
}
