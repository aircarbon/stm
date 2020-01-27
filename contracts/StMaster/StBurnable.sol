pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/IStBurnable.sol";

import "./Owned.sol";
import "./StLedger.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/TokenLib.sol";

contract StBurnable is Owned, StLedger {

    function burnTokens(
        address ledgerOwner,
        uint256 tokenTypeId,
        uint256 burnQty)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.burnTokens(ledgerData, stTypesData, ledgerOwner, tokenTypeId, burnQty);
    }

    function getSecToken_totalBurnedQty()
    external view onlyOwner() returns (uint256 count) {
        return ledgerData._tokens_totalBurnedQty;
    }
}
