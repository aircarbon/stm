# StructLib.sol

View Source: [contracts/Interfaces/StructLib.sol](../contracts/Interfaces/StructLib.sol)

**StructLib**

**Enums**
### TransferType

```js
enum TransferType {
 Undefined,
 User,
 ExchangeFee,
 OriginatorFee,
 TakePayFee,
 SettleTake,
 SettlePay,
 MintFee,
 BurnFee,
 WithdrawFee,
 DepositFee,
 DataFee,
 OtherFee1,
 OtherFee2,
 OtherFee3,
 OtherFee4,
 OtherFee5,
 RelatedTransfer,
 Adjustment,
 ERC20,
 Subscription
}
```

### ContractType

```js
enum ContractType {
 COMMODITY,
 CASHFLOW_BASE,
 CASHFLOW_CONTROLLER
}
```

### FundWithdrawType

```js
enum FundWithdrawType {
 Fund,
 Withdraw
}
```

### SettlementType

```js
enum SettlementType {
 UNDEFINED,
 SPOT,
 FUTURE
}
```

### CashflowType

```js
enum CashflowType {
 BOND,
 EQUITY
}
```

## Structs
### TransferCcyArgs

```js
struct TransferCcyArgs {
 address from,
 address to,
 uint256 ccyTypeId,
 uint256 amount,
 enum StructLib.TransferType transferType
}
```

### Ccy

```js
struct Ccy {
 uint256 id,
 string name,
 string unit,
 uint16 decimals
}
```

### GetCcyTypesReturn

```js
struct GetCcyTypesReturn {
 struct StructLib.Ccy[] ccyTypes
}
```

### CcyTypesStruct

```js
struct CcyTypesStruct {
 mapping(uint256 => struct StructLib.Ccy) _ct_Ccy,
 uint256 _ct_Count
}
```

### SecTokenTypeReturn

```js
struct SecTokenTypeReturn {
 uint256 id,
 string name,
 enum StructLib.SettlementType settlementType,
 struct StructLib.FutureTokenTypeArgs ft,
 address cashflowBaseAddr
}
```

### GetSecTokenTypesReturn

```js
struct GetSecTokenTypesReturn {
 struct StructLib.SecTokenTypeReturn[] tokenTypes
}
```

### StTypesStruct

```js
struct StTypesStruct {
 mapping(uint256 => string) _tt_name,
 mapping(uint256 => enum StructLib.SettlementType) _tt_settle,
 mapping(uint256 => struct StructLib.FutureTokenTypeArgs) _tt_ft,
 mapping(uint256 => address payable) _tt_addr,
 uint256 _tt_Count
}
```

### FutureTokenTypeArgs

```js
struct FutureTokenTypeArgs {
 uint64 expiryTimestamp,
 uint256 underlyerTypeId,
 uint256 refCcyId,
 uint16 initMarginBips,
 uint16 varMarginBips,
 uint16 contractSize,
 uint128 feePerContract
}
```

### SecTokenBatch

```js
struct SecTokenBatch {
 uint64 id,
 uint256 mintedTimestamp,
 uint256 tokTypeId,
 uint256 mintedQty,
 uint256 burnedQty,
 string[] metaKeys,
 string[] metaValues,
 struct StructLib.SetFeeArgs origTokFee,
 uint16 origCcyFee_percBips_ExFee,
 address payable originator
}
```

### Ledger

```js
struct Ledger {
 bool exists,
 mapping(uint256 => uint256[]) tokenType_stIds,
 mapping(uint256 => int256) ccyType_balance,
 mapping(uint256 => int256) ccyType_reserved,
 struct StructLib.FeeStruct spot_customFees,
 uint256 spot_sumQtyMinted,
 uint256 spot_sumQtyBurned,
 mapping(uint256 => uint16) ft_initMarginBips,
 mapping(uint256 => uint128) ft_feePerContract
}
```

### LedgerReturn

```js
struct LedgerReturn {
 bool exists,
 struct StructLib.LedgerSecTokenReturn[] tokens,
 uint256 spot_sumQty,
 struct StructLib.LedgerCcyReturn[] ccys,
 uint256 spot_sumQtyMinted,
 uint256 spot_sumQtyBurned
}
```

### LedgerSecTokenReturn

```js
struct LedgerSecTokenReturn {
 bool exists,
 uint256 stId,
 uint256 tokTypeId,
 string tokTypeName,
 uint64 batchId,
 int64 mintedQty,
 int64 currentQty,
 int128 ft_price,
 address ft_ledgerOwner,
 int128 ft_lastMarkPrice,
 int128 ft_PL
}
```

### LedgerCcyReturn

```js
struct LedgerCcyReturn {
 uint256 ccyTypeId,
 string name,
 string unit,
 int256 balance,
 int256 reserved
}
```

### PackedSt

```js
struct PackedSt {
 uint64 batchId,
 int64 mintedQty,
 int64 currentQty,
 int128 ft_price,
 address ft_ledgerOwner,
 int128 ft_lastMarkPrice,
 int128 ft_PL
}
```

### LedgerStruct

```js
struct LedgerStruct {
 enum StructLib.ContractType contractType,
 mapping(uint256 => struct StructLib.SecTokenBatch) _batches,
 uint64 _batches_currentMax_id,
 mapping(uint256 => struct StructLib.PackedSt) _sts,
 uint256 _tokens_base_id,
 uint256 _tokens_currentMax_id,
 mapping(address => struct StructLib.Ledger) _ledger,
 address[] _ledgerOwners,
 uint256 _spot_totalMintedQty,
 uint256 _spot_totalBurnedQty,
 bool _contractSealed
}
```

### FeeStruct

```js
struct FeeStruct {
 mapping(uint256 => bool) tokType_Set,
 mapping(uint256 => bool) ccyType_Set,
 mapping(uint256 => struct StructLib.SetFeeArgs) tok,
 mapping(uint256 => struct StructLib.SetFeeArgs) ccy
}
```

### SetFeeArgs

```js
struct SetFeeArgs {
 uint256 fee_fixed,
 uint256 fee_percBips,
 uint256 fee_min,
 uint256 fee_max,
 uint256 ccy_perMillion,
 bool ccy_mirrorFee
}
```

### Erc20Struct

```js
struct Erc20Struct {
 address[] _whitelist,
 mapping(address => bool) _whitelisted,
 mapping(address => mapping(address => uint256)) _allowances
}
```

### CashflowArgs

```js
struct CashflowArgs {
 enum StructLib.CashflowType cashflowType,
 uint256 term_Blks,
 uint256 bond_bps,
 uint256 bond_int_EveryBlks
}
```

### CashflowStruct

```js
struct CashflowStruct {
 struct StructLib.CashflowArgs args,
 uint256 wei_currentPrice,
 uint256 cents_currentPrice,
 uint256 qty_issuanceMax,
 uint256 qty_issuanceRemaining,
 uint256 qty_issuanceSold,
 uint256 qty_saleAllocation,
 address issuer
}
```

### TransferArgs

```js
struct TransferArgs {
 address ledger_A,
 address ledger_B,
 uint256 qty_A,
 uint256[] k_stIds_A,
 uint256 tokTypeId_A,
 uint256 qty_B,
 uint256[] k_stIds_B,
 uint256 tokTypeId_B,
 int256 ccy_amount_A,
 uint256 ccyTypeId_A,
 int256 ccy_amount_B,
 uint256 ccyTypeId_B,
 bool applyFees,
 address feeAddrOwner,
 enum StructLib.TransferType transferType
}
```

### FeesCalc

```js
struct FeesCalc {
 uint256 fee_ccy_A,
 uint256 fee_ccy_B,
 uint256 fee_tok_A,
 uint256 fee_tok_B,
 address fee_to,
 uint256 origTokFee_qty,
 uint64 origTokFee_batchId,
 struct StructLib.SetFeeArgs origTokFee_struct
}
```

### FuturesPositionArgs

```js
struct FuturesPositionArgs {
 uint256 tokTypeId,
 address ledger_A,
 address ledger_B,
 int256 qty_A,
 int256 qty_B,
 int256 price
}
```

### TakePayArgs2

```js
struct TakePayArgs2 {
 uint256 tokTypeId,
 uint256 stId,
 int128 markPrice,
 int256 feePerSide,
 address feeAddrOwner
}
```

### CombinePositionArgs

```js
struct CombinePositionArgs {
 uint256 tokTypeId,
 uint256 master_StId,
 uint256[] child_StIds
}
```

**Events**

```js
event TransferedLedgerCcy(address indexed from, address indexed to, uint256  ccyTypeId, uint256  amount, enum StructLib.TransferType  transferType);
event ReservedLedgerCcy(address indexed ledgerOwner, uint256  ccyTypeId, uint256  amount);
```

## Functions

- [transferCcy(struct StructLib.LedgerStruct ld, struct StructLib.TransferCcyArgs a)](#transferccy)
- [emitTransferedLedgerCcy(struct StructLib.TransferCcyArgs a)](#emittransferedledgerccy)
- [setReservedCcy(struct StructLib.LedgerStruct ld, struct StructLib.CcyTypesStruct ctd, address ledger, uint256 ccyTypeId, int256 reservedAmount)](#setreservedccy)
- [initLedgerIfNew(struct StructLib.LedgerStruct ld, address addr)](#initledgerifnew)
- [sufficientTokens(struct StructLib.LedgerStruct ld, address ledger, uint256 tokTypeId, int256 qty, int256 fee)](#sufficienttokens)
- [sufficientCcy(struct StructLib.LedgerStruct ld, address ledger, uint256 ccyTypeId, int256 sending, int256 receiving, int256 fee)](#sufficientccy)
- [tokenExistsOnLedger(struct StructLib.LedgerStruct ld, uint256 tokTypeId, address ledger, uint256 stId)](#tokenexistsonledger)

### transferCcy

```js
function transferCcy(struct StructLib.LedgerStruct ld, struct StructLib.TransferCcyArgs a) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| a | struct StructLib.TransferCcyArgs |  | 

### emitTransferedLedgerCcy

```js
function emitTransferedLedgerCcy(struct StructLib.TransferCcyArgs a) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | struct StructLib.TransferCcyArgs |  | 

### setReservedCcy

```js
function setReservedCcy(struct StructLib.LedgerStruct ld, struct StructLib.CcyTypesStruct ctd, address ledger, uint256 ccyTypeId, int256 reservedAmount) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| ledger | address |  | 
| ccyTypeId | uint256 |  | 
| reservedAmount | int256 |  | 

### initLedgerIfNew

```js
function initLedgerIfNew(struct StructLib.LedgerStruct ld, address addr) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| addr | address |  | 

### sufficientTokens

```js
function sufficientTokens(struct StructLib.LedgerStruct ld, address ledger, uint256 tokTypeId, int256 qty, int256 fee) public view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| ledger | address |  | 
| tokTypeId | uint256 |  | 
| qty | int256 |  | 
| fee | int256 |  | 

### sufficientCcy

```js
function sufficientCcy(struct StructLib.LedgerStruct ld, address ledger, uint256 ccyTypeId, int256 sending, int256 receiving, int256 fee) public view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| ledger | address |  | 
| ccyTypeId | uint256 |  | 
| sending | int256 |  | 
| receiving | int256 |  | 
| fee | int256 |  | 

### tokenExistsOnLedger

```js
function tokenExistsOnLedger(struct StructLib.LedgerStruct ld, uint256 tokTypeId, address ledger, uint256 stId) public view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| tokTypeId | uint256 |  | 
| ledger | address |  | 
| stId | uint256 |  | 

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
