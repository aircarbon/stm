pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "./IOwned.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/FuturesLib.sol";
import "../Libs/Erc20Lib.sol";
import "../Libs/LedgerLib.sol";

/**
 * @notice Controls internal exchange (whitelisted) futures positions
 */
 contract IStFutures is IOwned {

    /**
     * @notice ...
     * @dev xxx
     * @param a StructLib.TransferArgs arguments
     */
    function openPosition(StructLib.FuturesPositionArgs memory a)
    public onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }
}
