pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/IErc20.sol";

import "./Owned.sol";
import "./StLedger.sol";
import "./StTypes.sol";
import "./CcyTypes.sol";
import "./StFees.sol";

import "../Libs/StructLib.sol";
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

    constructor(string memory _symbol, uint8 _decimals) public {
        symbol = _symbol;
        decimals = _decimals;
    }

    // WHITELIST
    function whitelist(address addr) public {
        Erc20Lib.whitelist(ledgerData, erc20Data, addr);
    }
    function getWhitelist() external view returns (address[] memory) {
        return erc20Data._whitelist;
    }

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
    function allowance(address owner, address spender) public view returns (uint256) { return 0; }
    function approve(address spender, uint256 amount) public returns (bool) { return false; }
    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) { return false; }
}