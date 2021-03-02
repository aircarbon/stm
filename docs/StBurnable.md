# StBurnable.sol

View Source: [contracts/StMaster/StBurnable.sol](../contracts/StMaster/StBurnable.sol)

**↗ Extends: [Owned](Owned.md), [StLedger](StLedger.md)**
**↘ Derived Contracts: [StMaster](StMaster.md)**

**StBurnable**

## Functions

- [burnTokens(address ledgerOwner, uint256 tokTypeId, int256 burnQty, uint256[] stIds)](#burntokens)
- [getSecToken_totalBurnedQty()](#getsectoken_totalburnedqty)

### burnTokens

```js
function burnTokens(address ledgerOwner, uint256 tokTypeId, int256 burnQty, uint256[] stIds) public nonpayable onlyOwner onlyWhenReadWrite 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ledgerOwner | address |  | 
| tokTypeId | uint256 |  | 
| burnQty | int256 |  | 
| stIds | uint256[] |  | 

### getSecToken_totalBurnedQty

```js
function getSecToken_totalBurnedQty() external view
returns(count uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|

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
