// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity >=0.4.21 <=0.6.10;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

import "../StMaster/StMaster.sol";

library LedgerLib {

    struct ConsistencyCheck {
        uint256 totalCur;
        uint256 totalMinted;
        uint256 totalTokensOnLedger;
    }
    function getLedgerHashcode(
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        StructLib.CcyTypesStruct storage ctd,
        StructLib.Erc20Struct storage erc20d,
        //StructLib.CashflowStruct storage cashflowData,
        StructLib.FeeStruct storage globalFees
    )
    public view returns (bytes32) {
        bytes32 ledgerHash;

        // hash cashflow data
        // ledgerHash = keccak256(abi.encodePacked(ledgerHash,
        //     cashflowData.args.cashflowType,
        //     cashflowData.args.term_Blks,
        //     cashflowData.args.bond_bps,
        //     cashflowData.args.bond_int_EveryBlks,
        //     cashflowData.qty_issuanceMax,
        //     cashflowData.qty_issuanceRemaining,
        //     cashflowData.wei_currentPrice
        // ));

        // hash currency types & exchange currency fees
        for (uint256 ccyTypeId = 1; ccyTypeId <= ctd._ct_Count; ccyTypeId++) {
            StructLib.Ccy storage ccy = ctd._ct_Ccy[ccyTypeId];
            ledgerHash = keccak256(abi.encodePacked(ledgerHash,
                ccy.id, ccy.name, ccy.unit, ccy.decimals
            ));

            if (globalFees.ccyType_Set[ccyTypeId]) {
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, hashSetFeeArgs(globalFees.ccy[ccyTypeId])));
            }
        }

        // hash token types & exchange token fees
        for (uint256 stTypeId = 1; stTypeId <= std._tt_Count; stTypeId++) {
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, std._tt_name[stTypeId]));
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, std._tt_settle[stTypeId]));

            ledgerHash = keccak256(abi.encodePacked(ledgerHash, std._tt_ft[stTypeId].expiryTimestamp));
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, std._tt_ft[stTypeId].underlyerTypeId));
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, std._tt_ft[stTypeId].refCcyId));
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, std._tt_ft[stTypeId].initMarginBips));
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, std._tt_ft[stTypeId].varMarginBips));
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, std._tt_ft[stTypeId].contractSize));
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, std._tt_ft[stTypeId].feePerContract));

            ledgerHash = keccak256(abi.encodePacked(ledgerHash, std._tt_addr[stTypeId]));

            if (globalFees.tokType_Set[stTypeId]) {
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, hashSetFeeArgs(globalFees.tok[stTypeId])));
            }
        }

        // hash whitelist
        for (uint256 whitelistNdx = 0; whitelistNdx < erc20d._whitelist.length; whitelistNdx++) {
            if (erc20d._whitelist[whitelistNdx] != msg.sender && // exclude contract owner
                whitelistNdx > 0 // this allows tests to simulate new contact owner - whitelist entry 0 is contract owner, by convention
            ) {
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, erc20d._whitelist[whitelistNdx]));
            }
        }
        ledgerHash = keccak256(abi.encodePacked(ledgerHash, erc20d._nextWhitelistNdx));

        // hash batches
        for (uint256 batchId = 1; batchId <= ld._batches_currentMax_id; batchId++) {
            StructLib.SecTokenBatch storage batch = ld._batches[batchId];

            if (batch.originator != msg.sender) { // exclude contract owner
                ledgerHash = keccak256(abi.encodePacked(ledgerHash,
                    batch.id,
                    batch.mintedTimestamp, batch.tokenTypeId,
                    batch.mintedQty, batch.burnedQty,
                    hashStringArray(batch.metaKeys),
                    hashStringArray(batch.metaValues),
                    hashSetFeeArgs(batch.origTokFee),
                    batch.origCcyFee_percBips_ExFee,
                    batch.originator
                ));
            }
        }

        // walk ledger -- exclude contract owner from hashes
        ConsistencyCheck memory chk;
        for (uint256 ledgerNdx = 0; ledgerNdx < ld._ledgerOwners.length; ledgerNdx++) {
            address entryOwner = ld._ledgerOwners[ledgerNdx];
            StructLib.Ledger storage entry = ld._ledger[entryOwner];

            // hash ledger entry owner -- exclude contract owner from this hash (it's could change on contract upgrade)
            if (ledgerNdx != 0)
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, entryOwner));

            // hash ledger tokens, custom spot fees, by token types
            for (uint256 stTypeId = 1; stTypeId <= std._tt_Count; stTypeId++) {
                uint256[] storage stIds = entry.tokenType_stIds[stTypeId];

                // hash token type id list
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, stIds));

                // hash spot-type ledger fee override
                if (entry.spot_customFees.tokType_Set[stTypeId]) {
                    ledgerHash = keccak256(abi.encodePacked(ledgerHash, hashSetFeeArgs(entry.spot_customFees.tok[stTypeId])));
                }

                // hash future-type ledger overrides (init-margin, and fee-per-contract)
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, entry.ft_initMarginBips[stTypeId]));
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, entry.ft_feePerContract[stTypeId]));
            }

            // hash ledger currency balances & custom fees
            for (uint256 ccyTypeId = 1; ccyTypeId <= ctd._ct_Count; ccyTypeId++) {
                // hash currency type balance & reservation
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, entry.ccyType_balance[ccyTypeId]));
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, entry.ccyType_reserved[ccyTypeId]));

                // hash currency type ledger fee
                if (entry.spot_customFees.ccyType_Set[ccyTypeId]) {
                    ledgerHash = keccak256(abi.encodePacked(ledgerHash, hashSetFeeArgs(entry.spot_customFees.ccy[ccyTypeId])));
                }
            }

            // hash ledger entry total minted & burned counts
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, entry.spot_sumQtyMinted));
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, entry.spot_sumQtyBurned));
        }

        // walk all tokens (including those fully deleted from the ledger by burn()), hash
        for (uint256 stId = 1; stId <= ld._tokens_currentMax_id; stId++) {
            StructLib.PackedSt memory st = ld._sts[stId];

            ledgerHash = keccak256(abi.encodePacked(ledgerHash,
                st.batchId,
                st.mintedQty,
                st.currentQty,
                st.ft_price,
                st.ft_ledgerOwner,
                st.ft_lastMarkPrice,
                st.ft_PL
            ));

            // consistency check
            chk.totalCur += uint256(st.currentQty);
            chk.totalMinted += uint256(st.mintedQty);
        }

        // consistency check - global totals vs. all STs
        require(chk.totalMinted == ld._spot_totalMintedQty, "Consistency check failed (1)");
        require(chk.totalMinted - chk.totalCur == ld._spot_totalBurnedQty, "Consistency check failed (2)");

        // hash totals & counters
        ledgerHash = keccak256(abi.encodePacked(ledgerHash, ld._tokens_currentMax_id));
        ledgerHash = keccak256(abi.encodePacked(ledgerHash, ld._spot_totalMintedQty));
        ledgerHash = keccak256(abi.encodePacked(ledgerHash, ld._spot_totalBurnedQty));

        // 24k
        //ledgerHash = keccak256(abi.encodePacked(ledgerHash, uint256(ld._spot_total.transferedQty)));
        //ledgerHash = keccak256(abi.encodePacked(ledgerHash, uint256(ld._spot_total.exchangeFeesPaidQty)));
        //ledgerHash = keccak256(abi.encodePacked(ledgerHash, uint256(ld._spot_total.originatorFeesPaidQty)));
        // for (uint256 ccyTypeId = 1; ccyTypeId <= ctd._ct_Count; ccyTypeId++) {
        //     ledgerHash = keccak256(abi.encodePacked(ledgerHash, uint256(ld._ccyType_totalFunded[ccyTypeId])));
        //     ledgerHash = keccak256(abi.encodePacked(ledgerHash, uint256(ld._ccyType_totalWithdrawn[ccyTypeId])));
        //     ledgerHash = keccak256(abi.encodePacked(ledgerHash, uint256(ld._ccyType_totalTransfered[ccyTypeId])));
        //     ledgerHash = keccak256(abi.encodePacked(ledgerHash, uint256(ld._ccyType_totalFeesPaid[ccyTypeId])));
        // }

        return ledgerHash;
    }

    //
    // GET LEDGER ENTRY
    //

    // returns full ledger information - (delegates to cashflow base contracts' split ledgers for token counts, in cashflow controller)
    struct GetLedgerEntryVars {
        StructLib.LedgerSecTokenReturn[] tokens;
        StructLib.LedgerCcyReturn[]      ccys;
        uint256                          spot_sumQty;
    }
    function getLedgerEntry(
        StructLib.LedgerStruct storage   ld,
        StructLib.StTypesStruct storage  std,
        StructLib.CcyTypesStruct storage ctd,
        address                          account
    )
    public view returns (StructLib.LedgerReturn memory) {
        GetLedgerEntryVars memory v;
        // StructLib.LedgerSecTokenReturn[] memory tokens;
        // StructLib.LedgerCcyReturn[] memory ccys;
        // uint256 spot_sumQty = 0;

        // count total # of tokens (i.e. token count distinct by batch,type) across all types
        uint256 countAllSecTokens = 0;
        StructLib.LedgerReturn[] memory baseLedgers;
        if (ld.contractType == StructLib.ContractType.CASHFLOW_CONTROLLER) { // CFT-C: save base ledger return structures
            baseLedgers = new StructLib.LedgerReturn[](std._tt_Count);
        }
        for (uint256 tokenTypeId = 1; tokenTypeId <= std._tt_Count; tokenTypeId++) {
            if (ld.contractType == StructLib.ContractType.CASHFLOW_CONTROLLER) { // CFT-C: passthrough to base
                StMaster base = StMaster(std._tt_addr[tokenTypeId]);
                //StructLib.LedgerReturn memory baseLedger = base.getLedgerEntry(account);
                baseLedgers[tokenTypeId - 1] = base.getLedgerEntry(account); // get base ledger
                for (uint256 i = 0; i < baseLedgers[tokenTypeId-1].tokens.length; i++) {
                    if (baseLedgers[tokenTypeId - 1].tokens[i].tokenTypeId == tokenTypeId) {
                        countAllSecTokens++;
                    }
                }
            }
            else {
                countAllSecTokens += ld._ledger[account].tokenType_stIds[tokenTypeId].length;
            }
        }
        v.tokens = new StructLib.LedgerSecTokenReturn[](countAllSecTokens);

        // core - flatten STs (and sum total spot size)
        if (ld.contractType != StructLib.ContractType.CASHFLOW_CONTROLLER) {
            uint256 flatSecTokenNdx = 0;
            for (uint256 tokenTypeId = 1; tokenTypeId <= std._tt_Count; tokenTypeId++) {
                uint256[] memory tokenType_stIds = ld._ledger[account].tokenType_stIds[tokenTypeId];

                for (uint256 ndx = 0; ndx < tokenType_stIds.length; ndx++) {
                    uint256 stId = tokenType_stIds[ndx];

                    // sum ST sizes - convenience for caller - only applicable for spot (guaranteed +ve qty) token types
                    if (std._tt_settle[tokenTypeId] == StructLib.SettlementType.SPOT) {
                        v.spot_sumQty += uint256(ld._sts[stId].currentQty);
                    }

                    // STs by type
                    v.tokens[flatSecTokenNdx] = StructLib.LedgerSecTokenReturn({
                               stId: stId,
                        tokenTypeId: tokenTypeId,
                      tokenTypeName: std._tt_name[tokenTypeId],
                            batchId: ld._sts[stId].batchId,
                          mintedQty: ld._sts[stId].mintedQty,
                         currentQty: ld._sts[stId].currentQty,
                           ft_price: ld._sts[stId].ft_price,
                     ft_ledgerOwner: ld._sts[stId].ft_ledgerOwner,
                   ft_lastMarkPrice: ld._sts[stId].ft_lastMarkPrice,
                              ft_PL: ld._sts[stId].ft_PL
                    });
                    flatSecTokenNdx++;
                }
            }
        }
        // controller - get STs from base ledger types (and sum total spot sizes across all types)
        // // TODO...
        // else {
        //    ;
        // }

        // core - populate balances for each currency type
        v.ccys = new StructLib.LedgerCcyReturn[](ctd._ct_Count);
        for (uint256 ccyTypeId = 1; ccyTypeId <= ctd._ct_Count; ccyTypeId++) {
            v.ccys[ccyTypeId - 1] = StructLib.LedgerCcyReturn({
                   ccyTypeId: ccyTypeId,
                        name: ctd._ct_Ccy[ccyTypeId].name,
                        unit: ctd._ct_Ccy[ccyTypeId].unit,
                     balance: ld._ledger[account].ccyType_balance[ccyTypeId],
                    reserved: ld._ledger[account].ccyType_reserved[ccyTypeId]
            });
        }

        StructLib.LedgerReturn memory ret = StructLib.LedgerReturn({
             exists: ld._ledger[account].exists,
             tokens: v.tokens,
        spot_sumQty: v.spot_sumQty,
               ccys: v.ccys,
  spot_sumQtyMinted: ld._ledger[account].spot_sumQtyMinted,
  spot_sumQtyBurned: ld._ledger[account].spot_sumQtyBurned
        });
        return ret;
    }

    //
    // INTERNAL
    //

    function hashStringArray(string[] memory strings) private pure returns (bytes32) {
        bytes32 arrayHash = 0;
        for (uint256 i = 0 ; i < strings.length ; i++) {
            arrayHash = keccak256(abi.encodePacked(arrayHash, strings[i]));
        }
        return arrayHash;
    }

    function hashSetFeeArgs(StructLib.SetFeeArgs memory setFeeArgs) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            setFeeArgs.fee_fixed,
            setFeeArgs.fee_percBips,
            setFeeArgs.fee_min,
            setFeeArgs.fee_max
        ));
    }
}