
pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/LedgerLib.sol";
import "../Libs/StructLib.sol";
import "../Libs/PayableLib.sol";

contract StPayable is Owned, StLedger {

    StructLib.CashflowStruct cashflowData;

    function () external payable {
        // cashflow v1: single subscriber, single issuance
        //... switch sender
    }

    /**
     * @dev Returns cashflow data
     */
    function getCashflowData() public view returns(StructLib.CashflowStruct memory) {
        return cashflowData;
    }
}