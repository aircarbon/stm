// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity >=0.4.21 <=0.7.1;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";
import "./StFees.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/TransferLib.sol";
import "../Libs/LedgerLib.sol";
import "../Libs/Erc20Lib.sol";

/**
  * Manages ERC20 operations & data
  */
contract StErc20 is StFees
{
    StructLib.Erc20Struct erc20d;

    // ERC20 - OPTIONAL
    // StMaster: string public name();
    string public symbol;
    uint8 public decimals;

    constructor(string memory _symbol, uint8 _decimals) {
        symbol = _symbol;
        decimals = _decimals;

        // this index is used for allocating whitelist addresses to users (getWhitelistNext()))
        // we skip/reserve the first ten whitelisted address (0 = owner, 1-9 for expansion)
        erc20d._nextWhitelistNdx = 10;
    }

    // todo: move WL stuff out of erc20
    // WHITELIST - add entry & retreive full whitelist
    // function whitelist(address addr) public onlyOwner() {
    //     Erc20Lib.whitelist(ld, erc20d, addr);
    // }
    function whitelistMany(address[] memory addr) public onlyOwner() {
        for (uint256 i = 0; i < addr.length; i++) {
            Erc20Lib.whitelist(ld, erc20d, addr[i]);
        }
    }
    function getWhitelist() external view returns (address[] memory) {
        return erc20d._whitelist;
    }

    // 24k
    // function getWhitelistCount() external view returns (uint256) {
    //     return erc20d._whitelist.length;
    // }
    // function isWhitelisted(address addr) external view returns (bool) {
    //     return erc20d._whitelisted[addr];
    // }

    // WHITELIST - get next entry and advance ndx
    // function getWhitelistNext() external view returns (address) {
    //     return Erc20Lib.getWhitelistNext(ld, erc20d);
    // }
    // function incWhitelistNext() public onlyOwner() onlyWhenReadWrite() {
    //     Erc20Lib.incWhitelistNext(ld, erc20d);
    // }
    // function getWhitelistNextNdx() external view returns (uint256) { return erc20d._nextWhitelistNdx; }
    // function setWhitelistNextNdx(uint256 v) public onlyOwner() { erc20d._nextWhitelistNdx = v; }

    // ERC20 - CORE
    function totalSupply() public view returns (uint256) {
        return ld._spot_totalMintedQty - ld._spot_totalBurnedQty;
    }
    function balanceOf(address account) public view returns (uint256) {
        StructLib.LedgerReturn memory ret = LedgerLib.getLedgerEntry(ld, std, ctd, account);
        return ret.spot_sumQty;
    }
    function transfer(address recipient, uint256 amount) public returns (bool) {
        require(balanceOf(msg.sender) >= amount, "Insufficient tokens");

        return Erc20Lib.transfer(
            ld,
            std,
            ctd,
            globalFees,
            Erc20Lib.transferErc20Args({
                     owner: owner,
                 recipient: recipient,
                    amount: amount
            })
        );
    }

    // ERC20 - APPROVALS: NOP for now
    // would be needed for bonding curve implementation?
    // function allowance(address owner, address spender) public view returns (uint256) { return 0; }
    // function approve(address spender, uint256 amount) public returns (bool) { return false; }
    // function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) { return false; }
}