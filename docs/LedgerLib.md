# LedgerLib.sol

View Source: [contracts/Libs/LedgerLib.sol](../contracts/Libs/LedgerLib.sol)

**LedgerLib**

## Structs
### GetLedgerEntryVars

```js
struct GetLedgerEntryVars {
 struct StructLib.LedgerSecTokenReturn[] tokens,
 struct StructLib.LedgerCcyReturn[] ccys,
 uint256 spot_sumQty
}
```

### ConsistencyCheck

```js
struct ConsistencyCheck {
 uint256 totalCur,
 uint256 totalMinted,
 uint256 totalTokensOnLedger
}
```

## Functions

- [getLedgerEntry(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, address account)](#getledgerentry)
- [getLedgerHashcode(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.Erc20Struct erc20d, struct StructLib.FeeStruct globalFees, uint256 mod, uint256 n)](#getledgerhashcode)
- [hashStringArray(string[] strings)](#hashstringarray)
- [hashSetFeeArgs(struct StructLib.SetFeeArgs setFeeArgs)](#hashsetfeeargs)

### getLedgerEntry

```js
function getLedgerEntry(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, address account) public view
returns(struct StructLib.LedgerReturn)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| account | address |  | 

### getLedgerHashcode

```js
function getLedgerHashcode(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.Erc20Struct erc20d, struct StructLib.FeeStruct globalFees, uint256 mod, uint256 n) public view
returns(bytes32)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| erc20d | struct StructLib.Erc20Struct |  | 
| globalFees | struct StructLib.FeeStruct |  | 
| mod | uint256 |  | 
| n | uint256 |  | 

### hashStringArray

```js
function hashStringArray(string[] strings) private pure
returns(bytes32)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| strings | string[] |  | 

### hashSetFeeArgs

```js
function hashSetFeeArgs(struct StructLib.SetFeeArgs setFeeArgs) private pure
returns(bytes32)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| setFeeArgs | struct StructLib.SetFeeArgs |  | 

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
