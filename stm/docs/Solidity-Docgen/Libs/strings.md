# strings.sol

View Source: [contracts/Libs/Strings.sol](../contracts/Libs/Strings.sol)

**strings**

## Structs
### slice

```js
struct slice {
 uint256 _len,
 uint256 _ptr
}
```

## Functions

- [memcpy(uint256 dest, uint256 src, uint256 len)](#memcpy)
- [toSlice(string self)](#toslice)
- [len(bytes32 self)](#len)
- [toSliceB32(bytes32 self)](#tosliceb32)
- [copy(struct strings.slice self)](#copy)
- [toString(struct strings.slice self)](#tostring)
- [len(struct strings.slice self)](#len)
- [empty(struct strings.slice self)](#empty)
- [compare(struct strings.slice self, struct strings.slice other)](#compare)
- [equals(struct strings.slice self, struct strings.slice other)](#equals)
- [nextRune(struct strings.slice self, struct strings.slice rune)](#nextrune)
- [nextRune(struct strings.slice self)](#nextrune)
- [ord(struct strings.slice self)](#ord)
- [keccak(struct strings.slice self)](#keccak)
- [startsWith(struct strings.slice self, struct strings.slice needle)](#startswith)
- [beyond(struct strings.slice self, struct strings.slice needle)](#beyond)
- [endsWith(struct strings.slice self, struct strings.slice needle)](#endswith)
- [until(struct strings.slice self, struct strings.slice needle)](#until)
- [findPtr(uint256 selflen, uint256 selfptr, uint256 needlelen, uint256 needleptr)](#findptr)
- [rfindPtr(uint256 selflen, uint256 selfptr, uint256 needlelen, uint256 needleptr)](#rfindptr)
- [find(struct strings.slice self, struct strings.slice needle)](#find)
- [rfind(struct strings.slice self, struct strings.slice needle)](#rfind)
- [split(struct strings.slice self, struct strings.slice needle, struct strings.slice token)](#split)
- [split(struct strings.slice self, struct strings.slice needle)](#split)
- [rsplit(struct strings.slice self, struct strings.slice needle, struct strings.slice token)](#rsplit)
- [rsplit(struct strings.slice self, struct strings.slice needle)](#rsplit)
- [count(struct strings.slice self, struct strings.slice needle)](#count)
- [contains(struct strings.slice self, struct strings.slice needle)](#contains)
- [concat(struct strings.slice self, struct strings.slice other)](#concat)
- [join(struct strings.slice self, struct strings.slice[] parts)](#join)

### memcpy

```js
function memcpy(uint256 dest, uint256 src, uint256 len) private pure
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| dest | uint256 |  | 
| src | uint256 |  | 
| len | uint256 |  | 

### toSlice

```js
function toSlice(string self) internal pure
returns(struct strings.slice)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | string |  | 

### len

```js
function len(bytes32 self) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | bytes32 |  | 

### toSliceB32

```js
function toSliceB32(bytes32 self) internal pure
returns(ret struct strings.slice)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | bytes32 |  | 

### copy

```js
function copy(struct strings.slice self) internal pure
returns(struct strings.slice)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 

### toString

```js
function toString(struct strings.slice self) internal pure
returns(string)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 

### len

```js
function len(struct strings.slice self) internal pure
returns(l uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 

### empty

```js
function empty(struct strings.slice self) internal pure
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 

### compare

```js
function compare(struct strings.slice self, struct strings.slice other) internal pure
returns(int256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| other | struct strings.slice |  | 

### equals

```js
function equals(struct strings.slice self, struct strings.slice other) internal pure
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| other | struct strings.slice |  | 

### nextRune

```js
function nextRune(struct strings.slice self, struct strings.slice rune) internal pure
returns(struct strings.slice)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| rune | struct strings.slice |  | 

### nextRune

```js
function nextRune(struct strings.slice self) internal pure
returns(ret struct strings.slice)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 

### ord

```js
function ord(struct strings.slice self) internal pure
returns(ret uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 

### keccak

```js
function keccak(struct strings.slice self) internal pure
returns(ret bytes32)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 

### startsWith

```js
function startsWith(struct strings.slice self, struct strings.slice needle) internal pure
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| needle | struct strings.slice |  | 

### beyond

```js
function beyond(struct strings.slice self, struct strings.slice needle) internal pure
returns(struct strings.slice)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| needle | struct strings.slice |  | 

### endsWith

```js
function endsWith(struct strings.slice self, struct strings.slice needle) internal pure
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| needle | struct strings.slice |  | 

### until

```js
function until(struct strings.slice self, struct strings.slice needle) internal pure
returns(struct strings.slice)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| needle | struct strings.slice |  | 

### findPtr

```js
function findPtr(uint256 selflen, uint256 selfptr, uint256 needlelen, uint256 needleptr) private pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| selflen | uint256 |  | 
| selfptr | uint256 |  | 
| needlelen | uint256 |  | 
| needleptr | uint256 |  | 

### rfindPtr

```js
function rfindPtr(uint256 selflen, uint256 selfptr, uint256 needlelen, uint256 needleptr) private pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| selflen | uint256 |  | 
| selfptr | uint256 |  | 
| needlelen | uint256 |  | 
| needleptr | uint256 |  | 

### find

```js
function find(struct strings.slice self, struct strings.slice needle) internal pure
returns(struct strings.slice)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| needle | struct strings.slice |  | 

### rfind

```js
function rfind(struct strings.slice self, struct strings.slice needle) internal pure
returns(struct strings.slice)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| needle | struct strings.slice |  | 

### split

```js
function split(struct strings.slice self, struct strings.slice needle, struct strings.slice token) internal pure
returns(struct strings.slice)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| needle | struct strings.slice |  | 
| token | struct strings.slice |  | 

### split

```js
function split(struct strings.slice self, struct strings.slice needle) internal pure
returns(token struct strings.slice)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| needle | struct strings.slice |  | 

### rsplit

```js
function rsplit(struct strings.slice self, struct strings.slice needle, struct strings.slice token) internal pure
returns(struct strings.slice)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| needle | struct strings.slice |  | 
| token | struct strings.slice |  | 

### rsplit

```js
function rsplit(struct strings.slice self, struct strings.slice needle) internal pure
returns(token struct strings.slice)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| needle | struct strings.slice |  | 

### count

```js
function count(struct strings.slice self, struct strings.slice needle) internal pure
returns(cnt uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| needle | struct strings.slice |  | 

### contains

```js
function contains(struct strings.slice self, struct strings.slice needle) internal pure
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| needle | struct strings.slice |  | 

### concat

```js
function concat(struct strings.slice self, struct strings.slice other) internal pure
returns(string)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| other | struct strings.slice |  | 

### join

```js
function join(struct strings.slice self, struct strings.slice[] parts) internal pure
returns(string)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| self | struct strings.slice |  | 
| parts | struct strings.slice[] |  | 

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
