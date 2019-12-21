pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";

library LedgerLib {

    function getLedgerHashcode(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.StTypesStruct storage stTypesData,
        StructLib.CcyTypesStruct storage ccyTypesData,
        StructLib.Erc20Struct storage erc20Data,
        StructLib.FeeStruct storage globalFees
    )
    public view returns (bytes32) {
        bytes32 ledgerHash = 0;

        // hash currency types & exchange fees
        for (uint256 ccyTypeId = 1; ccyTypeId <= ccyTypesData._count_ccyTypes; ccyTypeId++) {
            StructLib.Ccy storage ccy = ccyTypesData._ccyTypes[ccyTypeId];
            ledgerHash = keccak256(abi.encodePacked(ledgerHash,
                ccy.id, ccy.name, ccy.unit, ccy.decimals
            ));

            if (globalFees.ccyType_Set[ccyTypeId]) {
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, hashSetFeeArgs(globalFees.ccy[ccyTypeId])));
            }
        }

        // hash token types & exchange fees
        for (uint256 stTypeId = 1; stTypeId <= stTypesData._count_tokenTypes; stTypeId++) {
            ledgerHash = keccak256(abi.encodePacked(ledgerHash, stTypesData._tokenTypeNames[stTypeId]));

            if (globalFees.tokType_Set[stTypeId]) {
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, hashSetFeeArgs(globalFees.tok[stTypeId])));
            }
        }

        // hash whitelist
        ledgerHash = keccak256(abi.encodePacked(ledgerHash, erc20Data._whitelist));

        // hash batches
        for (uint256 batchId = 1; batchId <= ledgerData._batches_currentMax_id; batchId++) {
            StructLib.SecTokenBatch storage batch = ledgerData._batches[batchId];

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

        // walk ledger - skip owner ledger entry [0]
        // (we expect that address to change across contract updates)
        for (uint256 ledgerNdx = 1; ledgerNdx < ledgerData._ledgerOwners.length; ledgerNdx++) {
            address owner = ledgerData._ledgerOwners[ledgerNdx];
            StructLib.Ledger storage entry = ledgerData._ledger[owner];

            // hash ledger tokens & custom fee
            for (uint256 stTypeId = 1; stTypeId <= stTypesData._count_tokenTypes; stTypeId++) {
                uint256[] storage stIds = entry.tokenType_stIds[stTypeId];

                // hash token type id list
                ledgerHash = keccak256(abi.encodePacked(ledgerHash, stIds));

                // hash token type ledger fee
                if (entry.customFees.tokType_Set[stTypeId]) {
                    ledgerHash = keccak256(abi.encodePacked(ledgerHash, hashSetFeeArgs(entry.customFees.tok[stTypeId])));
                }

                // loop tokens, hash their details
                for (uint256 stNdx = 0; stNdx < stIds.length; stNdx++) {
                    StructLib.PackedSt memory st = ledgerData._sts[stIds[stNdx]];

                    ledgerHash = keccak256(abi.encodePacked(ledgerHash,
                        st.batchId,
                        st.mintedQty,
                        st.currentQty
                    ));
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

        // TODO: integrity check - st total minted/burned implied == batch totals == global totals
        //       integrity check - all st's exist exactly once on a ledger entry

        // hash totals
        ledgerHash = keccak256(abi.encodePacked(ledgerHash, ledgerData._tokens_totalMintedQty));
        ledgerHash = keccak256(abi.encodePacked(ledgerHash, ledgerData._tokens_totalBurnedQty));
        //...

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