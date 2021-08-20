// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9
// Certik (AD): locked compiler version
pragma solidity 0.8.5;

import "../Interfaces/StructLib.sol";

library LoadLib {

    // Certik: (Minor) LOA-01 | Potentially Disjoint Variable The _batches_currentMax_id variable is set as an argument instead of calculated within the for loop that loads the tokens and is not sanitized
    // Resolved: (Minor) LOA-01 | Logically consistent with architectural design for contract upgrade
    function loadSecTokenBatch(
        StructLib.LedgerStruct storage ld,
        StructLib.SecTokenBatch[] memory batches,
        uint64 _batches_currentMax_id
    )
    public {
        // Certik: (Minor) LOA-07 | Inexistent Entry Check The loadSecTokenBatch performs no input sanitization in the batch assignments it performs
        // Resolved: (Minor) LOA-07 | Logically consistent with architectural design for contract upgrade
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

        StructLib.Ledger storage entry = ld._ledger[ledgerEntryOwner];

        // Certik: (Minor) LOA-06 | Inexistent Initializaiton Check The ledger that is initialized within createLedgerEntry isn't validated to not exist already, potentially allowing previously set spot_sumQtyMinted and spot_sumQtyBurned values to be overwritten.
        // Resolved: (Minor) LOA-06 | Logically consistent with architectural design for contract upgrade
        entry.exists = true;
        entry.spot_sumQtyMinted = spot_sumQtyMinted;
        entry.spot_sumQtyBurned = spot_sumQtyBurned;

        // Certik: (Minor) LOA-03 | Inexistent Balance Sanitization The linked for loop does not sanitize the reserve member of ccys[i] to be less-than-or-equal-to the balance member.
        // Resolved: (Minor) LOA-03 | Logically consistent with architectural design for contract upgrade
        // Certik: LOA-04 | Lookup Optimization
        // Resolved (AD): Utilizing local variable to save gas cost in lookup
        for (uint256 i = 0 ; i < ccys.length ; i++) {
            uint256 ccyTypeId = ccys[i].ccyTypeId;
            ld._ledger[ledgerEntryOwner].ccyType_balance[ccyTypeId] = ccys[i].balance;
            ld._ledger[ledgerEntryOwner].ccyType_reserved[ccyTypeId] = ccys[i].reserved;
        }
    }
    // Certik: (Minor) LOA-05 | Inexistent Duplicate Check The addSecToken can overwrite over a currently present security token ID as no sanitization is performed to ensure the security token hasn't already been added.
    // Resolved: (Minor) LOA-05 | Logically consistent with architectural design for contract upgrade
    function addSecToken(
        StructLib.LedgerStruct storage ld,
        address ledgerEntryOwner,
        uint64 batchId, uint256 stId, uint256 tokTypeId, int64 mintedQty, int64 currentQty,
        int128 ft_price, int128 ft_lastMarkPrice, address ft_ledgerOwner, int128 ft_PL
    )
    public {
        require(!ld._contractSealed, "Contract is sealed");
        ld._sts[stId].batchId = batchId;
        ld._sts[stId].mintedQty = mintedQty;
        ld._sts[stId].currentQty = currentQty;
        ld._sts[stId].ft_price = ft_price;
        ld._sts[stId].ft_ledgerOwner = ft_ledgerOwner;
        ld._sts[stId].ft_lastMarkPrice = ft_lastMarkPrice;
        ld._sts[stId].ft_PL = ft_PL;

        // v1.1 bugfix
        // burned tokens don't exist against any ledger entry, (but do exist
        // on the master _sts global list); this conditional allows us to use the
        // null-address to correctly represent these burned tokens in the target contract
        if (ledgerEntryOwner != 0x0000000000000000000000000000000000000000) {  // v1.1 bugfix
            ld._ledger[ledgerEntryOwner].tokenType_stIds[tokTypeId].push(stId);
        }
    }

    function setTokenTotals(
        StructLib.LedgerStruct storage ld,
        //uint80 packed_ExchangeFeesPaidQty, uint80 packed_OriginatorFeesPaidQty, uint80 packed_TransferedQty,
        uint256 base_id,
        uint256 currentMax_id, uint256 totalMintedQty, uint256 totalBurnedQty
    )
    public {
        require(!ld._contractSealed, "Contract is sealed");

        ld._tokens_base_id = base_id;
        ld._tokens_currentMax_id = currentMax_id;
        ld._spot_totalMintedQty = totalMintedQty;
        ld._spot_totalBurnedQty = totalBurnedQty;
    }

}
