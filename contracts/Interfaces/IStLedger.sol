pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "./IOwned.sol";

import "../Libs/LedgerLib.sol";
import "../Interfaces/StructLib.sol";
import "../Libs/TokenLib.sol";

/**
 * @notice Ledger accessors, and adding of token types
 */
contract IStLedger is IOwned {

    /**
     * @notice Adds a new ST type
     * @param name New ST type name
     */
    function addSecTokenType(string memory name, StructLib.SettlementType settlementType)
    public onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }

    // /**
    //  * @notice Returns current token types
    //  */
    // function getSecTokenTypes() external view returns (StructLib.GetSecTokenTypesReturn memory) { revert("Not implemented"); }

    // /**
    //  * @notice Returns all account addresses in the ledger
    //  */
    // function getLedgerOwners() external view returns (address[] memory) { revert("Not implemented"); }

    // /**
    //  * @notice Returns a single account address in the ledger
    //  */
    // function getLedgerOwnerCount() external view returns (uint256) { revert("Not implemented"); }

    // /**
    //  * @notice Returns a single account address in the ledger
    //  */
    // function getLedgerOwner(uint256 index) external view returns (address) { revert("Not implemented"); }

    // /**
    //  * @notice Returns the ledger entry for a single account
    //  */
    // function getLedgerEntry(address account) external view returns (StructLib.LedgerReturn memory) { revert("Not implemented"); }

    // /**
    //  * @notice Returns a token by ID
    //  */
    // function getSecToken(uint256 id) external view returns (StructLib.SecTokenReturn memory) { revert("Not implemented"); }

    // /**
    //  * @notice Returns the global token batch count
    //  */
    // function getSecTokenBatchCount() external view returns (uint256) { revert("Not implemented"); }

    // /**
    //  * @notice Returns a token batch by ID
    //  */
    // function getSecTokenBatch(uint256 batchId) external view returns (StructLib.SecTokenBatch memory) { revert("Not implemented"); }
}
