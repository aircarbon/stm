
pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "./StFees.sol";

import "../Libs/LedgerLib.sol";
import "../Libs/StructLib.sol";
import "../Libs/PayableLib.sol";

import "../Interfaces/IAggregatorInterface.sol";

contract StPayable is StFees {

    StructLib.CashflowStruct cashflowData;

    // Chainlink
    address public chainlinkAggregator_btcUsd;
    address public chainlinkAggregator_ethUsd;
    function get_btcUsd() public view returns(int256) {
        if (chainlinkAggregator_btcUsd == address(0x0)) return 100000000; // $1 - cents*satoshis
        AggregatorInterface ref = AggregatorInterface(chainlinkAggregator_btcUsd);
        return ref.latestAnswer();
    }
    function get_ethUsd() public view returns(int256) {
        if (chainlinkAggregator_ethUsd == address(0x0)) return 100000000; // $1 - cents*satoshis
        AggregatorInterface ref = AggregatorInterface(chainlinkAggregator_ethUsd);
        return ref.latestAnswer();
    }

    /**
     * @dev Handles
     *   (1) issuer payments (bond interest payments & principal repayments, and equity dividend payments)
     *   (2) subscriber payments
     */
    function() external payable onlyWhenReadWrite() {
        PayableLib.pay(ledgerData, cashflowData, globalFees, owner, get_ethUsd());
    }

    /**
     * @dev Sets values for the issuance:
     *   (wei_currentPrice XOR cents_currentPrice) -- price per token: write-once for BOND, write-many for EQUITY
     *    qty_saleAllocation                       -- sale allocation: must be >= current qty subscribed, and <= total monobatch size
     */
    function setIssuerValues(
        // address issuer,
        // StructLib.SetFeeArgs memory originatorFee,
        uint256 wei_currentPrice,
        uint256 cents_currentPrice,
        uint256 qty_saleAllocation
    ) external onlyWhenReadWrite() {
        PayableLib.setIssuerValues(
            ledgerData,
            cashflowData,
            wei_currentPrice,
            cents_currentPrice,
            qty_saleAllocation
        );
    }

    /**
     * @dev Returns cashflow data
     */
    function getCashflowData() public view returns(StructLib.CashflowStruct memory) {
        return PayableLib.getCashflowData(ledgerData, cashflowData);
    }
}