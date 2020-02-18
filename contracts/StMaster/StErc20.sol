pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/IErc20.sol";

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
contract StErc20 is StFees, IErc20 {

    StructLib.Erc20Struct erc20Data;

    // ERC20 - OPTIONAL
    // StMaster: string public name();
    string public symbol;
    uint8 public decimals;

    constructor(string memory _symbol, uint8 _decimals) internal {
        symbol = _symbol;
        decimals = _decimals;

        // this index is used for allocating whitelist addresses to users (getWhitelistNext()))
        // we skip/reserve the first ten whitelisted address (0 = owner, 1-9 for expansion)
        erc20Data._nextWhitelistNdx = 10;
    }

    //
    // TODO: ### data-load setter for erc20Data._nextWhitelistNdx ###
    //       move WL stuff out of erc20
    //
    // WHITELIST - add entry & retreive full whitelist
    function whitelist(address addr) public onlyOwner() {
        Erc20Lib.whitelist(ledgerData, erc20Data, addr);
    }
    function getWhitelist() external view returns (address[] memory) {
        return erc20Data._whitelist;
    }
    // WHITELIST - get next entry and advance ndx
    function getWhitelistNext() external view returns (address) {
        return Erc20Lib.getWhitelistNext(ledgerData, erc20Data);
    }
    function incWhitelistNext() public onlyOwner() onlyWhenReadWrite() {
        Erc20Lib.incWhitelistNext(ledgerData, erc20Data);
    }
    function getWhitelistNextNdx() external view returns (uint256) { return erc20Data._nextWhitelistNdx; }

    // ERC20 - CORE
    function totalSupply() public view returns (uint256) {
        return ledgerData._tokens_totalMintedQty - ledgerData._tokens_totalBurnedQty;
    }
    function balanceOf(address account) public view returns (uint256) {
        StructLib.LedgerReturn memory ret = LedgerLib.getLedgerEntry(ledgerData, stTypesData, ccyTypesData, account);
        return ret.tokens_sumQty;
    }
    function transfer(address recipient, uint256 amount) public returns (bool) {
        require(balanceOf(msg.sender) >= amount, "Insufficient tokens");

        return Erc20Lib.transfer(
            ledgerData,
            stTypesData,
            globalFees,
            owner,
            recipient, amount // erc20 args
        );
    }

    // ERC20 - APPROVALS: NOP for now
    // would be needed for bonding curve implementation?
    // function allowance(address owner, address spender) public view returns (uint256) { return 0; }
    // function approve(address spender, uint256 amount) public returns (bool) { return false; }
    // function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) { return false; }
}