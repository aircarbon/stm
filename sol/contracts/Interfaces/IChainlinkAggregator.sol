// SPDX-License-Identifier: AGPL-3.0-only
// Author: @ankurdaharwal
// Certik (AD): locked compiler version
pragma solidity 0.8.5;

/**
 * @notice Chainlink Reference Data Contract
 * @dev https://docs.chain.link/docs/using-chainlink-reference-contracts
 */
// https://github.com/smartcontractkit/chainlink/blob/master/evm-contracts/src/v0.8/interfaces/AggregatorV3Interface.sol

// Certik: (Major) ICA-01 | Incorrect Chainlink Interface
// Resolved: (Major) ICA-01 | Upgraded Chainlink Aggregator Interface to V3


interface IChainlinkAggregator {
  function decimals() external view returns (uint8);
  function description() external view returns (string memory);
  function version() external view returns (uint256);

  // getRoundData and latestRoundData should both raise "No data present"
  // if they do not have data to report, instead of returning unset values
  // which could be misinterpreted as actual reported values.
  function getRoundData(uint80 _roundId) external view returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    );

  function latestRoundData() external view returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    );
}