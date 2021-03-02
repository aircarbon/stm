# StFees.sol

View Source: [contracts/StMaster/StFees.sol](../contracts/StMaster/StFees.sol)

**↗ Extends: [Owned](Owned.md), [StLedger](StLedger.md)**
**↘ Derived Contracts: [DataLoadable](DataLoadable.md), [StErc20](StErc20.md), [StFutures](StFutures.md), [StTransferable](StTransferable.md)**

**StFees**

**Enums**
### GetFeeType

```js
enum GetFeeType {
 CCY,
 TOK
}
```

## Contract Members
**Constants & Variables**

```js
struct StructLib.FeeStruct internal globalFees;

```

## Functions

- [getFee(enum StFees.GetFeeType feeType, uint256 typeId, address ledgerOwner)](#getfee)
- [setFee_TokType(uint256 tokTypeId, address ledgerOwner, struct StructLib.SetFeeArgs feeArgs)](#setfee_toktype)
- [setFee_CcyType(uint256 ccyTypeId, address ledgerOwner, struct StructLib.SetFeeArgs feeArgs)](#setfee_ccytype)

### getFee

```js
function getFee(enum StFees.GetFeeType feeType, uint256 typeId, address ledgerOwner) external view onlyOwner 
returns(struct StructLib.SetFeeArgs)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| feeType | enum StFees.GetFeeType |  | 
| typeId | uint256 |  | 
| ledgerOwner | address |  | 

### setFee_TokType

```js
function setFee_TokType(uint256 tokTypeId, address ledgerOwner, struct StructLib.SetFeeArgs feeArgs) public nonpayable onlyOwner onlyWhenReadWrite 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| tokTypeId | uint256 |  | 
| ledgerOwner | address |  | 
| feeArgs | struct StructLib.SetFeeArgs |  | 

### setFee_CcyType

```js
function setFee_CcyType(uint256 ccyTypeId, address ledgerOwner, struct StructLib.SetFeeArgs feeArgs) public nonpayable onlyOwner onlyWhenReadWrite 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ccyTypeId | uint256 |  | 
| ledgerOwner | address |  | 
| feeArgs | struct StructLib.SetFeeArgs |  | 

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
