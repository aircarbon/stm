# StTransferable.sol

View Source: [contracts/StMaster/StTransferable.sol](../contracts/StMaster/StTransferable.sol)

**↗ Extends: [Owned](Owned.md), [StLedger](StLedger.md), [StFees](StFees.md), [StErc20](StErc20.md), [StPayable](StPayable.md)**
**↘ Derived Contracts: [StMaster](StMaster.md)**

**StTransferable**

## Contract Members
**Constants & Variables**

```js
uint256 internal constant MAX_BATCHES_PREVIEW;

```

## Functions

- [getLedgerHashcode(uint256 mod, uint256 n)](#getledgerhashcode)
- [transferOrTrade(struct StructLib.TransferArgs a)](#transferortrade)
- [transfer_feePreview_ExchangeOnly(struct StructLib.TransferArgs a)](#transfer_feepreview_exchangeonly)
- [transfer_feePreview(struct StructLib.TransferArgs a)](#transfer_feepreview)

### getLedgerHashcode

```js
function getLedgerHashcode(uint256 mod, uint256 n) external view
returns(bytes32)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| mod | uint256 |  | 
| n | uint256 |  | 

### transferOrTrade

```js
function transferOrTrade(struct StructLib.TransferArgs a) public nonpayable onlyOwner onlyWhenReadWrite 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | struct StructLib.TransferArgs |  | 

### transfer_feePreview_ExchangeOnly

```js
function transfer_feePreview_ExchangeOnly(struct StructLib.TransferArgs a) external view
returns(feesAll struct StructLib.FeesCalc[1])
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | struct StructLib.TransferArgs |  | 

### transfer_feePreview

```js
function transfer_feePreview(struct StructLib.TransferArgs a) external view
returns(feesAll struct StructLib.FeesCalc[257])
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | struct StructLib.TransferArgs |  | 

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
