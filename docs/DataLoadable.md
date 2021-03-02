# DataLoadable.sol

View Source: [contracts/StMaster/DataLoadable.sol](../contracts/StMaster/DataLoadable.sol)

**↗ Extends: [Owned](Owned.md), [StLedger](StLedger.md), [StFees](StFees.md), [StErc20](StErc20.md)**
**↘ Derived Contracts: [StMaster](StMaster.md)**

**DataLoadable**

## Functions

- [loadSecTokenBatch(struct StructLib.SecTokenBatch[] batches, uint64 _batches_currentMax_id)](#loadsectokenbatch)
- [createLedgerEntry(address ledgerEntryOwner, struct StructLib.LedgerCcyReturn[] ccys, uint256 spot_sumQtyMinted, uint256 spot_sumQtyBurned)](#createledgerentry)
- [addSecToken(address ledgerEntryOwner, uint64 batchId, uint256 stId, uint256 tokTypeId, int64 mintedQty, int64 currentQty, int128 ft_price, int128 ft_lastMarkPrice, address ft_ledgerOwner, int128 ft_PL)](#addsectoken)
- [setTokenTotals(uint256 base_id, uint256 currentMax_id, uint256 totalMintedQty, uint256 totalBurnedQty)](#settokentotals)

### loadSecTokenBatch

```js
function loadSecTokenBatch(struct StructLib.SecTokenBatch[] batches, uint64 _batches_currentMax_id) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| batches | struct StructLib.SecTokenBatch[] |  | 
| _batches_currentMax_id | uint64 |  | 

### createLedgerEntry

```js
function createLedgerEntry(address ledgerEntryOwner, struct StructLib.LedgerCcyReturn[] ccys, uint256 spot_sumQtyMinted, uint256 spot_sumQtyBurned) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ledgerEntryOwner | address |  | 
| ccys | struct StructLib.LedgerCcyReturn[] |  | 
| spot_sumQtyMinted | uint256 |  | 
| spot_sumQtyBurned | uint256 |  | 

### addSecToken

```js
function addSecToken(address ledgerEntryOwner, uint64 batchId, uint256 stId, uint256 tokTypeId, int64 mintedQty, int64 currentQty, int128 ft_price, int128 ft_lastMarkPrice, address ft_ledgerOwner, int128 ft_PL) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ledgerEntryOwner | address |  | 
| batchId | uint64 |  | 
| stId | uint256 |  | 
| tokTypeId | uint256 |  | 
| mintedQty | int64 |  | 
| currentQty | int64 |  | 
| ft_price | int128 |  | 
| ft_lastMarkPrice | int128 |  | 
| ft_ledgerOwner | address |  | 
| ft_PL | int128 |  | 

### setTokenTotals

```js
function setTokenTotals(uint256 base_id, uint256 currentMax_id, uint256 totalMintedQty, uint256 totalBurnedQty) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| base_id | uint256 |  | 
| currentMax_id | uint256 |  | 
| totalMintedQty | uint256 |  | 
| totalBurnedQty | uint256 |  | 

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
