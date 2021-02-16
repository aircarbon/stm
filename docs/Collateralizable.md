# Collateralizable.sol

View Source: [contracts/StMaster/CcyCollateralizable.sol](../contracts/StMaster/CcyCollateralizable.sol)

**↗ Extends: [Owned](Owned.md), [StLedger](StLedger.md)**
**↘ Derived Contracts: [StMaster](StMaster.md)**

**Collateralizable**

## Functions

- [addCcyType(string name, string unit, uint16 decimals)](#addccytype)
- [getCcyTypes()](#getccytypes)
- [fundOrWithdraw(enum StructLib.FundWithdrawType direction, uint256 ccyTypeId, int256 amount, address ledgerOwner, string desc)](#fundorwithdraw)

### addCcyType

```js
function addCcyType(string name, string unit, uint16 decimals) public nonpayable onlyOwner onlyWhenReadWrite 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| name | string |  | 
| unit | string |  | 
| decimals | uint16 |  | 

### getCcyTypes

```js
function getCcyTypes() external view
returns(struct StructLib.GetCcyTypesReturn)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### fundOrWithdraw

```js
function fundOrWithdraw(enum StructLib.FundWithdrawType direction, uint256 ccyTypeId, int256 amount, address ledgerOwner, string desc) public nonpayable onlyOwner onlyWhenReadWrite 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| direction | enum StructLib.FundWithdrawType |  | 
| ccyTypeId | uint256 |  | 
| amount | int256 |  | 
| ledgerOwner | address |  | 
| desc | string |  | 

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
