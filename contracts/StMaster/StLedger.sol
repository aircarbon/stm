pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StTypes.sol";
import "./CcyTypes.sol";

import "../Libs/LedgerLib.sol";
import "../Libs/StructLib.sol";

contract StLedger is Owned, StTypes, CcyTypes {

    StructLib.LedgerStruct ledgerData;

    //
    // ACCESSORS -- ** PUBLIC ** LEDGER
    //

    /**
     * @dev Returns all accounts in the ledger
     */
    function getLedgerOwners() external view returns (address[] memory) {
        return ledgerData._ledgerOwners;
    }

    /**
     * @dev Returns an ST by ID
     */
    function getSecToken(uint256 id) external view returns (StructLib.SecTokenReturn memory) {
        return StructLib.SecTokenReturn({
                exists: ledgerData._sts[id].batchId != 0, //ledgerData._sts_batchId[id] != 0,
                    id: id,
             mintedQty: ledgerData._sts[id].mintedQty, //ledgerData._sts_mintedQty[id],
            currentQty: ledgerData._sts[id].currentQty, //ledgerData._sts_currentQty[id],
               batchId: ledgerData._sts[id].batchId //ledgerData._sts_batchId[id]

     //mintedTimestamp: ledgerData._sts_mintedTimestamp[id],
        //splitFrom_id: ledgerData._sts_splitFrom_id[id],
          //splitTo_id: ledgerData._sts_splitTo_id[id]
            });
    }

    /**
     * @dev Returns the ledger entry for a single account
     */
    function getLedgerEntry(address account) external view returns (StructLib.LedgerReturn memory) {
        return LedgerLib.getLedgerEntry(ledgerData, stTypesData, ccyTypesData, account);
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
    function getSecTokenBatch(uint256 batchId) external view returns (StructLib.SecTokenBatch memory) {
        require(batchId >= 1 && batchId <= ledgerData._batches_currentMax_id, "Bad batchId");
        return ledgerData._batches[batchId];
    }
}
