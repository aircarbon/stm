
pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/IStPayable.sol";

import "./StFees.sol";

import "../Libs/LedgerLib.sol";
import "../Interfaces/StructLib.sol";
import "../Libs/PayableLib.sol";

import "../Interfaces/IChainlinkAggregator.sol";

contract StPayable is
    IStPayable,
    StFees {

    StructLib.CashflowStruct cashflowData;

    // Chainlink
    address public chainlinkAggregator_btcUsd;
    address public chainlinkAggregator_ethUsd;

    function get_btcUsd() public view returns(int256) {
        if (chainlinkAggregator_btcUsd == address(0x0)) return 100000000; // $1 - cents*satoshis
        IChainlinkAggregator ref = IChainlinkAggregator(chainlinkAggregator_btcUsd);
        return ref.latestAnswer();
    }
    function get_ethUsd() public view returns(int256) {
        if (chainlinkAggregator_ethUsd == address(0x0)) return 100000000; // $1 - cents*satoshis
        IChainlinkAggregator ref = IChainlinkAggregator(chainlinkAggregator_ethUsd);
        return ref.latestAnswer();
    }

    function() external payable onlyWhenReadWrite() {
        PayableLib.pay(ledgerData, cashflowData, globalFees, owner, get_ethUsd());
    }

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

    function getCashflowData() public view returns(StructLib.CashflowStruct memory) {
        return PayableLib.getCashflowData(ledgerData, cashflowData);
    }
}