# StMaster.sol

View Source: [contracts/StMaster/StMaster.sol](../contracts/StMaster/StMaster.sol)

**↗ Extends: [StMintable](StMintable.md), [StBurnable](StBurnable.md), [Collateralizable](Collateralizable.md), [StTransferable](StTransferable.md), [DataLoadable](DataLoadable.md), [StFutures](StFutures.md)**

**StMaster**

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

## Contract Members
**Constants & Variables**

```js
//public members
string public name;

//internal members
string internal contractVersion;
string internal contractUnit;

```

**Events**

```js
event AddedCcyType(uint256  id, string  name, string  unit);
event CcyFundedLedger(uint256  ccyTypeId, address indexed to, int256  amount, string  desc);
event CcyWithdrewLedger(uint256  ccyTypeId, address indexed from, int256  amount, string  desc);
event AddedSecTokenType(uint256  id, string  name, enum StructLib.SettlementType  settlementType, uint64  expiryTimestamp, uint256  underlyerTypeId, uint256  refCcyId, uint16  initMarginBips, uint16  varMarginBips);
event SetFutureVariationMargin(uint256  tokTypeId, uint16  varMarginBips);
event SetFutureFeePerContract(uint256  tokTypeId, uint256  feePerContract);
event Burned(uint256  tokTypeId, address indexed from, uint256  burnedQty);
event BurnedFullSecToken(uint256 indexed stId, uint256  tokTypeId, address indexed from, uint256  burnedQty);
event BurnedPartialSecToken(uint256 indexed stId, uint256  tokTypeId, address indexed from, uint256  burnedQty);
event Minted(uint256 indexed batchId, uint256  tokTypeId, address indexed to, uint256  mintQty, uint256  mintSecTokenCount);
event MintedSecToken(uint256 indexed stId, uint256 indexed batchId, uint256  tokTypeId, address indexed to, uint256  mintedQty);
event AddedBatchMetadata(uint256 indexed batchId, string  key, string  value);
event SetBatchOriginatorFee_Token(uint256 indexed batchId, struct StructLib.SetFeeArgs  originatorFee);
event SetBatchOriginatorFee_Currency(uint256 indexed batchId, uint16  origCcyFee_percBips_ExFee);
event TransferedFullSecToken(address indexed from, address indexed to, uint256 indexed stId, uint256  mergedToSecTokenId, uint256  qty, enum StMaster.TransferType  transferType);
event TransferedPartialSecToken(address indexed from, address indexed to, uint256 indexed splitFromSecTokenId, uint256  newSecTokenId, uint256  mergedToSecTokenId, uint256  qty, enum StMaster.TransferType  transferType);
event TradedCcyTok(uint256  ccyTypeId, uint256  ccyAmount, uint256  tokTypeId, address indexed from, address indexed to, uint256  tokQty, uint256  ccyFeeFrom, uint256  ccyFeeTo);
event TransferedLedgerCcy(address indexed from, address indexed to, uint256  ccyTypeId, uint256  amount, enum StMaster.TransferType  transferType);
event ReservedLedgerCcy(address indexed ledgerOwner, uint256  ccyTypeId, uint256  amount);
event SetFeeTokFix(uint256  tokTypeId, address indexed ledgerOwner, uint256  fee_tokenQty_Fixed);
event SetFeeCcyFix(uint256  ccyTypeId, address indexed ledgerOwner, uint256  fee_ccy_Fixed);
event SetFeeTokBps(uint256  tokTypeId, address indexed ledgerOwner, uint256  fee_token_PercBips);
event SetFeeCcyBps(uint256  ccyTypeId, address indexed ledgerOwner, uint256  fee_ccy_PercBips);
event SetFeeTokMin(uint256  tokTypeId, address indexed ledgerOwner, uint256  fee_token_Min);
event SetFeeCcyMin(uint256  ccyTypeId, address indexed ledgerOwner, uint256  fee_ccy_Min);
event SetFeeTokMax(uint256  tokTypeId, address indexed ledgerOwner, uint256  fee_token_Max);
event SetFeeCcyMax(uint256  ccyTypeId, address indexed ledgerOwner, uint256  fee_ccy_Max);
event SetFeeCcyPerMillion(uint256  ccyTypeId, address indexed ledgerOwner, uint256  fee_ccy_perMillion);
event Transfer(address indexed from, address indexed to, uint256  value);
event Approval(address indexed owner, address indexed spender, uint256  value);
event IssuanceSubscribed(address indexed subscriber, address indexed issuer, uint256  weiSent, uint256  weiChange, uint256  tokensSubscribed, uint256  weiPrice);
event FutureOpenInterest(address indexed long, address indexed short, uint256  shortStId, uint256  tokTypeId, uint256  qty, uint256  price, uint256  feeLong, uint256  feeShort);
event SetInitialMarginOverride(uint256  tokTypeId, address indexed ledgerOwner, uint16  initMarginBips);
event TakePay2(address indexed from, address indexed to, uint256  ccyId, uint256  delta, uint256  done, uint256  fee);
event Combine(address indexed to, uint256  masterStId, uint256  countTokensCombined);
```

## Functions

- [getContractType()](#getcontracttype)
- [getContractSeal()](#getcontractseal)
- [sealContract()](#sealcontract)
- [version()](#version)
- [unit()](#unit)
- [(address[] _owners, enum StructLib.ContractType _contractType, string _contractName, string _contractVer, string _contractUnit)](#)

### getContractType

```js
function getContractType() external view
returns(enum StructLib.ContractType)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### getContractSeal

```js
function getContractSeal() external view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### sealContract

```js
function sealContract() external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### version

```js
function version() external view
returns(string)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### unit

```js
function unit() external view
returns(string)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

### 

```js
function (address[] _owners, enum StructLib.ContractType _contractType, string _contractName, string _contractVer, string _contractUnit) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _owners | address[] |  | 
| _contractType | enum StructLib.ContractType |  | 
| _contractName | string |  | 
| _contractVer | string |  | 
| _contractUnit | string |  | 

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
