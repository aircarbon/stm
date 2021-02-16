# SpotFeeLib.sol

View Source: [contracts/Libs/SpotFeeLib.sol](../contracts/Libs/SpotFeeLib.sol)

**SpotFeeLib**

**Events**

```js
event SetFeeTokFix(uint256  tokTypeId, address indexed ledgerOwner, uint256  fee_tokenQty_Fixed);
event SetFeeCcyFix(uint256  ccyTypeId, address indexed ledgerOwner, uint256  fee_ccy_Fixed);
event SetFeeTokBps(uint256  tokTypeId, address indexed ledgerOwner, uint256  fee_token_PercBips);
event SetFeeCcyBps(uint256  ccyTypeId, address indexed ledgerOwner, uint256  fee_ccy_PercBips);
event SetFeeTokMin(uint256  tokTypeId, address indexed ledgerOwner, uint256  fee_token_Min);
event SetFeeCcyMin(uint256  ccyTypeId, address indexed ledgerOwner, uint256  fee_ccy_Min);
event SetFeeTokMax(uint256  tokTypeId, address indexed ledgerOwner, uint256  fee_token_Max);
event SetFeeCcyMax(uint256  ccyTypeId, address indexed ledgerOwner, uint256  fee_ccy_Max);
event SetFeeCcyPerMillion(uint256  ccyTypeId, address indexed ledgerOwner, uint256  fee_ccy_perMillion);
```

## Functions

- [setFee_TokType(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.FeeStruct globalFees, uint256 tokTypeId, address ledgerOwner, struct StructLib.SetFeeArgs a)](#setfee_toktype)
- [setFee_CcyType(struct StructLib.LedgerStruct ld, struct StructLib.CcyTypesStruct ctd, struct StructLib.FeeStruct globalFees, uint256 ccyTypeId, address ledgerOwner, struct StructLib.SetFeeArgs a)](#setfee_ccytype)

### setFee_TokType

```js
function setFee_TokType(struct StructLib.LedgerStruct ld, struct StructLib.StTypesStruct std, struct StructLib.FeeStruct globalFees, uint256 tokTypeId, address ledgerOwner, struct StructLib.SetFeeArgs a) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| std | struct StructLib.StTypesStruct |  | 
| globalFees | struct StructLib.FeeStruct |  | 
| tokTypeId | uint256 |  | 
| ledgerOwner | address |  | 
| a | struct StructLib.SetFeeArgs |  | 

### setFee_CcyType

```js
function setFee_CcyType(struct StructLib.LedgerStruct ld, struct StructLib.CcyTypesStruct ctd, struct StructLib.FeeStruct globalFees, uint256 ccyTypeId, address ledgerOwner, struct StructLib.SetFeeArgs a) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| ctd | struct StructLib.CcyTypesStruct |  | 
| globalFees | struct StructLib.FeeStruct |  | 
| ccyTypeId | uint256 |  | 
| ledgerOwner | address |  | 
| a | struct StructLib.SetFeeArgs |  | 

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
