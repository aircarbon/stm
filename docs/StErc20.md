# StErc20.sol

View Source: [contracts/StMaster/StErc20.sol](../contracts/StMaster/StErc20.sol)

**↗ Extends: [StFees](StFees.md)**
**↘ Derived Contracts: [DataLoadable](DataLoadable.md), [StFutures](StFutures.md), [StPayable](StPayable.md), [StTransferable](StTransferable.md)**

**StErc20**

## Contract Members
**Constants & Variables**

```js
struct StructLib.Erc20Struct internal erc20d;

```

## Functions

- [whitelistMany(address[] addr)](#whitelistmany)
- [getWhitelist()](#getwhitelist)

### whitelistMany

```js
function whitelistMany(address[] addr) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| addr | address[] |  | 

### getWhitelist

```js
function getWhitelist() external view
returns(address[])
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

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
