# LoadLib.sol

View Source: [contracts/Libs/LoadLib.sol](../contracts/Libs/LoadLib.sol)

**LoadLib**

## Functions

- [loadSecTokenBatch(struct StructLib.LedgerStruct ld, struct StructLib.SecTokenBatch[] batches, uint64 _batches_currentMax_id)](#loadsectokenbatch)
- [createLedgerEntry(struct StructLib.LedgerStruct ld, address ledgerEntryOwner, struct StructLib.LedgerCcyReturn[] ccys, uint256 spot_sumQtyMinted, uint256 spot_sumQtyBurned)](#createledgerentry)
- [addSecToken(struct StructLib.LedgerStruct ld, address ledgerEntryOwner, uint64 batchId, uint256 stId, uint256 tokTypeId, int64 mintedQty, int64 currentQty, int128 ft_price, int128 ft_lastMarkPrice, address ft_ledgerOwner, int128 ft_PL)](#addsectoken)
- [setTokenTotals(struct StructLib.LedgerStruct ld, uint256 base_id, uint256 currentMax_id, uint256 totalMintedQty, uint256 totalBurnedQty)](#settokentotals)

### loadSecTokenBatch

```js
function loadSecTokenBatch(struct StructLib.LedgerStruct ld, struct StructLib.SecTokenBatch[] batches, uint64 _batches_currentMax_id) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| batches | struct StructLib.SecTokenBatch[] |  | 
| _batches_currentMax_id | uint64 |  | 

### createLedgerEntry

```js
function createLedgerEntry(struct StructLib.LedgerStruct ld, address ledgerEntryOwner, struct StructLib.LedgerCcyReturn[] ccys, uint256 spot_sumQtyMinted, uint256 spot_sumQtyBurned) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
| ledgerEntryOwner | address |  | 
| ccys | struct StructLib.LedgerCcyReturn[] |  | 
| spot_sumQtyMinted | uint256 |  | 
| spot_sumQtyBurned | uint256 |  | 

### addSecToken

```js
function addSecToken(struct StructLib.LedgerStruct ld, address ledgerEntryOwner, uint64 batchId, uint256 stId, uint256 tokTypeId, int64 mintedQty, int64 currentQty, int128 ft_price, int128 ft_lastMarkPrice, address ft_ledgerOwner, int128 ft_PL) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
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
function setTokenTotals(struct StructLib.LedgerStruct ld, uint256 base_id, uint256 currentMax_id, uint256 totalMintedQty, uint256 totalBurnedQty) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ld | struct StructLib.LedgerStruct |  | 
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
