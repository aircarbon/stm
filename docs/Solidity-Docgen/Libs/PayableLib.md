# PayableLib.sol

View Source: [contracts/Libs/PayableLib.sol](../contracts/Libs/PayableLib.sol)

**PayableLib**

## Structs
### ProcessPaymentVars

```js
struct ProcessPaymentVars {
 uint256 weiPrice,
 uint256 qtyTokens,
 uint256[] issuer_stIds,
 struct StructLib.PackedSt issuerSt,
 uint256 weiChange
}
```

**Events**

```js
event IssuanceSubscribed(address indexed subscriber, address indexed issuer, uint256  weiSent, uint256  weiChange, uint256  tokensSubscribed, uint256  weiPrice);
```

## Functions

- [get_chainlinkRefPrice(address chainlinkAggAddr)](#get_chainlinkrefprice)
- [setIssuerValues(struct StructLib.LedgerStruct ld, struct StructLib.CashflowStruct cashflowData, uint256 wei_currentPrice, uint256 cents_currentPrice, uint256 qty_saleAllocation, address owner)](#setissuervalues)
- [pay(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.CashflowStruct cashflowData, struct StructLib.FeeStruct globalFees, address owner, int256 ethSat_UsdCents, int256 bnbSat_UsdCents)](#pay)
- [processSubscriberPayment(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.CashflowStruct cashflowData, struct StructLib.SecTokenBatch issueBatch, struct StructLib.FeeStruct globalFees, address owner, int256 ethSat_UsdCents, int256 bnbSat_UsdCents)](#processsubscriberpayment)
- [getCashflowData(struct StructLib.LedgerStruct ld, struct StructLib.CashflowStruct cashflowData)](#getcashflowdata)

### get_chainlinkRefPrice

```js
function get_chainlinkRefPrice(address chainlinkAggAddr) public view
returns(int256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| chainlinkAggAddr | address |  | 

### setIssuerValues

```js
function setIssuerValues(struct StructLib.LedgerStruct ld, struct StructLib.CashflowStruct cashflowData, uint256 wei_currentPrice, uint256 cents_currentPrice, uint256 qty_saleAllocation, address owner) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| cashflowData | struct StructLib.CashflowStruct |  | 
| wei_currentPrice | uint256 |  | 
| cents_currentPrice | uint256 |  | 
| qty_saleAllocation | uint256 |  | 
| owner | address |  | 

### pay

```js
function pay(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.CashflowStruct cashflowData, struct StructLib.FeeStruct globalFees, address owner, int256 ethSat_UsdCents, int256 bnbSat_UsdCents) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| cashflowData | struct StructLib.CashflowStruct |  | 
| globalFees | struct StructLib.FeeStruct |  | 
| owner | address |  | 
| ethSat_UsdCents | int256 |  | 
| bnbSat_UsdCents | int256 |  | 

### processSubscriberPayment

```js
function processSubscriberPayment(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.CcyTypesStruct ctd, struct StructLib.CashflowStruct cashflowData, struct StructLib.SecTokenBatch issueBatch, struct StructLib.FeeStruct globalFees, address owner, int256 ethSat_UsdCents, int256 bnbSat_UsdCents) private nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| cashflowData | struct StructLib.CashflowStruct |  | 
| issueBatch | struct StructLib.SecTokenBatch |  | 
| globalFees | struct StructLib.FeeStruct |  | 
| owner | address |  | 
| ethSat_UsdCents | int256 |  | 
| bnbSat_UsdCents | int256 |  | 

### getCashflowData

```js
function getCashflowData(struct StructLib.LedgerStruct ld, struct StructLib.CashflowStruct cashflowData) public view
returns(struct StructLib.CashflowStruct)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| cashflowData | struct StructLib.CashflowStruct |  | 

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
