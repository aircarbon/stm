# StLedger.sol

View Source: [contracts/StMaster/StLedger.sol](../contracts/StMaster/StLedger.sol)

**↗ Extends: [Owned](Owned.md)**
**↘ Derived Contracts: [Collateralizable](Collateralizable.md), [DataLoadable](DataLoadable.md), [StBurnable](StBurnable.md), [StFees](StFees.md), [StFutures](StFutures.md), [StMintable](StMintable.md), [StTransferable](StTransferable.md)**

**StLedger**

## Contract Members
**Constants & Variables**

```js
struct StructLib.LedgerStruct internal ld;
struct StructLib.StTypesStruct internal std;
struct StructLib.CcyTypesStruct internal ctd;

```

## Functions

- [addSecTokenType(string name, enum StructLib.SettlementType settlementType, struct StructLib.FutureTokenTypeArgs ft, address payable cashflowBaseAddr)](#addsectokentype)
- [getSecTokenTypes()](#getsectokentypes)
- [getLedgerOwners()](#getledgerowners)
- [getLedgerOwnerCount()](#getledgerownercount)
- [getLedgerOwner(uint256 index)](#getledgerowner)
- [getLedgerEntry(address account)](#getledgerentry)
- [getSecTokenBatch_MaxId()](#getsectokenbatch_maxid)
- [getSecTokenBatch(uint256 batchId)](#getsectokenbatch)
- [getSecToken_BaseId()](#getsectoken_baseid)
- [getSecToken_MaxId()](#getsectoken_maxid)
- [getSecToken(uint256 id)](#getsectoken)

### addSecTokenType

```js
function addSecTokenType(string name, enum StructLib.SettlementType settlementType, struct StructLib.FutureTokenTypeArgs ft, address payable cashflowBaseAddr) public nonpayable onlyOwner onlyWhenReadWrite 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| name | string |  | 
| settlementType | enum StructLib.SettlementType |  | 
| ft | struct StructLib.FutureTokenTypeArgs |  | 
| cashflowBaseAddr | address payable |  | 

### getSecTokenTypes

```js
function getSecTokenTypes() external view
returns(struct StructLib.GetSecTokenTypesReturn)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### getLedgerOwners

```js
function getLedgerOwners() external view
returns(address[])
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### getLedgerOwnerCount

```js
function getLedgerOwnerCount() external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### getLedgerOwner

```js
function getLedgerOwner(uint256 index) external view
returns(address)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| index | uint256 |  | 

### getLedgerEntry

```js
function getLedgerEntry(address account) external view
returns(struct StructLib.LedgerReturn)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| account | address |  | 

### getSecTokenBatch_MaxId

```js
function getSecTokenBatch_MaxId() external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### getSecTokenBatch

```js
function getSecTokenBatch(uint256 batchId) external view
returns(struct StructLib.SecTokenBatch)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| batchId | uint256 |  | 

### getSecToken_BaseId

```js
function getSecToken_BaseId() external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### getSecToken_MaxId

```js
function getSecToken_MaxId() external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### getSecToken

```js
function getSecToken(uint256 id) external view
returns(struct StructLib.LedgerSecTokenReturn)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| id | uint256 |  | 

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
