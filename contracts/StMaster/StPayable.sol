
pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "./StFees.sol";

import "../Libs/LedgerLib.sol";
import "../Libs/StructLib.sol";
import "../Libs/PayableLib.sol";

contract StPayable is StFees {

    StructLib.CashflowStruct cashflowData;

    /**
     * @dev Handles
     *   (1) issuer payments (bond interest payments & principal repayments, and equity dividend payments)
     *   (2) subscriber payments
     */
    function setIssuerValues(
        // address issuer,
        // StructLib.SetFeeArgs memory originatorFee,
        //uint256 qty_issuanceMax,
        uint256 wei_currentPrice,
        uint256 qty_saleAllocation
    ) external onlyWhenReadWrite() {
        PayableLib.setIssuerValues(
            ledgerData,
            cashflowData,
            //qty_issuanceMax,
            wei_currentPrice, qty_saleAllocation
        );
    }

    /**
     * @dev Handles
     *   (1) issuer payments (bond interest payments & principal repayments, and equity dividend payments)
     *   (2) subscriber payments
     */
    function() external payable onlyWhenReadWrite() {
        PayableLib.pay(ledgerData, cashflowData, globalFees, owner);
    }

    /**
     * @dev Returns cashflow data
     */
    function getCashflowData() public view returns(StructLib.CashflowStruct memory) {
        return PayableLib.getCashflowData(ledgerData, cashflowData);
    }
}