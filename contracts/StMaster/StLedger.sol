pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StTypes.sol";
import "./CcyTypes.sol";

import "../Libs/LedgerLib.sol";
import "../Libs/StructLib.sol";

contract StLedger is Owned, StTypes, CcyTypes {

    StructLib.LedgerStruct ledgerData;

    /**
     * @dev Returns all accounts in the ledger
     */
    function getLedgerOwners() external view returns (address[] memory) {
        require(msg.sender == owner, "Restricted method");
        return ledgerData._ledgerOwners;
    }

    /**
     * @dev Returns an ST by ID
     */
    function getSecToken(uint256 id) external view returns (StructLib.SecTokenReturn memory) {
        return StructLib.SecTokenReturn({
                exists: ledgerData._sts_batchId[id] != 0,
                    id: id,
             mintedQty: ledgerData._sts_mintedQty[id],
            currentQty: ledgerData._sts_currentQty[id],
               batchId: ledgerData._sts_batchId[id]
     //mintedTimestamp: ledgerData._sts_mintedTimestamp[id],
        //splitFrom_id: ledgerData._sts_splitFrom_id[id],
          //splitTo_id: ledgerData._sts_splitTo_id[id]
            });
    }

    /**
     * @dev Returns the ledger entry for a single account
     */
    function getLedgerEntry(address account) external view returns (StructLib.LedgerReturn memory) {
        // 562
        return LedgerLib.getLedgerEntry(ledgerData, stTypesData, ccyTypesData, account);

        // 571
    //     StructLib.LedgerSecTokenReturn[] memory tokens;
    //     StructLib.LedgerCcyReturn[] memory ccys;
    //     uint256 tokens_sumQty = 0;

    //     // count total # of tokens across all types
    //     uint256 countAllSecTokens = 0;
    //     for (uint256 tokenTypeId = 0; tokenTypeId < stTypesData._count_tokenTypes; tokenTypeId++) {
    //         countAllSecTokens += ledgerData._ledger[account].tokenType_stIds[tokenTypeId].length;
    //     }

    //     // flatten ST IDs and sum sizes across types
    //     tokens = new StructLib.LedgerSecTokenReturn[](countAllSecTokens);
    //     uint256 flatSecTokenNdx = 0;
    //     for (uint256 tokenTypeId = 0; tokenTypeId < stTypesData._count_tokenTypes; tokenTypeId++) {
    //         uint256[] memory tokenType_stIds = ledgerData._ledger[account].tokenType_stIds[tokenTypeId];
    //         for (uint256 ndx = 0; ndx < tokenType_stIds.length; ndx++) {
    //             uint256 stId = tokenType_stIds[ndx];

    //             // sum ST sizes - convenience for caller
    //             tokens_sumQty += ledgerData._sts_currentQty[stId];

    //             // STs by type
    //             tokens[flatSecTokenNdx] = StructLib.LedgerSecTokenReturn({
    //                        stId: stId,
    //                 tokenTypeId: tokenTypeId,
    //               tokenTypeName: stTypesData._tokenTypeNames[tokenTypeId],
    //                     batchId: ledgerData._sts_batchId[stId],
    //                  currentQty: ledgerData._sts_currentQty[stId]
    //           //mintedTimestamp: ledgerData._sts_mintedTimestamp[stId],
    //              //splitFrom_id: ledgerData._sts_splitFrom_id[stId],
    //                //splitTo_id: ledgerData._sts_splitTo_id[stId]
    //             });
    //             flatSecTokenNdx++;
    //         }
    //     }

    //     // populate balances for each currency type
    //     ccys = new StructLib.LedgerCcyReturn[](ccyTypesData._count_ccyTypes);
    //     for (uint256 ccyTypeId = 0; ccyTypeId < ccyTypesData._count_ccyTypes; ccyTypeId++) {
    //         ccys[ccyTypeId] = StructLib.LedgerCcyReturn({
    //                ccyTypeId: ccyTypeId,
    //                     name: ccyTypesData._ccyTypes[ccyTypeId].name,
    //                     unit: ccyTypesData._ccyTypes[ccyTypeId].unit,
    //                  balance: ledgerData._ledger[account].ccyType_balance[ccyTypeId]
    //         });
    //     }

    //     StructLib.LedgerReturn memory ret = StructLib.LedgerReturn({
    //         exists: ledgerData._ledger[account].exists,
    //         tokens: tokens,
    //  tokens_sumQty: tokens_sumQty,
    //           ccys: ccys
    //     });
    //     return ret;
    }

    /**
     * @dev Returns the global ST batch count
     */
    function getSecTokenBatchCount() external view returns (uint256) {
        return ledgerData._batches_currentMax_id; // 1-based
    }

    /**
     * @dev Returns an ST batch by ID
     */
    function getSecTokenBatch(uint256 id) external view returns (StructLib.SecTokenBatch memory) {
        return ledgerData._batches[id];
    }


    /**
     * @dev Checks if the supplied ledger owner holds at least the specified quantity of supplied ST type
     * @param ledger Ledger owner
     * @param tokenTypeId ST type
     * @param qty Validation quantity in contract base unit
     */
    function sufficientTokens(address ledger, uint256 tokenTypeId, uint256 qty, uint256 fee) internal view returns (bool) {
        uint256 qtyAvailable = 0;
        for (uint i = 0; i < ledgerData._ledger[ledger].tokenType_stIds[tokenTypeId].length; i++) {
            qtyAvailable += ledgerData._sts_currentQty[ledgerData._ledger[ledger].tokenType_stIds[tokenTypeId][i]];
        }
        return qtyAvailable >= qty + fee;
    }

    /**
     * @dev Checks if the supplied ledger owner holds at least the specified amount of supplied currency type
     * @param ledger Ledger owner
     * @param ccyTypeId currency type
     * @param amount Validation amount
     */
    function sufficientCcy(address ledger, uint256 ccyTypeId, int256 amount, int256 fee) internal view returns (bool) {
        return ledgerData._ledger[ledger].ccyType_balance[ccyTypeId] >= amount + fee;
    }
}
