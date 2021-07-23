
# Exchange Integration Spec
HydraX (HX) <-> AirCarbon [SekTokMaster (STM)]

> ac-ex-api v0.1 - transferOrTrade() [AC] > DONE
> 2FA, IP whitelisting, password complexity max. [HX]
> demo: trading through ac-ex-api from HX front-end, two test accounts [HX]

## Testnet Contract
See ./HX-INFO.md

## Contract Explorer
https://dev-explorer.aircarbon.co

## Dev Private Permissioned API
https://dev-ac-ex-api.aircarbon.co/

## Public Web3 Views
See ../IPublicViews.sol

## New Account Opening (Beta: User-Management)
For Beta, the required functionality is:
 * to associate a new HX account ID with an STM account ID (in ETH account format), i.e. an additional column on an existing HX [user] or [account] table;
 * a (new in STM v0.96k) contract function (wrapped by ac-ex-api) to release a one-time-use / one-time-associated whitelist address (aka. STM account ID) to HX;
 * to link (and keep synchronsised) a HD login (username/password) with an AC Explorer login.

(For UAT we would also like to have a public account opening workflow UI (i.e. "sign up" functionality on HX public site) and an admin approval process that specifically links into AC's third-party KYC system. UAT (3rd-party KYC integration) is out of scope for Beta, as it involves email workflows, exception states, and integrations with other parties' (KYC) APIs.)

### Beta: manual admin account opening - linking to STM
New HX login: HX admin calls AC User-Management API to release a new whitelist ("WL") address;
New account field in HX admin UI/DB: ```stm_account``` to record AC-released WL address - *type: ETH account, length: 42 chars with leading '0x'*
Update HX login password (or any other HX-master fields as may be identified, e.g. email): HX calls AC User-Management API to update password hash (goal: Explorer & HX logins are always sync'd)

### (UAT: automated public account opening - integrated with AC KYC) (**TBD**)
HX account opening (pre-open) HX public UI (i.e. customer "create account" UI) to include fields for KYC elements required by AC's KYC vendor (**TBD**)
HX opening flow to include await sync. OK return from AC API (**TBD**)

## Data Ingress & (One-Way) Reconciliation
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

Currency balances are the collateral used by a buying counterparty in a trade, and the token balances are the commodity transfered by the selling counterparty in a trade. For portfolio viewing purposes, we would like to separate tokens by token-type, to view individual token IDs in each token-type, and have a link to our contract Explorer for each unique token ID.

### Beta: multiple markets
There are *n* separate currency-token markets active in HX at any point in time, where *n* == ```getCcyTypes().length```

### (UAT: combined markets [collateral swaps]) (**TBD**)
We would like to achieve cross-ccy automation, e.g. if a seller put s up 100 tokens in the token-BTC market and a buyer puts up an order for 100 tokens in the USD market, we would like the system to match the two orders and perform a "collateral swap" of BTC and USD. (**TBD**)

## Beta: Exchange - Order Entry & Fee Previews
Fees are applied on each trade (potentially on both currencies and tokens) - and are applied in addition to the token and currency values supplied to the trade API. Therefore, the order entry UX needs to query the STM contract to preview the fees payable on a trade, in order to determine if both sides have sufficient balance to cover the requested transfer amounts and the fees:
* > ```function transfer_feePreview(StructLib.TransferArgs calldata a) external view returns (StructLib.FeesCalc[1 + MAX_BATCHES_PREVIEW * 2] memory feesAll)```

## Beta: Exchange - Trade Fills & Settlement
* > Phase 1 - *TBD* trade execution will be through a private permissioned API (```ac-ex-api```), but passing ```StructLib.TransferArgs```, i.e. identical in format to ```transfer_feePreview```

### Beta: Exchange - trade fill pending state
HX should show the ETH TX on the UI, and should show status "pending" until confirmed at least once by the network. While pending, the UI should optimistically amend the buyer and seller available balance, i.e. decrease token and currency balances for buyer and seller. Upon confirmation it should requery STM via ```getLedgerEntry()``` to update the confirmed ledger balances. HX should detect the case of TXs being reverted by the network for any reason, and should unwind the optimistic updates, again by requerying STM via ```getLedgerEntry()```.

TX IDs (confired or reverted) should be persisted in the HX trade table for historical display in the users' pending & completed trade views.

### Beta: Exchange - confirmed (settled) trade fill events
HX should show associated event data for trade fills; these include events that relate to (token and currency) fees paid by buyer and seller on each fill.

## Beta: Withdraw & Deposit [Fiat Currency Collateral]
HX UI for a logged-in user to request withdrawal of currency (fiat or crypto) from AC custody to their own wallet or fiat account.
* > Beta (fiat) - fiat collateral withdraw will be through a private permissioned API
HX UI for a logged-in user to request/inform of deposit of currency (fiat or crypto) from their own wallet or fiat account into AC custody.
* > Beta (fiat) - fiat collateral deposit will be through a private permissioned API

====

## (UAT: Withdraw & Deposit [Crypto Currency Collateral]) (**TBD**)
HX UI for a logged-in user to request withdrawal of currency (fiat or crypto) from AC custody to their own wallet or fiat account.
* > UAT (crypto) - crypto collateral withdraw will be through a private permissioned API (**TBD**)
HX UI for a logged-in user to request/inform of deposit of currency (fiat or crypto) from their own wallet or fiat account into AC custody.
* > UAT (crypto) - rypto collateral deposit withdraw will be through a private permissioned API (**TBD**)

## (UAT: Exchange: Withdraw & Deposit [Tokens]) (**TBD**)
HX UI for a logged-in user to request withdrawal (aka. self-custody) of tokens from STM to their own wallet.
* > *TBD* token withdraw will be through a private permissioned API (**TBD**)
HX UI for a logged-in user to view a deposit address for deposit of tokens from their own wallet into STM.
* > read only: the UI only needs to show the ```stm_account``` for the logged-in user (**TBD**)
* > for detection of deposited funds: suggest that the "deposit tokens" screen polls ```getLedgerEntry``` to display deposit balance updates in near real-time (**TBD**)

