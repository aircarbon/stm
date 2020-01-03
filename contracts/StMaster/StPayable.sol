
pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./StFees.sol";

import "../Libs/LedgerLib.sol";
import "../Libs/StructLib.sol";
import "../Libs/PayableLib.sol";

contract StPayable is StFees {

    StructLib.CashflowStruct cashflowData;

    function() external payable onlyWhenReadWrite() {
        PayableLib.pay(ledgerData, cashflowData, globalFees, owner);
    }

    /**
     * @dev Returns cashflow data
     */
    function getCashflowData() public view returns(StructLib.CashflowStruct memory) {
        return cashflowData;
    }
}