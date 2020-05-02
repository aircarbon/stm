pragma solidity >=0.4.21 <=0.6.6;
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
        StructLib.FutureTokenTypeArgs memory ft
    )
    public onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }

    /**
     * @notice Updates variation margin on a future token-type
     * @param tokenTypeId Future token type ID
     * @param varMarginBips New variation margin to set, in basis points
     */
    function setFuture_VariationMargin(
        uint256 tokenTypeId, uint16 varMarginBips
    )
    public onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }

    /**
     * @notice Updates fee per contract on a future token-type
     * @param tokenTypeId Future token type ID
     * @param feePerContract New fee per contract, paid in future reference currency by each side of open interest position
     */
    function setFuture_FeePerContract(
        uint256 tokenTypeId, uint128 feePerContract
    )
    public onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }
}
