pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";

library LedgerLib {
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
                tokens_sumQty += ledgerData._sts_currentQty[stId];

                // STs by type
                tokens[flatSecTokenNdx] = StructLib.LedgerSecTokenReturn({
                           stId: stId,
                    tokenTypeId: tokenTypeId,
                  tokenTypeName: stTypesData._tokenTypeNames[tokenTypeId],
                        batchId: ledgerData._sts_batchId[stId],
                     currentQty: ledgerData._sts_currentQty[stId]
              //mintedTimestamp: ledgerData._sts_mintedTimestamp[stId],
                 //splitFrom_id: ledgerData._sts_splitFrom_id[stId],
                   //splitTo_id: ledgerData._sts_splitTo_id[stId]
                });
                flatSecTokenNdx++;
            }
        }

        // populate balances for each currency type
        ccys = new StructLib.LedgerCcyReturn[](ccyTypesData._count_ccyTypes + 1);
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