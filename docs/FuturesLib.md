# FuturesLib.sol

View Source: [contracts/Libs/FuturesLib.sol](../contracts/Libs/FuturesLib.sol)

**FuturesLib**

## Structs
### OpenPosVars

```js
struct OpenPosVars {
 int256 posSize,
 int256 fee_A,
 int256 fee_B,
 int256 marginRequired_A,
 int256 marginRequired_B,
 int256 newReserved_A,
 int256 newReserved_B,
 uint256 newId_A,
 uint256 newId_B
}
```

### TakePayVars2

```js
struct TakePayVars2 {
 struct StructLib.PackedSt st,
 int256 delta,
 int256 bal,
 int256 fee,
 int256 take
}
```

**Events**

```js
event FutureOpenInterest(address indexed long, address indexed short, uint256  shortStId, uint256  tokTypeId, uint256  qty, uint256  price, uint256  feeLong, uint256  feeShort);
event SetInitialMarginOverride(uint256  tokTypeId, address indexed ledgerOwner, uint16  initMarginBips);
event SetFeePerContractOverride(uint256  tokTypeId, address indexed ledgerOwner, uint128  feePerContract);
event TakePay2(address indexed from, address indexed to, uint256  ccyId, uint256  delta, uint256  done, uint256  fee);
event Combine(address indexed to, uint256  masterStId, uint256  countTokensCombined);
```

## Functions

- [setLedgerOverride(uint256 overrideType, struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, uint256 tokTypeId, address ledgerOwner, uint128 value)](#setledgeroverride)
- [initMarginOverride(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, uint256 tokTypeId, address ledgerOwner, uint16 initMarginBips)](#initmarginoverride)
- [feePerContractOverride(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, uint256 tokTypeId, address ledgerOwner, uint128 feePerContract)](#feepercontractoverride)
- [openFtPos(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.FuturesPositionArgs a, address owner)](#openftpos)
- [takePay2(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.TakePayArgs2 a)](#takepay2)
- [combineFtPos(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CombinePositionArgs a)](#combineftpos)
- [calcTakePay(struct StructLib.FutureTokenTypeArgs fta, struct StructLib.PackedSt st, int128 markPrice, int128 ft_lastMarkPrice)](#calctakepay)
- [tokenTypeQtyOnledger(struct StructLib.LedgerStruct ld, uint256 tokTypeId, address ledgerOwner)](#tokentypeqtyonledger)
- [setReservedAllFtPos(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, address ledgerOwner)](#setreservedallftpos)
- [calcPosMargin(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, address ledgerOwner, uint256 tokTypeId, int256 posSize, int128 price)](#calcposmargin)
- [abs256(int256 x)](#abs256)
- [abs64(int64 x)](#abs64)

### setLedgerOverride

```js
function setLedgerOverride(uint256 overrideType, struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, uint256 tokTypeId, address ledgerOwner, uint128 value) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| overrideType | uint256 |  | 
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| tokTypeId | uint256 |  | 
| ledgerOwner | address |  | 
| value | uint128 |  | 

### initMarginOverride

```js
function initMarginOverride(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, uint256 tokTypeId, address ledgerOwner, uint16 initMarginBips) private nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| tokTypeId | uint256 |  | 
| ledgerOwner | address |  | 
| initMarginBips | uint16 |  | 

### feePerContractOverride

```js
function feePerContractOverride(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, uint256 tokTypeId, address ledgerOwner, uint128 feePerContract) private nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| tokTypeId | uint256 |  | 
| ledgerOwner | address |  | 
| feePerContract | uint128 |  | 

### openFtPos

```js
function openFtPos(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.FuturesPositionArgs a, address owner) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| a | struct StructLib.FuturesPositionArgs |  | 
| owner | address |  | 

### takePay2

```js
function takePay2(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.TakePayArgs2 a) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| a | struct StructLib.TakePayArgs2 |  | 

### combineFtPos

```js
function combineFtPos(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CombinePositionArgs a) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| a | struct StructLib.CombinePositionArgs |  | 

### calcTakePay

```js
function calcTakePay(struct StructLib.FutureTokenTypeArgs fta, struct StructLib.PackedSt st, int128 markPrice, int128 ft_lastMarkPrice) private view
returns(int256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| fta | struct StructLib.FutureTokenTypeArgs |  | 
| st | struct StructLib.PackedSt |  | 
| markPrice | int128 |  | 
| ft_lastMarkPrice | int128 |  | 

### tokenTypeQtyOnledger

```js
function tokenTypeQtyOnledger(struct StructLib.LedgerStruct ld, uint256 tokTypeId, address ledgerOwner) private view
returns(int64)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| tokTypeId | uint256 |  | 
| ledgerOwner | address |  | 

### setReservedAllFtPos

```js
function setReservedAllFtPos(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, address ledgerOwner) private nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| ledgerOwner | address |  | 

### calcPosMargin

```js
function calcPosMargin(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, address ledgerOwner, uint256 tokTypeId, int256 posSize, int128 price) private view
returns(int256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| ledgerOwner | address |  | 
| tokTypeId | uint256 |  | 
| posSize | int256 |  | 
| price | int128 |  | 

### abs256

```js
function abs256(int256 x) private pure
returns(int256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| x | int256 |  | 

### abs64

```js
function abs64(int64 x) private pure
returns(int64)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| x | int64 |  | 

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
