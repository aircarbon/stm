
pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "./IOwned.sol";

import "../Libs/LedgerLib.sol";
import "../Libs/StructLib.sol";
import "../Libs/PayableLib.sol";

/**
 * @notice Controls payment flows through the contract's default payable method
 * @dev Only applicable for CASFHLOW-type contract instances
 */
 contract IStPayable is IOwned {

    /**
     * @notice Returns current BTC/USD rate according to Chainlink reference data contract
     */
    function get_btcUsd() public view returns(int256) { revert("Not implemented"); }

    /**
     * @notice Returns current ETH/USD rate according to Chainlink reference data contract
     */
    function get_ethUsd() public view returns(int256) { revert("Not implemented"); }

    /**
     * @notice Handles (1) subscriber payments and (2) issuer payments (bond interest payments & principal repayments, and equity dividend payments)
     */
    function() external payable onlyWhenReadWrite() { revert("Not implemented"); }

    /**
     * @notice Sets current values for the issuance
     * @dev (wei_currentPrice XOR cents_currentPrice) -- price per token: write-once for BOND, write-many for EQUITY
     * @dev qty_saleAllocation                        -- sale allocation: must be >= current qty subscribed, and <= total monobatch size
     */
    function setIssuerValues(
        // address issuer,
        // StructLib.SetFeeArgs memory originatorFee,
        uint256 wei_currentPrice,
        uint256 cents_currentPrice,
        uint256 qty_saleAllocation
    ) external onlyWhenReadWrite() { revert("Not implemented"); }

    /**
     * @notice Returns cashflow data
     */
    function getCashflowData() public view returns(StructLib.CashflowStruct memory) { revert("Not implemented"); }
}