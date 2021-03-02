# Owned.sol

View Source: [contracts/StMaster/Owned.sol](../contracts/StMaster/Owned.sol)

**↘ Derived Contracts: [Collateralizable](Collateralizable.md), [DataLoadable](DataLoadable.md), [StBurnable](StBurnable.md), [StFees](StFees.md), [StFutures](StFutures.md), [StLedger](StLedger.md), [StMintable](StMintable.md), [StTransferable](StTransferable.md)**

**Owned**

## Contract Members
**Constants & Variables**

```js
address payable internal deploymentOwner;
address[] internal owners;
bool internal readOnlyState;

```

## Modifiers

- [onlyOwner](#onlyowner)
- [onlyWhenReadWrite](#onlywhenreadwrite)

### onlyOwner

```js
modifier onlyOwner() internal
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### onlyWhenReadWrite

```js
modifier onlyWhenReadWrite() internal
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

## Functions

- [readOnly()](#readonly)
- [()](#)
- [getOwners()](#getowners)
- [setReadOnly(bool readOnlyNewState)](#setreadonly)

### readOnly

```js
function readOnly() external view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### 

```js
function () public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### getOwners

```js
function getOwners() external view
returns(address[])
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### setReadOnly

```js
function setReadOnly(bool readOnlyNewState) external nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| readOnlyNewState | bool |  | 

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
