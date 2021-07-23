 Cashflow Token (Base) v1.0 Decription Report

 Files Description Table


|  File Name  |  SHA-1 Hash  |
|-------------|--------------|
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/StMaster.sol | 2a1babf23f7d98e5b56df8d9963992ac10abd6a8 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/StMaster/StMaster.sol | 9cc47135da7b45b32f0ca071a8a664f7fed53eaf |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/StMaster/CcyCollateralizable.sol | 3a7968191aad7c9cc5822b0f0a0194f16b205862 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/StMaster/Owned.sol | 62594d305dd14f2c7853bec3817f4531ac9dfa38 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/StMaster/StLedger.sol | 9b779d61e721dafb6be3373b18bd712a45154d38 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/Interfaces/StructLib.sol | 7a1158fe144aa87404b2fe2bec4484320e2d69b2 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/Libs/LedgerLib.sol | c9b886b91278078eadc0852a7d6b0822808f9d5b |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/Libs/TokenLib.sol | 717a01806a9091c89c096a44b7fea11c363a1c8a |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/Libs/SpotFeeLib.sol | fe60ab40c3bcfd7c9c77e9480452bc1cf2ab4324 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/Libs/Strings.sol | 52b85eae7549fde6c51e8e4e557e831502fc3409 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/Libs/CcyLib.sol | 1ddcacfebcd2a83247ad09a9d36e7c0a69b978a8 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/StMaster/StMintable.sol | 77a1862ec854aa72360d3727ece067e5d9df027c |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/StMaster/StBurnable.sol | 2383714bd963d44dffa55e2a079e5d4d89e820c8 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/StMaster/StTransferable.sol | 6e65b617fa88bef96e09ac1fefac8ec62432eafb |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/StMaster/StFees.sol | 1a4710ea861a2598f028a70afe10c5132bf91476 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/StMaster/StErc20.sol | b634d293dec827b0dd4385f543fbb6146b35c71f |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/Libs/TransferLib.sol | 41a3aae7f2d597a916880476febfef54b0eb3875 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/Libs/Erc20Lib.sol | 897fea1f30a562e0ca78ca19923689f0ef9e6851 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/StMaster/StPayable.sol | 401819ffe836fc6d3b033da429d3b8c3aebdb778 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/Libs/PayableLib.sol | 7483f8f145138fb0a66e9fbde886e5066009e664 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/Interfaces/IChainlinkAggregator.sol | 3175e8039af881ed27011337b1c03bc5b5a42c6a |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/Libs/SafeMath.sol | 860f31fc7372cdf2fc8e25dbf535111bca099a9b |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/StMaster/DataLoadable.sol | 211dabf39d75527151d80dde82318d5b527645b3 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/Libs/LoadLib.sol | 6916b2d99c01d7395df3695ff70936501fdb315b |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/StMaster/StFutures.sol | 77e0bf9991e25ef005104297d0a1a16ff6996c06 |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/Libs/FuturesLib.sol | 1eff5a3f78d9b57268910f6d488d939acf34212a |
| /Users/sdax/Documents/Workspace/ac-master/packages/erc20/contracts/StMaster/Migrations.sol | bce4daf15dcef53d6ff2cd3d7a8eb6fc020d6868 |


 Contracts Description Table


|  Contract  |         Type        |       Bases      |                  |                 |
|:----------:|:-------------------:|:----------------:|:----------------:|:---------------:|
|     └      |  **Function Name**  |  **Visibility**  |  **Mutability**  |  **Modifiers**  |
||||||
| **FuturesLib** | Library |  |||
| └ | setLedgerOverride | Public ❗️ | 🛑  |NO❗️ |
| └ | initMarginOverride | Private 🔐 | 🛑  | |
| └ | feePerContractOverride | Private 🔐 | 🛑  | |
| └ | openFtPos | Public ❗️ | 🛑  |NO❗️ |
| └ | takePay2 | Public ❗️ | 🛑  |NO❗️ |
| └ | combineFtPos | Public ❗️ | 🛑  |NO❗️ |
| └ | calcTakePay | Private 🔐 |   | |
| └ | tokenTypeQtyOnledger | Private 🔐 |   | |
| └ | setReservedAllFtPos | Private 🔐 | 🛑  | |
| └ | calcPosMargin | Private 🔐 |   | |
| └ | abs256 | Private 🔐 |   | |
| └ | abs64 | Private 🔐 |   | |
||||||
| **StFutures** | Implementation | Owned, StLedger, StFees, StErc20, StPayable |||
||||||
| **LoadLib** | Library |  |||
| └ | loadSecTokenBatch | Public ❗️ | 🛑  |NO❗️ |
| └ | createLedgerEntry | Public ❗️ | 🛑  |NO❗️ |
| └ | addSecToken | Public ❗️ | 🛑  |NO❗️ |
| └ | setTokenTotals | Public ❗️ | 🛑  |NO❗️ |
||||||
| **DataLoadable** | Implementation | Owned, StLedger, StFees, StErc20 |||
| └ | loadSecTokenBatch | Public ❗️ | 🛑  | onlyOwner |
| └ | createLedgerEntry | Public ❗️ | 🛑  | onlyOwner |
| └ | addSecToken | Public ❗️ | 🛑  | onlyOwner |
| └ | setTokenTotals | Public ❗️ | 🛑  | onlyOwner |
||||||
| **SafeMath** | Library |  |||
| └ | add | Internal 🔒 |   | |
| └ | sub | Internal 🔒 |   | |
| └ | sub | Internal 🔒 |   | |
| └ | mul | Internal 🔒 |   | |
| └ | div | Internal 🔒 |   | |
| └ | div | Internal 🔒 |   | |
| └ | mod | Internal 🔒 |   | |
| └ | mod | Internal 🔒 |   | |
||||||
| **IChainlinkAggregator** | Interface |  |||
| └ | latestAnswer | External ❗️ |   |NO❗️ |
| └ | latestTimestamp | External ❗️ |   |NO❗️ |
| └ | latestRound | External ❗️ |   |NO❗️ |
| └ | getAnswer | External ❗️ |   |NO❗️ |
| └ | getTimestamp | External ❗️ |   |NO❗️ |
||||||
| **PayableLib** | Library |  |||
| └ | get_chainlinkRefPrice | Public ❗️ |   |NO❗️ |
| └ | setIssuerValues | Public ❗️ | 🛑  |NO❗️ |
| └ | pay | Public ❗️ | 🛑  |NO❗️ |
| └ | processSubscriberPayment | Private 🔐 | 🛑  | |
| └ | issuerPay | Public ❗️ | 🛑  |NO❗️ |
| └ | resetIssuerPaymentBatch | Internal 🔒 | 🛑  | |
| └ | getCashflowData | Public ❗️ |   |NO❗️ |
| └ | getIssuerPaymentBatch | Public ❗️ |   |NO❗️ |
||||||
| **StPayable** | Implementation | StErc20 |||
| └ | getCashflowData | Public ❗️ |   |NO❗️ |
| └ | getIssuerPaymentBatch | Public ❗️ |   |NO❗️ |
| └ | get_ethUsd | Public ❗️ |   |NO❗️ |
| └ | get_bnbUsd | Public ❗️ |   |NO❗️ |
| └ | <Receive Ether> | External ❗️ |  💵 | onlyWhenReadWrite |
| └ | receiveIssuerPaymentBatch | External ❗️ |  💵 | onlyWhenReadWrite |
| └ | setIssuerValues | External ❗️ | 🛑  | onlyWhenReadWrite |
||||||
| **Erc20Lib** | Library |  |||
| └ | whitelist | Public ❗️ | 🛑  |NO❗️ |
| └ | transfer | Public ❗️ | 🛑  |NO❗️ |
| └ | approve | Public ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | Public ❗️ | 🛑  |NO❗️ |
| └ | transferInternal | Private 🔐 | 🛑  | |
||||||
| **TransferLib** | Library |  |||
| └ | transferOrTrade | Public ❗️ | 🛑  |NO❗️ |
| └ | transfer_feePreview | Public ❗️ |   |NO❗️ |
| └ | transfer_feePreview_ExchangeOnly | Public ❗️ |   |NO❗️ |
| └ | applyOriginatorCcyFees | Private 🔐 | 🛑  | |
| └ | transferSplitSecTokens | Private 🔐 | 🛑  | |
| └ | transferSplitSecTokens_Preview | Private 🔐 |   | |
| └ | calcFeeWithCapCollar | Private 🔐 |   | |
| └ | applyFeeStruct | Private 🔐 |   | |
| └ | checkStIds | Private 🔐 |   | |
||||||
| **StErc20** | Implementation | StFees |||
| └ | whitelistMany | Public ❗️ | 🛑  | onlyOwner |
| └ | getWhitelist | External ❗️ |   |NO❗️ |
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | totalSupply | Public ❗️ |   |NO❗️ |
| └ | balanceOf | Public ❗️ |   |NO❗️ |
| └ | transfer | Public ❗️ | 🛑  |NO❗️ |
| └ | allowance | Public ❗️ |   |NO❗️ |
| └ | approve | Public ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | Public ❗️ | 🛑  |NO❗️ |
||||||
| **StFees** | Implementation | Owned, StLedger |||
| └ | getFee | External ❗️ |   | onlyOwner |
| └ | setFee_TokType | Public ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
||||||
| **StTransferable** | Implementation | Owned, StLedger, StFees, StErc20, StPayable |||
| └ | getLedgerHashcode | External ❗️ |   |NO❗️ |
| └ | transferOrTrade | Public ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | transfer_feePreview_ExchangeOnly | External ❗️ |   |NO❗️ |
| └ | transfer_feePreview | External ❗️ |   |NO❗️ |
||||||
| **StBurnable** | Implementation | Owned, StLedger |||
| └ | burnTokens | Public ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | getSecToken_totalBurnedQty | External ❗️ |   |NO❗️ |
||||||
| **StMintable** | Implementation | Owned, StLedger |||
| └ | mintSecTokenBatch | Public ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | addMetaSecTokenBatch | External ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | setOriginatorFeeTokenBatch | External ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | setOriginatorFeeCurrencyBatch | External ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | getSecToken_totalMintedQty | External ❗️ |   |NO❗️ |
||||||
| **CcyLib** | Library |  |||
| └ | addCcyType | Public ❗️ | 🛑  |NO❗️ |
| └ | getCcyTypes | Public ❗️ |   |NO❗️ |
| └ | fundOrWithdraw | Public ❗️ | 🛑  |NO❗️ |
| └ | fund | Private 🔐 | 🛑  | |
| └ | withdraw | Private 🔐 | 🛑  | |
||||||
| **strings** | Library |  |||
| └ | memcpy | Private 🔐 |   | |
| └ | toSlice | Internal 🔒 |   | |
| └ | len | Internal 🔒 |   | |
| └ | toSliceB32 | Internal 🔒 |   | |
| └ | copy | Internal 🔒 |   | |
| └ | toString | Internal 🔒 |   | |
| └ | len | Internal 🔒 |   | |
| └ | empty | Internal 🔒 |   | |
| └ | compare | Internal 🔒 |   | |
| └ | equals | Internal 🔒 |   | |
| └ | nextRune | Internal 🔒 |   | |
| └ | nextRune | Internal 🔒 |   | |
| └ | ord | Internal 🔒 |   | |
| └ | keccak | Internal 🔒 |   | |
| └ | startsWith | Internal 🔒 |   | |
| └ | beyond | Internal 🔒 |   | |
| └ | endsWith | Internal 🔒 |   | |
| └ | until | Internal 🔒 |   | |
| └ | findPtr | Private 🔐 |   | |
| └ | rfindPtr | Private 🔐 |   | |
| └ | find | Internal 🔒 |   | |
| └ | rfind | Internal 🔒 |   | |
| └ | split | Internal 🔒 |   | |
| └ | split | Internal 🔒 |   | |
| └ | rsplit | Internal 🔒 |   | |
| └ | rsplit | Internal 🔒 |   | |
| └ | count | Internal 🔒 |   | |
| └ | contains | Internal 🔒 |   | |
| └ | concat | Internal 🔒 |   | |
| └ | join | Internal 🔒 |   | |
||||||
| **SpotFeeLib** | Library |  |||
| └ | setFee_TokType | Public ❗️ | 🛑  |NO❗️ |
| └ | setFee_CcyType | Public ❗️ | 🛑  |NO❗️ |
||||||
| **TokenLib** | Library |  |||
| └ | addSecTokenType | Public ❗️ | 🛑  |NO❗️ |
| └ | setFuture_FeePerContract | Public ❗️ | 🛑  |NO❗️ |
| └ | setFuture_VariationMargin | Public ❗️ | 🛑  |NO❗️ |
| └ | getSecTokenTypes | Public ❗️ |   |NO❗️ |
| └ | mintSecTokenBatch | Public ❗️ | 🛑  |NO❗️ |
| └ | burnTokens | Public ❗️ | 🛑  |NO❗️ |
| └ | getSecToken | Public ❗️ |   |NO❗️ |
| └ | addMetaSecTokenBatch | Public ❗️ | 🛑  |NO❗️ |
| └ | setOriginatorFeeTokenBatch | Public ❗️ | 🛑  |NO❗️ |
| └ | setOriginatorFeeCurrencyBatch | Public ❗️ | 🛑  |NO❗️ |
||||||
| **LedgerLib** | Library |  |||
| └ | getLedgerEntry | Public ❗️ |   |NO❗️ |
| └ | getLedgerHashcode | Public ❗️ |   |NO❗️ |
| └ | hashStringArray | Private 🔐 |   | |
| └ | hashSetFeeArgs | Private 🔐 |   | |
||||||
| **StructLib** | Library |  |||
| └ | transferCcy | Public ❗️ | 🛑  |NO❗️ |
| └ | emitTransferedLedgerCcy | Public ❗️ | 🛑  |NO❗️ |
| └ | setReservedCcy | Public ❗️ | 🛑  |NO❗️ |
| └ | initLedgerIfNew | Public ❗️ | 🛑  |NO❗️ |
| └ | sufficientTokens | Public ❗️ |   |NO❗️ |
| └ | sufficientCcy | Public ❗️ |   |NO❗️ |
| └ | tokenExistsOnLedger | Public ❗️ |   |NO❗️ |
||||||
| **StLedger** | Implementation | Owned |||
| └ | addSecTokenType | Public ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | getSecTokenTypes | External ❗️ |   |NO❗️ |
| └ | getLedgerOwners | External ❗️ |   |NO❗️ |
| └ | getLedgerOwnerCount | External ❗️ |   |NO❗️ |
| └ | getLedgerOwner | External ❗️ |   |NO❗️ |
| └ | getLedgerEntry | External ❗️ |   |NO❗️ |
| └ | getSecTokenBatch_MaxId | External ❗️ |   |NO❗️ |
| └ | getSecTokenBatch | External ❗️ |   |NO❗️ |
| └ | getSecToken_BaseId | External ❗️ |   |NO❗️ |
| └ | getSecToken_MaxId | External ❗️ |   |NO❗️ |
| └ | getSecToken | External ❗️ |   |NO❗️ |
||||||
| **Owned** | Implementation |  |||
| └ | readOnly | External ❗️ |   |NO❗️ |
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | getOwners | External ❗️ |   |NO❗️ |
| └ | setReadOnly | External ❗️ | 🛑  | onlyOwner |
||||||
| **Collateralizable** | Implementation | Owned, StLedger |||
||||||
| **StMaster** | Implementation | StMintable, StBurnable, Collateralizable, StTransferable, DataLoadable, StFutures |||
| └ | getContractType | External ❗️ |   |NO❗️ |
| └ | getContractSeal | External ❗️ |   |NO❗️ |
| └ | sealContract | External ❗️ | 🛑  |NO❗️ |
| └ | version | External ❗️ |   |NO❗️ |
| └ | unit | External ❗️ |   |NO❗️ |
| └ | <Constructor> | Public ❗️ | 🛑  | StErc20 |
||||||
| **StMaster** | Implementation | StMintable, StBurnable, Collateralizable, StTransferable, DataLoadable, StFutures |||
| └ | getContractType | External ❗️ |   |NO❗️ |
| └ | getContractSeal | External ❗️ |   |NO❗️ |
| └ | sealContract | External ❗️ | 🛑  |NO❗️ |
| └ | version | External ❗️ |   |NO❗️ |
| └ | unit | External ❗️ |   |NO❗️ |
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
||||||
| **Collateralizable** | Implementation | Owned, StLedger |||
| └ | addCcyType | Public ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | getCcyTypes | External ❗️ |   |NO❗️ |
| └ | fundOrWithdraw | Public ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
||||||
| **Owned** | Implementation |  |||
| └ | readOnly | External ❗️ |   |NO❗️ |
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | getOwners | External ❗️ |   |NO❗️ |
| └ | setReadOnly | External ❗️ | 🛑  | onlyOwner |
||||||
| **StLedger** | Implementation | Owned |||
| └ | addSecTokenType | Public ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | getSecTokenTypes | External ❗️ |   |NO❗️ |
| └ | getLedgerOwners | External ❗️ |   |NO❗️ |
| └ | getLedgerOwnerCount | External ❗️ |   |NO❗️ |
| └ | getLedgerOwner | External ❗️ |   |NO❗️ |
| └ | getLedgerEntry | External ❗️ |   |NO❗️ |
| └ | getSecTokenBatch_MaxId | External ❗️ |   |NO❗️ |
| └ | getSecTokenBatch | External ❗️ |   |NO❗️ |
| └ | getSecToken_BaseId | External ❗️ |   |NO❗️ |
| └ | getSecToken_MaxId | External ❗️ |   |NO❗️ |
| └ | getSecToken | External ❗️ |   |NO❗️ |
||||||
| **StructLib** | Library |  |||
| └ | transferCcy | Public ❗️ | 🛑  |NO❗️ |
| └ | emitTransferedLedgerCcy | Public ❗️ | 🛑  |NO❗️ |
| └ | setReservedCcy | Public ❗️ | 🛑  |NO❗️ |
| └ | initLedgerIfNew | Public ❗️ | 🛑  |NO❗️ |
| └ | sufficientTokens | Public ❗️ |   |NO❗️ |
| └ | sufficientCcy | Public ❗️ |   |NO❗️ |
| └ | tokenExistsOnLedger | Public ❗️ |   |NO❗️ |
||||||
| **LedgerLib** | Library |  |||
| └ | getLedgerEntry | Public ❗️ |   |NO❗️ |
| └ | getLedgerHashcode | Public ❗️ |   |NO❗️ |
| └ | hashStringArray | Private 🔐 |   | |
| └ | hashSetFeeArgs | Private 🔐 |   | |
||||||
| **TokenLib** | Library |  |||
| └ | addSecTokenType | Public ❗️ | 🛑  |NO❗️ |
| └ | setFuture_FeePerContract | Public ❗️ | 🛑  |NO❗️ |
| └ | setFuture_VariationMargin | Public ❗️ | 🛑  |NO❗️ |
| └ | getSecTokenTypes | Public ❗️ |   |NO❗️ |
| └ | mintSecTokenBatch | Public ❗️ | 🛑  |NO❗️ |
| └ | burnTokens | Public ❗️ | 🛑  |NO❗️ |
| └ | getSecToken | Public ❗️ |   |NO❗️ |
| └ | addMetaSecTokenBatch | Public ❗️ | 🛑  |NO❗️ |
| └ | setOriginatorFeeTokenBatch | Public ❗️ | 🛑  |NO❗️ |
| └ | setOriginatorFeeCurrencyBatch | Public ❗️ | 🛑  |NO❗️ |
||||||
| **SpotFeeLib** | Library |  |||
| └ | setFee_TokType | Public ❗️ | 🛑  |NO❗️ |
| └ | setFee_CcyType | Public ❗️ | 🛑  |NO❗️ |
||||||
| **strings** | Library |  |||
| └ | memcpy | Private 🔐 |   | |
| └ | toSlice | Internal 🔒 |   | |
| └ | len | Internal 🔒 |   | |
| └ | toSliceB32 | Internal 🔒 |   | |
| └ | copy | Internal 🔒 |   | |
| └ | toString | Internal 🔒 |   | |
| └ | len | Internal 🔒 |   | |
| └ | empty | Internal 🔒 |   | |
| └ | compare | Internal 🔒 |   | |
| └ | equals | Internal 🔒 |   | |
| └ | nextRune | Internal 🔒 |   | |
| └ | nextRune | Internal 🔒 |   | |
| └ | ord | Internal 🔒 |   | |
| └ | keccak | Internal 🔒 |   | |
| └ | startsWith | Internal 🔒 |   | |
| └ | beyond | Internal 🔒 |   | |
| └ | endsWith | Internal 🔒 |   | |
| └ | until | Internal 🔒 |   | |
| └ | findPtr | Private 🔐 |   | |
| └ | rfindPtr | Private 🔐 |   | |
| └ | find | Internal 🔒 |   | |
| └ | rfind | Internal 🔒 |   | |
| └ | split | Internal 🔒 |   | |
| └ | split | Internal 🔒 |   | |
| └ | rsplit | Internal 🔒 |   | |
| └ | rsplit | Internal 🔒 |   | |
| └ | count | Internal 🔒 |   | |
| └ | contains | Internal 🔒 |   | |
| └ | concat | Internal 🔒 |   | |
| └ | join | Internal 🔒 |   | |
||||||
| **CcyLib** | Library |  |||
| └ | addCcyType | Public ❗️ | 🛑  |NO❗️ |
| └ | getCcyTypes | Public ❗️ |   |NO❗️ |
| └ | fundOrWithdraw | Public ❗️ | 🛑  |NO❗️ |
| └ | fund | Private 🔐 | 🛑  | |
| └ | withdraw | Private 🔐 | 🛑  | |
||||||
| **StMintable** | Implementation | Owned, StLedger |||
| └ | mintSecTokenBatch | Public ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | addMetaSecTokenBatch | External ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | setOriginatorFeeTokenBatch | External ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | setOriginatorFeeCurrencyBatch | External ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | getSecToken_totalMintedQty | External ❗️ |   |NO❗️ |
||||||
| **StBurnable** | Implementation | Owned, StLedger |||
| └ | burnTokens | Public ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | getSecToken_totalBurnedQty | External ❗️ |   |NO❗️ |
||||||
| **StTransferable** | Implementation | Owned, StLedger, StFees, StErc20, StPayable |||
| └ | getLedgerHashcode | External ❗️ |   |NO❗️ |
| └ | transferOrTrade | Public ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | transfer_feePreview_ExchangeOnly | External ❗️ |   |NO❗️ |
| └ | transfer_feePreview | External ❗️ |   |NO❗️ |
||||||
| **StFees** | Implementation | Owned, StLedger |||
| └ | getFee | External ❗️ |   | onlyOwner |
| └ | setFee_TokType | Public ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
| └ | setFee_CcyType | Public ❗️ | 🛑  | onlyOwner onlyWhenReadWrite |
||||||
| **StErc20** | Implementation | StFees |||
| └ | whitelistMany | Public ❗️ | 🛑  | onlyOwner |
| └ | getWhitelist | External ❗️ |   |NO❗️ |
||||||
| **TransferLib** | Library |  |||
| └ | transferOrTrade | Public ❗️ | 🛑  |NO❗️ |
| └ | transfer_feePreview | Public ❗️ |   |NO❗️ |
| └ | transfer_feePreview_ExchangeOnly | Public ❗️ |   |NO❗️ |
| └ | applyOriginatorCcyFees | Private 🔐 | 🛑  | |
| └ | transferSplitSecTokens | Private 🔐 | 🛑  | |
| └ | transferSplitSecTokens_Preview | Private 🔐 |   | |
| └ | calcFeeWithCapCollar | Private 🔐 |   | |
| └ | applyFeeStruct | Private 🔐 |   | |
| └ | checkStIds | Private 🔐 |   | |
||||||
| **Erc20Lib** | Library |  |||
| └ | whitelist | Public ❗️ | 🛑  |NO❗️ |
| └ | transfer | Public ❗️ | 🛑  |NO❗️ |
| └ | approve | Public ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | Public ❗️ | 🛑  |NO❗️ |
| └ | transferInternal | Private 🔐 | 🛑  | |
||||||
| **StPayable** | Implementation | StErc20 |||
||||||
| **PayableLib** | Library |  |||
| └ | get_chainlinkRefPrice | Public ❗️ |   |NO❗️ |
| └ | setIssuerValues | Public ❗️ | 🛑  |NO❗️ |
| └ | pay | Public ❗️ | 🛑  |NO❗️ |
| └ | processSubscriberPayment | Private 🔐 | 🛑  | |
| └ | issuerPay | Public ❗️ | 🛑  |NO❗️ |
| └ | resetIssuerPaymentBatch | Internal 🔒 | 🛑  | |
| └ | getCashflowData | Public ❗️ |   |NO❗️ |
| └ | getIssuerPaymentBatch | Public ❗️ |   |NO❗️ |
||||||
| **IChainlinkAggregator** | Interface |  |||
| └ | latestAnswer | External ❗️ |   |NO❗️ |
| └ | latestTimestamp | External ❗️ |   |NO❗️ |
| └ | latestRound | External ❗️ |   |NO❗️ |
| └ | getAnswer | External ❗️ |   |NO❗️ |
| └ | getTimestamp | External ❗️ |   |NO❗️ |
||||||
| **SafeMath** | Library |  |||
| └ | add | Internal 🔒 |   | |
| └ | sub | Internal 🔒 |   | |
| └ | sub | Internal 🔒 |   | |
| └ | mul | Internal 🔒 |   | |
| └ | div | Internal 🔒 |   | |
| └ | div | Internal 🔒 |   | |
| └ | mod | Internal 🔒 |   | |
| └ | mod | Internal 🔒 |   | |
||||||
| **DataLoadable** | Implementation | Owned, StLedger, StFees, StErc20 |||
| └ | loadSecTokenBatch | Public ❗️ | 🛑  | onlyOwner |
| └ | createLedgerEntry | Public ❗️ | 🛑  | onlyOwner |
| └ | addSecToken | Public ❗️ | 🛑  | onlyOwner |
| └ | setTokenTotals | Public ❗️ | 🛑  | onlyOwner |
||||||
| **LoadLib** | Library |  |||
| └ | loadSecTokenBatch | Public ❗️ | 🛑  |NO❗️ |
| └ | createLedgerEntry | Public ❗️ | 🛑  |NO❗️ |
| └ | addSecToken | Public ❗️ | 🛑  |NO❗️ |
| └ | setTokenTotals | Public ❗️ | 🛑  |NO❗️ |
||||||
| **StFutures** | Implementation | Owned, StLedger, StFees, StErc20, StPayable |||
||||||
| **FuturesLib** | Library |  |||
| └ | setLedgerOverride | Public ❗️ | 🛑  |NO❗️ |
| └ | initMarginOverride | Private 🔐 | 🛑  | |
| └ | feePerContractOverride | Private 🔐 | 🛑  | |
| └ | openFtPos | Public ❗️ | 🛑  |NO❗️ |
| └ | takePay2 | Public ❗️ | 🛑  |NO❗️ |
| └ | combineFtPos | Public ❗️ | 🛑  |NO❗️ |
| └ | calcTakePay | Private 🔐 |   | |
| └ | tokenTypeQtyOnledger | Private 🔐 |   | |
| └ | setReservedAllFtPos | Private 🔐 | 🛑  | |
| └ | calcPosMargin | Private 🔐 |   | |
| └ | abs256 | Private 🔐 |   | |
| └ | abs64 | Private 🔐 |   | |
||||||
| **Migrations** | Implementation |  |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | setCompleted | Public ❗️ | 🛑  | restricted |
| └ | upgrade | Public ❗️ | 🛑  | restricted |


 Legend

|  Symbol  |  Meaning  |
|:--------:|-----------|
|    🛑    | Function can modify state |
|    💵    | Function is payable |
