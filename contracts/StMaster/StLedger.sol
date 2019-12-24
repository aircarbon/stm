pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./CcyTypes.sol";

import "../Libs/LedgerLib.sol";
import "../Libs/StructLib.sol";
import "../Libs/TokenLib.sol";

contract StLedger is Owned, CcyTypes {

    StructLib.LedgerStruct ledgerData;

    StructLib.StTypesStruct stTypesData;

    /**
     * @dev Adds a new ST type
     * @param name New ST type name
     */
    function addSecTokenType(string memory name)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.addSecTokenType(ledgerData, stTypesData, name);
    }

    /**
     * @dev Returns current ST types
     */
    function getSecTokenTypes()
    external view returns (StructLib.GetSecTokenTypesReturn memory) {
        return TokenLib.getSecTokenTypes(stTypesData);
    }

    //
    // ACCESSORS -- PUBLIC LEDGER
    //

    /**
     * @dev Returns all account addresses in the ledger
     */
    function getLedgerOwners() external view returns (address[] memory) {
        return ledgerData._ledgerOwners;
    }

    /**
     * @dev Returns a single account address in the ledger
     * DATA_DUMP: individual fetches
     */
    function getLedgerOwnerCount() external view returns (uint256) { return ledgerData._ledgerOwners.length; }

    /**
     * @dev Returns a single account address in the ledger
     * DATA_DUMP: individual fetches
     */
    function getLedgerOwner(uint256 index) external view returns (address) { return ledgerData._ledgerOwners[index]; }

    /**
     * @dev Returns the ledger entry for a single account
     */
    function getLedgerEntry(address account) external view returns (StructLib.LedgerReturn memory) {
        return LedgerLib.getLedgerEntry(ledgerData, stTypesData, ccyTypesData, account);
    }

    /**
     * @dev Returns a token by ID
     */
    function getSecToken(uint256 id) external view returns (StructLib.SecTokenReturn memory) {
        return StructLib.SecTokenReturn({
                exists: ledgerData._sts[id].batchId != 0,
                    id: id,
             mintedQty: ledgerData._sts[id].mintedQty,
            currentQty: ledgerData._sts[id].currentQty,
               batchId: ledgerData._sts[id].batchId
        });
    }

    /**
     * @dev Returns the global token batch count
     */
    function getSecTokenBatchCount() external view returns (uint256) {
        return ledgerData._batches_currentMax_id; // 1-based
    }

    /**
     * @dev Returns a token batch by ID
     */
    function getSecTokenBatch(uint256 batchId) external view returns (StructLib.SecTokenBatch memory) {
        require(batchId >= 1 && batchId <= ledgerData._batches_currentMax_id, "Bad batchId");
        return ledgerData._batches[batchId];
    }
}
