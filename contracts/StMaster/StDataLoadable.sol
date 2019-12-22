pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";
import "./StFees.sol";
import "./StErc20.sol";

import "../Libs/StructLib.sol";
import "../Libs/TokenLib.sol";

contract StDataLoadable is Owned, StLedger, StFees, StErc20 {

    // generic (max params fn?) with load-type switch?
    function loadTest1(
        address ledgerOwner,
        uint256 tokenTypeId,
        uint256 burnQty)
    public onlyOwner() onlyWhenReadOnly() {
        //...
    }
}
