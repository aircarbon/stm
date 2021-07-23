# CcyLib.sol

View Source: [contracts/Libs/CcyLib.sol](../contracts/Libs/CcyLib.sol)

**CcyLib**

**Events**

```js
event AddedCcyType(uint256  id, string  name, string  unit);
event CcyFundedLedger(uint256  ccyTypeId, address indexed to, int256  amount, string  desc);
event CcyWithdrewLedger(uint256  ccyTypeId, address indexed from, int256  amount, string  desc);
```

## Functions

- [addCcyType(struct StructLib.LedgerStruct ld, struct StructLib.CcyTypesStruct ctd, string name, string unit, uint16 decimals)](#addccytype)
- [getCcyTypes(struct StructLib.CcyTypesStruct ctd)](#getccytypes)
- [fundOrWithdraw(struct StructLib.LedgerStruct ld, struct StructLib.CcyTypesStruct ctd, enum StructLib.FundWithdrawType direction, uint256 ccyTypeId, int256 amount, address ledgerOwner, string desc)](#fundorwithdraw)
- [fund(struct StructLib.LedgerStruct ld, struct StructLib.CcyTypesStruct ctd, uint256 ccyTypeId, int256 amount, address ledgerOwner, string desc)](#fund)
- [withdraw(struct StructLib.LedgerStruct ld, struct StructLib.CcyTypesStruct ctd, uint256 ccyTypeId, int256 amount, address ledgerOwner, string desc)](#withdraw)

### addCcyType

```js
function addCcyType(struct StructLib.LedgerStruct ld, struct StructLib.CcyTypesStruct ctd, string name, string unit, uint16 decimals) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| name | string |  | 
| unit | string |  | 
| decimals | uint16 |  | 

### getCcyTypes

```js
function getCcyTypes(struct StructLib.CcyTypesStruct ctd) public view
returns(struct StructLib.GetCcyTypesReturn)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ctd | struct StructLib.CcyTypesStruct |  | 

### fundOrWithdraw

```js
function fundOrWithdraw(struct StructLib.LedgerStruct ld, struct StructLib.CcyTypesStruct ctd, enum StructLib.FundWithdrawType direction, uint256 ccyTypeId, int256 amount, address ledgerOwner, string desc) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| direction | enum StructLib.FundWithdrawType |  | 
| ccyTypeId | uint256 |  | 
| amount | int256 |  | 
| ledgerOwner | address |  | 
| desc | string |  | 

### fund

```js
function fund(struct StructLib.LedgerStruct ld, struct StructLib.CcyTypesStruct ctd, uint256 ccyTypeId, int256 amount, address ledgerOwner, string desc) private nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| ccyTypeId | uint256 |  | 
| amount | int256 |  | 
| ledgerOwner | address |  | 
| desc | string |  | 

### withdraw

```js
function withdraw(struct StructLib.LedgerStruct ld, struct StructLib.CcyTypesStruct ctd, uint256 ccyTypeId, int256 amount, address ledgerOwner, string desc) private nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| ccyTypeId | uint256 |  | 
| amount | int256 |  | 
| ledgerOwner | address |  | 
| desc | string |  | 

## Contracts

* [CcyLib](./CcyLib.md)
* [Collateralizable](./Collateralizable.md)
* [DataLoadable](./DataLoadable.md)
* [Erc20Lib](./Erc20Lib.md)
* [FuturesLib](./FuturesLib.md)
* [IChainlinkAggregator](./IChainlinkAggregator.md)
* [LedgerLib](./LedgerLib.md)
* [LoadLib](./LoadLib.md)
* [Migrations](./Migrations.md)
* [Owned](./Owned.md)
* [PayableLib](./PayableLib.md)
* [SafeMath](./SafeMath.md)
* [SpotFeeLib](./SpotFeeLib.md)
* [StBurnable](./StBurnable.md)
* [StErc20](./StErc20.md)
* [StFees](./StFees.md)
* [StFutures](./StFutures.md)
* [StLedger](./StLedger.md)
* [StMaster](./StMaster.md)
* [StMintable](./StMintable.md)
* [StPayable](./StPayable.md)
* [strings](./strings.md)
* [StructLib](./StructLib.md)
* [StTransferable](./StTransferable.md)
* [TokenLib](./TokenLib.md)
* [TransferLib](./TransferLib.md)
