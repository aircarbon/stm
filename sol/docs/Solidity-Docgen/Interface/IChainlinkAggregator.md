# IChainlinkAggregator.sol

View Source: [contracts/Interfaces/IChainlinkAggregator.sol](../contracts/Interfaces/IChainlinkAggregator.sol)

**IChainlinkAggregator**

**Events**

```js
event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256  timestamp);
event NewRound(uint256 indexed roundId, address indexed startedBy);
```

## Functions

- [latestAnswer()](#latestanswer)
- [latestTimestamp()](#latesttimestamp)
- [latestRound()](#latestround)
- [getAnswer(uint256 roundId)](#getanswer)
- [getTimestamp(uint256 roundId)](#gettimestamp)

### latestAnswer

```js
function latestAnswer() external view
returns(int256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### latestTimestamp

```js
function latestTimestamp() external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### latestRound

```js
function latestRound() external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### getAnswer

```js
function getAnswer(uint256 roundId) external view
returns(int256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| roundId | uint256 |  | 

### getTimestamp

```js
function getTimestamp(uint256 roundId) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| roundId | uint256 |  | 

## Contracts

* [CcyLib](CcyLib.md)
* [Collateralizable](Collateralizable.md)
* [DataLoadable](DataLoadable.md)
* [Erc20Lib](Erc20Lib.md)
* [FuturesLib](FuturesLib.md)
* [IChainlinkAggregator](IChainlinkAggregator.md)
* [LedgerLib](LedgerLib.md)
* [LoadLib](LoadLib.md)
* [Migrations](Migrations.md)
* [Owned](Owned.md)
* [PayableLib](PayableLib.md)
* [SafeMath](SafeMath.md)
* [SpotFeeLib](SpotFeeLib.md)
* [StBurnable](StBurnable.md)
* [StErc20](StErc20.md)
* [StFees](StFees.md)
* [StFutures](StFutures.md)
* [StLedger](StLedger.md)
* [StMaster](StMaster.md)
* [StMintable](StMintable.md)
* [StPayable](StPayable.md)
* [strings](strings.md)
* [StructLib](StructLib.md)
* [StTransferable](StTransferable.md)
* [TokenLib](TokenLib.md)
* [TransferLib](TransferLib.md)
