# TokenLib.sol

View Source: [contracts/Libs/TokenLib.sol](../contracts/Libs/TokenLib.sol)

**TokenLib**

## Structs
### MintSecTokenBatchArgs

```js
struct MintSecTokenBatchArgs {
 uint256 tokTypeId,
 uint256 mintQty,
 int64 mintSecTokenCount,
 address payable batchOwner,
 struct StructLib.SetFeeArgs origTokFee,
 uint16 origCcyFee_percBips_ExFee,
 string[] metaKeys,
 string[] metaValues
}
```

### BurnTokenArgs

```js
struct BurnTokenArgs {
 address ledgerOwner,
 uint256 tokTypeId,
 int256 burnQty,
 uint256[] k_stIds
}
```

**Events**

```js
event AddedSecTokenType(uint256  id, string  name, enum StructLib.SettlementType  settlementType, uint64  expiryTimestamp, uint256  underlyerTypeId, uint256  refCcyId, uint16  initMarginBips, uint16  varMarginBips);
event SetFutureVariationMargin(uint256  tokenTypeId, uint16  varMarginBips);
event SetFutureFeePerContract(uint256  tokenTypeId, uint256  feePerContract);
event Burned(uint256  tokenTypeId, address indexed from, uint256  burnedQty);
event BurnedFullSecToken(uint256 indexed stId, uint256  tokenTypeId, address indexed from, uint256  burnedQty);
event BurnedPartialSecToken(uint256 indexed stId, uint256  tokenTypeId, address indexed from, uint256  burnedQty);
event Minted(uint256 indexed batchId, uint256  tokenTypeId, address indexed to, uint256  mintQty, uint256  mintSecTokenCount);
event MintedSecToken(uint256 indexed stId, uint256 indexed batchId, uint256  tokenTypeId, address indexed to, uint256  mintedQty);
event AddedBatchMetadata(uint256 indexed batchId, string  key, string  value);
event SetBatchOriginatorFee_Token(uint256 indexed batchId, struct StructLib.SetFeeArgs  originatorFee);
event SetBatchOriginatorFee_Currency(uint256 indexed batchId, uint16  origCcyFee_percBips_ExFee);
```

## Functions

- [addSecTokenType(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, string name, enum StructLib.SettlementType settlementType, struct StructLib.FutureTokenTypeArgs ft, address payable cashflowBaseAddr)](#addsectokentype)
- [setFuture_FeePerContract(struct StructLib.StTypesStruct std, uint256 tokTypeId, uint128 feePerContract)](#setfuture_feepercontract)
- [setFuture_VariationMargin(struct StructLib.StTypesStruct std, uint256 tokTypeId, uint16 varMarginBips)](#setfuture_variationmargin)
- [getSecTokenTypes(struct StructLib.StTypesStruct std)](#getsectokentypes)
- [mintSecTokenBatch(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct TokenLib.MintSecTokenBatchArgs a)](#mintsectokenbatch)
- [burnTokens(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct TokenLib.BurnTokenArgs a)](#burntokens)
- [getSecToken(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, uint256 stId)](#getsectoken)
- [addMetaSecTokenBatch(struct StructLib.LedgerStruct ld, uint256 batchId, string metaKeyNew, string metaValueNew)](#addmetasectokenbatch)
- [setOriginatorFeeTokenBatch(struct StructLib.LedgerStruct ld, uint256 batchId, struct StructLib.SetFeeArgs originatorFeeNew)](#setoriginatorfeetokenbatch)
- [setOriginatorFeeCurrencyBatch(struct StructLib.LedgerStruct ld, uint64 batchId, uint16 origCcyFee_percBips_ExFee)](#setoriginatorfeecurrencybatch)

### addSecTokenType

```js
function addSecTokenType(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, string name, enum StructLib.SettlementType settlementType, struct StructLib.FutureTokenTypeArgs ft, address payable cashflowBaseAddr) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| name | string |  | 
| settlementType | enum StructLib.SettlementType |  | 
| ft | struct StructLib.FutureTokenTypeArgs |  | 
| cashflowBaseAddr | address payable |  | 

### setFuture_FeePerContract

```js
function setFuture_FeePerContract(struct StructLib.StTypesStruct std, uint256 tokTypeId, uint128 feePerContract) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| std | struct StructLib.StTypesStruct |  | 
| tokTypeId | uint256 |  | 
| feePerContract | uint128 |  | 

### setFuture_VariationMargin

```js
function setFuture_VariationMargin(struct StructLib.StTypesStruct std, uint256 tokTypeId, uint16 varMarginBips) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| std | struct StructLib.StTypesStruct |  | 
| tokTypeId | uint256 |  | 
| varMarginBips | uint16 |  | 

### getSecTokenTypes

```js
function getSecTokenTypes(struct StructLib.StTypesStruct std) public view
returns(struct StructLib.GetSecTokenTypesReturn)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| std | struct StructLib.StTypesStruct |  | 

### mintSecTokenBatch

```js
function mintSecTokenBatch(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct TokenLib.MintSecTokenBatchArgs a) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| a | struct TokenLib.MintSecTokenBatchArgs |  | 

### burnTokens

```js
function burnTokens(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct TokenLib.BurnTokenArgs a) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| a | struct TokenLib.BurnTokenArgs |  | 

### getSecToken

```js
function getSecToken(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, uint256 stId) public view
returns(struct StructLib.LedgerSecTokenReturn)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| stId | uint256 |  | 

### addMetaSecTokenBatch

```js
function addMetaSecTokenBatch(struct StructLib.LedgerStruct ld, uint256 batchId, string metaKeyNew, string metaValueNew) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| batchId | uint256 |  | 
| metaKeyNew | string |  | 
| metaValueNew | string |  | 

### setOriginatorFeeTokenBatch

```js
function setOriginatorFeeTokenBatch(struct StructLib.LedgerStruct ld, uint256 batchId, struct StructLib.SetFeeArgs originatorFeeNew) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| batchId | uint256 |  | 
| originatorFeeNew | struct StructLib.SetFeeArgs |  | 

### setOriginatorFeeCurrencyBatch

```js
function setOriginatorFeeCurrencyBatch(struct StructLib.LedgerStruct ld, uint64 batchId, uint16 origCcyFee_percBips_ExFee) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| batchId | uint64 |  | 
| origCcyFee_percBips_ExFee | uint16 |  | 

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
