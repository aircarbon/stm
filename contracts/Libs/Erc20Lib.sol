pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";

library Erc20Lib {

    // WHITELIST
    function whitelist(StructLib.Erc20Struct storage erc20Data, address addr) public {
        erc20Data._whitelist.push(addr);
        erc20Data._whitelisted[addr] = true;
    }

    function seal(StructLib.Erc20Struct storage erc20Data) public {
        erc20Data._whitelistClosed = true;
    }

}