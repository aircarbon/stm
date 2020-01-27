# Exchange Integration Spec - draft v0.1
HydraX (HX) <-> AirCarbon [SekTokMaster (STM) v0.96]

## New Account Opening
The most important (phase 1) aspect is to link a HX account ID with an STM account ID (in ETH account format).
Presumably this amounts to not much more than an additional column on an existing HX [user] or [account] table, and an admin function for an AC operator to supply the STM account ID to HX for a given HX account.

Secondarily (phase 2) we would like to have a public account opening workflow UI (i.e. "sign up" functionality on HX public site) and an admin approval process that links into AC's third-party KYC system. I suggest we focus all efforts on phase 1 for now, as phase 2 is potentially a bit involved (with email workflows, exception states, and up integrations of up to three parties' APIs).

* ### Phase 1: manual admin account opening - linking to STM

New account field in HX admin UI/DB: ```stm_account``` *type: ETH account, length: 42 chars with leading '0x'*

* ### Phase 2: automated public account opening - integrated with AC KYC
HX account opening (pre-open) HX public UI (i.e. customer "create account" UI) to include fields for KYC elements required by AC's KYC vendor (**TBD**)
HX opening flow to include await sync. OK return from AC API (**TBD**)

## Data Ingress & Reconciliation
New fields in HX DB to capture STM currency & token balance data, e.g:
* [account] 1 - n [stm_ccy] // account has multiple (extendible) currency-type balances
* [account] 1 - n [stm_tok] // account has multiple (extendible) token-type balances

Periodic fetches by HX from STM public Web3 APIs:
* > ```function getCcyTypes() external view returns (StructLib.GetCcyTypesReturn memory)```
* > ```function getSecTokenTypes() external view returns (StructLib.GetSecTokenTypesReturn memory)``` 
* > ```function getLedgerEntry(address account) external view returns (StructLib.LedgerReturn memory)```

## Exchange: Data Display, Transforms & Markets
It can be seen that for each account there are (returned by ```getLedgerEntry()```):
 * *n* currency-types and *n* associated currency balances 
 * *m* token-types and *m* associated token balances 

For trading purposes we would like to aggregate the token balances and token types so that a single consolidated token balance is displayed to the user, and we would like to keep separate the currency balances and currency types. Currency balances are the collateral used by a buying counterparty in a trade, and the token balances are the commodity transfered by the selling counterparty in a trade.

For portoflio viewing purposes, we would like to separate tokens by token-type, to view individual token IDs in each token-type, and have a link to our contract Explorer for each unique token ID.

### Phase 1: multiple markets
There are *n* separate currency-token markets active in HX at any point in time, where *n* == ```getCcyTypes().length```

### Phase 2: combined markets [collateral swaps]
We would like to achieve cross-ccy automation, e.g. if a seller put s up 100 tokens in the token-BTC market and a buyer puts up an order for 100 tokens in the USD market, we would like the system to match the two orders and perform a "collateral swap" of BTC and USD. This needs further thought and is Phase 3 - **TBD**.

## Exchange: Order Entry & Fee Previews
Fees are applied on each trade (potentially on both currencies and tokens) - and are applied in addition to the token and currency values supplied to the trade API.

Therefore, the order entry UX needs to query the STM contract to preview the fees payable on a trade, in order to determine if both sides have sufficient balance to cover the requested transfer amounts and the fees:

* > ```function transfer_feePreview(StructLib.TransferArgs calldata a) external view returns (StructLib.FeesCalc[1 + MAX_BATCHES_PREVIEW * 2] memory feesAll)```

## Exchange: Trade Execution & Settlement

* > Phase 1 - *TBD* trade execution will be through a private permissioned API, but passing ```StructLib.TransferArgs```, i.e. identical in format to ```transfer_feePreview```

## Exchange: Withdraw & Deposit (Tokens)

HX UI for a logged-in user to request withdrawal (aka. self-custody) of tokens from STM to their own wallet.
* > Phase 1 - *TBD* token withdraw will be through a private permissioned API

HX UI for a logged-in user to view a deposit address for deposit of tokens from their own wallet into STM.
* > Phase 1 - read only: the UI only needs to show the ```stm_account``` for the logged-in user.
* > Phase 1 - for detection of deposited funds: suggest that the "deposit tokens" screen polls ```getLedgerEntry``` to display deposit balance updates in near real-time.

## Exchange: Withdraw & Deposit (Currency Collateral)

HX UI for a logged-in user to request withdrawal of currency (fiat or crypto) from AC custody to their own wallet or fiat account.
* > Phase 1 (fiat) - *TBD* fiat collateral withdraw will be through a private permissioned API
* > Phase 2 (crypto) - *TBD* crypto collateral withdraw will be through a private permissioned API

HX UI for a logged-in user to request/inform of deposit of currency (fiat or crypto) from their own wallet or fiat account into AC custody.
* > Phase 1 (fiat) - *TBD* fiat collateral deposit will be through a private permissioned API
* > Phase 2 (crypto) - *TBD* crypto collateral deposit withdraw will be through a private permissioned API
