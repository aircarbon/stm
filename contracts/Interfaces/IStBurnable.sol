pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "./IOwned.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/TokenLib.sol";

/**
 * @notice Token burning
 */
 contract IStBurnable is IOwned {

    /**
     * @notice Burns the specified quantity of tokens, for the specified token type and ledger entry
     * @dev Burn works by resizing STs (partial burn), and/or removing STs from the ledger entry (full burn)
     * @param ledgerOwner Ledger owner to burn
     * @param tokenTypeId Token type to burn
     * @param burnQty Quantity to burn
     */
    function burnTokens(
        address ledgerOwner,
        uint256 tokenTypeId,
        uint256 burnQty)
    external onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }

    /**
     * @notice Returns the sum total quantities in all tokens burned
     */
    function getSecToken_totalBurnedQty()
    external view onlyOwner() returns (uint256 count) { revert("Not implemented"); }
}
