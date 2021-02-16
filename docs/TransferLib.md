# TransferLib.sol

View Source: [contracts/Libs/TransferLib.sol](../contracts/Libs/TransferLib.sol)

**TransferLib**

## Structs
### TransferVars

```js
struct TransferVars {
 struct TransferLib.TransferSplitPreviewReturn[2] ts_previews,
 struct TransferLib.TransferSplitArgs[2] ts_args,
 uint256[2] totalOrigFee,
 uint80 transferedQty,
 uint80 exchangeFeesPaidQty,
 uint80 originatorFeesPaidQty
}
```

### TransferSplitArgs

```js
struct TransferSplitArgs {
 address from,
 address to,
 uint256 tokTypeId,
 uint256 qtyUnit,
 enum StructLib.TransferType transferType,
 uint256 maxStId,
 uint256[] k_stIds_take
}
```

### TransferSpltVars

```js
struct TransferSpltVars {
 uint256 ndx,
 int64 remainingToTransfer,
 bool mergedExisting,
 int64 stQty
}
```

### TransferSplitPreviewReturn

```js
struct TransferSplitPreviewReturn {
 uint64[128] batchIds,
 uint256[128] transferQty,
 uint256 batchCount,
 uint256 TC,
 uint256 TC_capped
}
```

## Contract Members
**Constants & Variables**

```js
uint256 internal constant MAX_BATCHES_PREVIEW;

```

**Events**

```js
event TransferedFullSecToken(address indexed from, address indexed to, uint256 indexed stId, uint256  mergedToSecTokenId, uint256  qty, enum StructLib.TransferType  transferType);
event TransferedPartialSecToken(address indexed from, address indexed to, uint256 indexed splitFromSecTokenId, uint256  newSecTokenId, uint256  mergedToSecTokenId, uint256  qty, enum StructLib.TransferType  transferType);
event TradedCcyTok(uint256  ccyTypeId, uint256  ccyAmount, uint256  tokTypeId, address indexed from, address indexed to, uint256  tokQty, uint256  ccyFeeFrom, uint256  ccyFeeTo);
```

## Functions

- [transferOrTrade(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.FeeStruct globalFees, struct StructLib.TransferArgs a)](#transferortrade)
- [transfer_feePreview(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.FeeStruct globalFees, address feeAddrOwner, struct StructLib.TransferArgs a)](#transfer_feepreview)
- [transfer_feePreview_ExchangeOnly(struct StructLib.LedgerStruct ld, struct StructLib.FeeStruct globalFees, address feeAddrOwner, struct StructLib.TransferArgs a)](#transfer_feepreview_exchangeonly)
- [applyOriginatorCcyFees(struct StructLib.LedgerStruct ld, struct TransferLib.TransferSplitPreviewReturn ts_preview, uint256 tot_exFee_ccy, uint256 tot_qty, address feeAddrOwner, uint256 ccyTypeId)](#applyoriginatorccyfees)
- [transferSplitSecTokens(struct StructLib.LedgerStruct ld, struct TransferLib.TransferSplitArgs a)](#transfersplitsectokens)
- [transferSplitSecTokens_Preview(struct StructLib.LedgerStruct ld, struct TransferLib.TransferSplitArgs a)](#transfersplitsectokens_preview)
- [calcFeeWithCapCollar(struct StructLib.SetFeeArgs feeStructure, uint256 sendAmount, uint256 receiveAmount)](#calcfeewithcapcollar)
- [applyFeeStruct(struct StructLib.SetFeeArgs fs, uint256 sendAmount, uint256 receiveAmount)](#applyfeestruct)
- [checkStIds(struct StructLib.LedgerStruct ld, struct StructLib.TransferArgs a)](#checkstids)

### transferOrTrade

```js
function transferOrTrade(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.FeeStruct globalFees, struct StructLib.TransferArgs a) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| globalFees | struct StructLib.FeeStruct |  | 
| a | struct StructLib.TransferArgs |  | 

### transfer_feePreview

```js
function transfer_feePreview(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.FeeStruct globalFees, address feeAddrOwner, struct StructLib.TransferArgs a) public view
returns(feesAll struct StructLib.FeesCalc[257])
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| globalFees | struct StructLib.FeeStruct |  | 
| feeAddrOwner | address |  | 
| a | struct StructLib.TransferArgs |  | 

### transfer_feePreview_ExchangeOnly

```js
function transfer_feePreview_ExchangeOnly(struct StructLib.LedgerStruct ld, struct StructLib.FeeStruct globalFees, address feeAddrOwner, struct StructLib.TransferArgs a) public view
returns(feesAll struct StructLib.FeesCalc[1])
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| globalFees | struct StructLib.FeeStruct |  | 
| feeAddrOwner | address |  | 
| a | struct StructLib.TransferArgs |  | 

### applyOriginatorCcyFees

```js
function applyOriginatorCcyFees(struct StructLib.LedgerStruct ld, struct TransferLib.TransferSplitPreviewReturn ts_preview, uint256 tot_exFee_ccy, uint256 tot_qty, address feeAddrOwner, uint256 ccyTypeId) private nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| ts_preview | struct TransferLib.TransferSplitPreviewReturn |  | 
| tot_exFee_ccy | uint256 |  | 
| tot_qty | uint256 |  | 
| feeAddrOwner | address |  | 
| ccyTypeId | uint256 |  | 

### transferSplitSecTokens

```js
function transferSplitSecTokens(struct StructLib.LedgerStruct ld, struct TransferLib.TransferSplitArgs a) private nonpayable
returns(updatedMaxStId uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| a | struct TransferLib.TransferSplitArgs |  | 

### transferSplitSecTokens_Preview

```js
function transferSplitSecTokens_Preview(struct StructLib.LedgerStruct ld, struct TransferLib.TransferSplitArgs a) private view
returns(ret struct TransferLib.TransferSplitPreviewReturn)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| a | struct TransferLib.TransferSplitArgs |  | 

### calcFeeWithCapCollar

```js
function calcFeeWithCapCollar(struct StructLib.SetFeeArgs feeStructure, uint256 sendAmount, uint256 receiveAmount) private view
returns(totalFee uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| feeStructure | struct StructLib.SetFeeArgs |  | 
| sendAmount | uint256 |  | 
| receiveAmount | uint256 |  | 

### applyFeeStruct

```js
function applyFeeStruct(struct StructLib.SetFeeArgs fs, uint256 sendAmount, uint256 receiveAmount) private view
returns(totalFee uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| fs | struct StructLib.SetFeeArgs |  | 
| sendAmount | uint256 |  | 
| receiveAmount | uint256 |  | 

### checkStIds

```js
function checkStIds(struct StructLib.LedgerStruct ld, struct StructLib.TransferArgs a) private view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| a | struct StructLib.TransferArgs |  | 

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
