# SekTokMaster (STM) v0.96 - Overview

## Contract Type - Commodity or Cashflow
STM is an Ethereum contract comprising:

    (a) an asset-backed, multi-type token/collateral atomic trading & settlement engine,
    
    (b) ERC20 (partial) implementation (exc. transferFrom, transferFrom, approve) and permission semantics on withdrawn tokens, and
    
    (c) ETH subscriber cashflow processing of (USD-priced or ETH-priced) token issuances, and (d) (WIP) ETH issuer cashflow processing of CFT-equity or CFT-loan payments. 

STM is configured at deployment time to one of the following two types:
* Commodity token (CT):  a semi-fungible (multi-batch), multi-type commodity underlying; or
* Cashflow token (CFT): a fully-fungible (single-batch), single-type cashflow-generating underlying.

## Functionality: Core (CT)
Core features of STM include:
* Multi-type token & multi-currency (collateral) ledger
* Minting of tokens in batch(es) *[permission: owner-only]*
* Funding and withdrawing of collateralized ledger fiat and crypto currency *[permission: owner-only]*
* Whitelisting addresses: marks ledger accounts as accessible by owner for internal exchange transfers and trades *[permission: owner-only, pre-sealed only]*
* One-time sealing of the contract: locks down the whitelist (owner-accessible) ledger entries *[permission: owner-only]*
* Internal trade of token(s) and currency across whitelist ledger entries: exchange trade & atomic settlement *[permission: owner-only]*
* Transfer of token(s) from whitelist to non-whitelist ledger entries: exchange token withdrawal *[permission: owner-only]*
* Transfer of token(s) from non-whitelist ledger entry (A->B): ERC20 transfer & exchange deposit *[permission: A-only]*
* Previewable multi-level fee structure: capped & collared fixed + basis points fees, configurable (separately or jointly to currency & tokens) globally for all exchange trades, overridable for specific ledger accounts and applicable cumulatively for trade batch originator(s) *[permission: owner-only]*
* Extensibility: adding currency and token types *[permission: owner-only]*
* Upgradability: 100% data storage coverage for batched data write functions, mapped 1-1 with public read views, for verifiable cross-contract backup/restore *[permission: owner-only]*
* Verifiability: 100% data storage coverage of aggregated global keccak256 hash *[permission: public]*

## Core Design: Ledger
* Tokens are uniquely identifiable by a uint256 ID, are associated with a unique token type uint256 ID and are minted as part of a token batch.
* Each batch is uniquely identifiable by a uint64 ID and contains supplementary metadata in string KVP format, including IPFS document hash(es).
* Ledger entries consist of a mapping of token types to token IDs, and a mapping of currency types to currency (collateral) balances.

## Web3 Public Interface
TODO: see: ./interfaces/IPublicViews.html ...

## Exchange Private Interface
TODO: document exchange interface & flow ...


