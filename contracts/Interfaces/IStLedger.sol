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
     * @param settlementType Spot or Future type
     * @param ft Future parameters
     */
    function addSecTokenType(
        string memory name,
        StructLib.SettlementType settlementType,
        StructLib.FutureTokenArgs memory ft
        //uint64 expiryTimestamp,
        //uint256 underlyerTypeId,
        //uint256 refCcyId
    )
    public onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }
}
