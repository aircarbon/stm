# Erc20Lib.sol

View Source: [contracts/Libs/Erc20Lib.sol](../contracts/Libs/Erc20Lib.sol)

**Erc20Lib**

## Structs
### transferErc20Args

```js
struct transferErc20Args {
 address deploymentOwner,
 address recipient,
 uint256 amount
}
```

## Contract Members
**Constants & Variables**

```js
uint256 private constant MAX_UINT256;

```

**Events**

```js
event Transfer(address indexed from, address indexed to, uint256  value);
event Approval(address indexed owner, address indexed spender, uint256  value);
```

## Functions

- [whitelist(struct StructLib.LedgerStruct ld, struct StructLib.Erc20Struct erc20d, address addr)](#whitelist)
- [transfer(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.FeeStruct globalFees, struct Erc20Lib.transferErc20Args a)](#transfer)
- [approve(struct StructLib.LedgerStruct ld, struct StructLib.Erc20Struct erc20d, address spender, uint256 amount)](#approve)
- [transferFrom(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.FeeStruct globalFees, struct StructLib.Erc20Struct erc20d, address sender, struct Erc20Lib.transferErc20Args a)](#transferfrom)
- [transferInternal(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.FeeStruct globalFees, address sender, struct Erc20Lib.transferErc20Args a)](#transferinternal)

### whitelist

```js
function whitelist(struct StructLib.LedgerStruct ld, struct StructLib.Erc20Struct erc20d, address addr) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| erc20d | struct StructLib.Erc20Struct |  | 
| addr | address |  | 

### transfer

```js
function transfer(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.FeeStruct globalFees, struct Erc20Lib.transferErc20Args a) public nonpayable
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| globalFees | struct StructLib.FeeStruct |  | 
| a | struct Erc20Lib.transferErc20Args |  | 

### approve

```js
function approve(struct StructLib.LedgerStruct ld, struct StructLib.Erc20Struct erc20d, address spender, uint256 amount) public nonpayable
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| erc20d | struct StructLib.Erc20Struct |  | 
| spender | address |  | 
| amount | uint256 |  | 

### transferFrom

```js
function transferFrom(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.FeeStruct globalFees, struct StructLib.Erc20Struct erc20d, address sender, struct Erc20Lib.transferErc20Args a) public nonpayable
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| globalFees | struct StructLib.FeeStruct |  | 
| erc20d | struct StructLib.Erc20Struct |  | 
| sender | address |  | 
| a | struct Erc20Lib.transferErc20Args |  | 

### transferInternal

```js
function transferInternal(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.FeeStruct globalFees, address sender, struct Erc20Lib.transferErc20Args a) private nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| globalFees | struct StructLib.FeeStruct |  | 
| sender | address |  | 
| a | struct Erc20Lib.transferErc20Args |  | 

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
