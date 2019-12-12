pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/IERC20.sol";

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
contract StErc20 is Owned, StLedger, StFees, IERC20 {

    StructLib.Erc20Struct erc20Data;

    // ERC20 - OPTIONAL
    // stMaster: string public name();
    string public symbol;
    uint8 public decimals;

    constructor(string memory _symbol, uint8 _decimals) public {
        symbol = _symbol;
        decimals = _decimals;
    }

    // WHITELIST
    function seal() public {
        Erc20Lib.seal(erc20Data);
    }
    function whitelist(address addr) public {
        Erc20Lib.whitelist(erc20Data, addr);
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
        if (erc20Data._whitelisted[recipient])
            require(msg.sender == owner, "Restricted");
        else
            require(msg.sender == recipient, "Restricted");

        // ### NEED A TYPE-AGNOSITC / WRAPPER FOR TRANSFERRING *ANY* TYPE ... ###
        // getLedgerEntry to return grouped (type => qty)
        // then can iterate over each type and do internal transfers
        //StructLib.LedgerReturn memory le = LedgerLib.getLedgerEntry(ledgerData, stTypesData, ccyTypesData, account);

        // TransferLib.TransferArgs memory a = TransferLib.TransferArgs({
        //         ledger_A: msg.sender,
        //         ledger_B: recipient,
        //         qty_A: ...
        // tokenTypeId_A: ######
        //     uint256 qty_B;           // ST quantity moving from B (excluding fees, if any)
        //     uint256 tokenTypeId_B;   // ST type moving from B
        //     int256  ccy_amount_A;    // currency amount moving from A (excluding fees, if any)
        //     uint256 ccyTypeId_A;     // currency type moving from A
        //     int256  ccy_amount_B;    // currency amount moving from B (excluding fees, if any)
        //     uint256 ccyTypeId_B;     // currency type moving from B
        //     bool    applyFees;       // apply global fee structure to the transfer (both legs)
        //     address feeAddrOwner;    // exchange fees: receive address
        //     bool    previewFees;     // true to return a fee preview for the transfer, false to execute the transfer
        // });
        // TransferLib.transfer(ledgerData, globalFees, a);

        return true;
    }

    // ERC20 - APPROVALS: NOP for now
    function allowance(address owner, address spender) public view returns (uint256) { return 0; }
    function approve(address spender, uint256 amount) public returns (bool) { return false; }
    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) { return false; }
}