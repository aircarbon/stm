pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/StructLib.sol";
import "../Libs/TokenLib.sol";

contract StBurnable is Owned, StLedger {

    /**
     * @dev Burns contact base token units by resizing STs, and/or removing STs from the ledger
     * @dev Removes STs (or fractions of) from the main list and from the ledger, resizing as necessary
     * @dev Specified ledger owner must hold the specified quantity of contract base token units in aggregate across ledger STs, of the supplied type
     * @param ledgerOwner Ledger owner to burn
     * @param tokenTypeId ST type to burn
     * @param burnQty Quantity of contact base token units to burn
     */
    function burnTokens(
        address ledgerOwner,
        uint256 tokenTypeId,
        uint256 burnQty)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.burnTokens(ledgerData, stTypesData, ledgerOwner, tokenTypeId, burnQty);
    }

    /**
     * @dev Returns the total global contract base unit quantities in all ST tokens burned, or partially burned
     */
    function getSecToken_totalBurnedQty()
    external view onlyOwner() returns (uint256 count) {
        return ledgerData._tokens_totalBurnedQty;
    }
}
