pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

library LedgerLib {

    struct ConsistencyCheck {
        uint256 totalCur;
        uint256 totalMinted;
        uint256 totalTokensOnLedger;
    }
    function getLedgerHashcode(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.StTypesStruct storage stTypesData,
        StructLib.CcyTypesStruct storage ccyTypesData,
        StructLib.Erc20Struct storage erc20Data,
        StructLib.CashflowStruct storage cashflowData,
        StructLib.FeeStruct storage globalFees
    )
    public view returns (bytes32) {
        bytes32 ledgerHash;

        // hash cashflow data
        ledgerHash = keccak256(abi.encodePacked(ledgerHash,
            cashflowData.args.cashflowType,
            //cashflowData.args.wei_maxIssuance,
            //cashflowData.args.wei_currentPrice,
            cashflowData.args.term_Blks,
            cashflowData.args.bond_bps,
            cashflowData.args.bond_int_EveryBlks,
            //cashflowData.issued_Blk
            cashflowData.qty_issuanceMax,
            cashflowData.qty_issuanceRemaining,
            cashflowData.wei_currentPrice
        ));

        // hash currency types & exchange currency fees
        for (uint256 ccyTypeId = 1; ccyTypeId <= ccyTypesData._count_ccyTypes; ccyTypeId++) {
            StructLib.Ccy storage ccy = ccyTypesData._ccyTypes[ccyTypeId];
            ledgerHash = keccak256(abi.encodePacked(ledgerHash,
                ccy.id, ccy.name, ccy.unit, ccy.decimals
            ));

            if (globalFees.ccyType_Set[ccyTypeId]) {
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, hashSetFeeArgs(globalFees.ccy[ccyTypeId])));
            }
        }

        // hash token types & exchange token fees
        for (uint256 stTypeId = 1; stTypeId <= stTypesData._count_tokenTypes; stTypeId++) {
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, stTypesData._tokenTypeNames[stTypeId]));

            if (globalFees.tokType_Set[stTypeId]) {
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, hashSetFeeArgs(globalFees.tok[stTypeId])));
            }
        }

        // hash whitelist
        for (uint256 whitelistNdx = 0; whitelistNdx < erc20Data._whitelist.length; whitelistNdx++) {
            if (erc20Data._whitelist[whitelistNdx] != msg.sender && // exclude contract owner
                whitelistNdx > 0 // this allows tests to simulate new contact owner - whitelist entry 0 is contract owner, by convention
            ) {
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, erc20Data._whitelist[whitelistNdx]));
            }
        }

        // hash batches
        for (uint256 batchId = 1; batchId <= ledgerData._batches_currentMax_id; batchId++) {
            StructLib.SecTokenBatch storage batch = ledgerData._batches[batchId];

            if (batch.originator != msg.sender) { // exclude contract owner
                ledgerHash = keccak256(abi.encodePacked(ledgerHash,
                    batch.id,
                    batch.mintedTimestamp, batch.tokenTypeId,
                    batch.mintedQty, batch.burnedQty,
                    hashStringArray(batch.metaKeys),
                    hashStringArray(batch.metaValues),
                    hashSetFeeArgs(batch.origTokFee),
                    batch.originator
                ));
            }
        }

        // walk ledger -- exclude contract owner from hashes
        ConsistencyCheck memory chk;
        for (uint256 ledgerNdx = 0; ledgerNdx < ledgerData._ledgerOwners.length; ledgerNdx++) {
            address entryOwner = ledgerData._ledgerOwners[ledgerNdx];
            StructLib.Ledger storage entry = ledgerData._ledger[entryOwner];

            // hash ledger entry owner -- exclude contract owner from this hash (it's could change on contract upgrade)
            if (ledgerNdx != 0)
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, entryOwner));

            // hash ledger tokens & custom fee, by token types
            for (uint256 stTypeId = 1; stTypeId <= stTypesData._count_tokenTypes; stTypeId++) {
                uint256[] storage stIds = entry.tokenType_stIds[stTypeId];

                // hash token type id list
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, stIds));

                // hash token type ledger fee
                if (entry.customFees.tokType_Set[stTypeId]) {
                    ledgerHash = keccak256(abi.encodePacked(ledgerHash, hashSetFeeArgs(entry.customFees.tok[stTypeId])));
                }
            }

            // hash ledger currency balances & custom fees
            for (uint256 ccyTypeId = 1; ccyTypeId <= ccyTypesData._count_ccyTypes; ccyTypeId++) {
                // hash currency type balance
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, entry.ccyType_balance[ccyTypeId]));

                // hash currency type ledger fee
                if (entry.customFees.ccyType_Set[ccyTypeId]) {
                    ledgerHash = keccak256(abi.encodePacked(ledgerHash, hashSetFeeArgs(entry.customFees.ccy[ccyTypeId])));
                }
            }
        }

        // walk all tokens (including those fully deleted from the ledger by burn()), hash
        for (uint256 stId = 1; stId <= ledgerData._tokens_currentMax_id; stId++) {
            StructLib.PackedSt memory st = ledgerData._sts[stId];

            ledgerHash = keccak256(abi.encodePacked(ledgerHash, st.batchId, st.mintedQty, st.currentQty));

            // consistency check
            chk.totalCur += uint256(st.currentQty);
            chk.totalMinted += uint256(st.mintedQty);
        }

        // consistency check - global totals vs. all STs
        require(chk.totalMinted == ledgerData._tokens_totalMintedQty, "Consistency check failed (1)");
        require(chk.totalMinted - chk.totalCur == ledgerData._tokens_totalBurnedQty, "Consistency check failed (2)");

        // hash totals & counters
        ledgerHash = keccak256(abi.encodePacked(ledgerHash, ledgerData._tokens_currentMax_id));
        ledgerHash = keccak256(abi.encodePacked(ledgerHash, ledgerData._tokens_totalMintedQty));
        ledgerHash = keccak256(abi.encodePacked(ledgerHash, ledgerData._tokens_totalBurnedQty));
        ledgerHash = keccak256(abi.encodePacked(ledgerHash, uint256(ledgerData._tokens_total.transferedQty)));
        ledgerHash = keccak256(abi.encodePacked(ledgerHash, uint256(ledgerData._tokens_total.exchangeFeesPaidQty)));
        ledgerHash = keccak256(abi.encodePacked(ledgerHash, uint256(ledgerData._tokens_total.originatorFeesPaidQty)));
        for (uint256 ccyTypeId = 1; ccyTypeId <= ccyTypesData._count_ccyTypes; ccyTypeId++) {
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, uint256(ledgerData._ccyType_totalFunded[ccyTypeId])));
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, uint256(ledgerData._ccyType_totalWithdrawn[ccyTypeId])));
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, uint256(ledgerData._ccyType_totalTransfered[ccyTypeId])));
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, uint256(ledgerData._ccyType_totalFeesPaid[ccyTypeId])));
        }

        return ledgerHash;
    }

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

    // returns full (expensive) ledger information
    function getLedgerEntry(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.StTypesStruct storage stTypesData,
        StructLib.CcyTypesStruct storage ccyTypesData,
        address account)
    public view returns (StructLib.LedgerReturn memory) {
        StructLib.LedgerSecTokenReturn[] memory tokens;
        StructLib.LedgerCcyReturn[] memory ccys;
        uint256 tokens_sumQty = 0;

        // count total # of tokens across all types
        uint256 countAllSecTokens = 0;
        for (uint256 tokenTypeId = 1; tokenTypeId <= stTypesData._count_tokenTypes; tokenTypeId++) {
            countAllSecTokens += ledgerData._ledger[account].tokenType_stIds[tokenTypeId].length;
        }

        // flatten ST IDs and sum sizes across types
        tokens = new StructLib.LedgerSecTokenReturn[](countAllSecTokens);
        uint256 flatSecTokenNdx = 0;
        for (uint256 tokenTypeId = 1; tokenTypeId <= stTypesData._count_tokenTypes; tokenTypeId++) {
            uint256[] memory tokenType_stIds = ledgerData._ledger[account].tokenType_stIds[tokenTypeId];
            for (uint256 ndx = 0; ndx < tokenType_stIds.length; ndx++) {
                uint256 stId = tokenType_stIds[ndx];

                // sum ST sizes - convenience for caller
                tokens_sumQty += ledgerData._sts[stId].currentQty;

                // STs by type
                tokens[flatSecTokenNdx] = StructLib.LedgerSecTokenReturn({
                           stId: stId,
                    tokenTypeId: tokenTypeId,
                  tokenTypeName: stTypesData._tokenTypeNames[tokenTypeId],
                        batchId: ledgerData._sts[stId].batchId,
                      mintedQty: ledgerData._sts[stId].mintedQty,
                     currentQty: ledgerData._sts[stId].currentQty
                });
                flatSecTokenNdx++;
            }
        }

        // populate balances for each currency type
        ccys = new StructLib.LedgerCcyReturn[](ccyTypesData._count_ccyTypes);
        for (uint256 ccyTypeId = 1; ccyTypeId <= ccyTypesData._count_ccyTypes; ccyTypeId++) {
            ccys[ccyTypeId - 1] = StructLib.LedgerCcyReturn({
                   ccyTypeId: ccyTypeId,
                        name: ccyTypesData._ccyTypes[ccyTypeId].name,
                        unit: ccyTypesData._ccyTypes[ccyTypeId].unit,
                     balance: ledgerData._ledger[account].ccyType_balance[ccyTypeId]
            });
        }

        StructLib.LedgerReturn memory ret = StructLib.LedgerReturn({
            exists: ledgerData._ledger[account].exists,
            tokens: tokens,
     tokens_sumQty: tokens_sumQty,
              ccys: ccys
        });
        return ret;
    }
}