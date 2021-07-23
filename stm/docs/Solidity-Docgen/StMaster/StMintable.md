# StMintable.sol

View Source: [contracts/StMaster/StMintable.sol](../contracts/StMaster/StMintable.sol)

**↗ Extends: [Owned](Owned.md), [StLedger](StLedger.md)**
**↘ Derived Contracts: [StMaster](StMaster.md)**

**StMintable**

## Functions

- [mintSecTokenBatch(uint256 tokTypeId, uint256 mintQty, int64 mintSecTokenCount, address payable batchOwner, struct StructLib.SetFeeArgs originatorFee, uint16 origCcyFee_percBips_ExFee, string[] metaKeys, string[] metaValues)](#mintsectokenbatch)
- [addMetaSecTokenBatch(uint64 batchId, string metaKeyNew, string metaValueNew)](#addmetasectokenbatch)
- [setOriginatorFeeTokenBatch(uint64 batchId, struct StructLib.SetFeeArgs originatorFee)](#setoriginatorfeetokenbatch)
- [setOriginatorFeeCurrencyBatch(uint64 batchId, uint16 origCcyFee_percBips_ExFee)](#setoriginatorfeecurrencybatch)
- [getSecToken_totalMintedQty()](#getsectoken_totalmintedqty)

### mintSecTokenBatch

```js
function mintSecTokenBatch(uint256 tokTypeId, uint256 mintQty, int64 mintSecTokenCount, address payable batchOwner, struct StructLib.SetFeeArgs originatorFee, uint16 origCcyFee_percBips_ExFee, string[] metaKeys, string[] metaValues) public nonpayable onlyOwner onlyWhenReadWrite 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| tokTypeId | uint256 |  | 
| mintQty | uint256 |  | 
| mintSecTokenCount | int64 |  | 
| batchOwner | address payable |  | 
| originatorFee | struct StructLib.SetFeeArgs |  | 
| origCcyFee_percBips_ExFee | uint16 |  | 
| metaKeys | string[] |  | 
| metaValues | string[] |  | 

### addMetaSecTokenBatch

```js
function addMetaSecTokenBatch(uint64 batchId, string metaKeyNew, string metaValueNew) external nonpayable onlyOwner onlyWhenReadWrite 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| batchId | uint64 |  | 
| metaKeyNew | string |  | 
| metaValueNew | string |  | 

### setOriginatorFeeTokenBatch

```js
function setOriginatorFeeTokenBatch(uint64 batchId, struct StructLib.SetFeeArgs originatorFee) external nonpayable onlyOwner onlyWhenReadWrite 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| batchId | uint64 |  | 
| originatorFee | struct StructLib.SetFeeArgs |  | 

### setOriginatorFeeCurrencyBatch

```js
function setOriginatorFeeCurrencyBatch(uint64 batchId, uint16 origCcyFee_percBips_ExFee) external nonpayable onlyOwner onlyWhenReadWrite 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| batchId | uint64 |  | 
| origCcyFee_percBips_ExFee | uint16 |  | 

### getSecToken_totalMintedQty

```js
function getSecToken_totalMintedQty() external view
returns(uint256)
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
