# StMaster (STM) v1.0 - Overview

## Contract Type - Commodity or Cashflow
STM is configured at deployment time to one of:
* Commodity token (CT): a semi-fungible (multi-batch), multi-type & single-version commodity underlying; or
* Cashflow token (CFT): a fully-fungible, multi-type & multi-version (recursive/linked contract deployments) cashflow-generating underlyings.

It is an EVM-compatible (Solidity language) set of smart contracts, comprising:

    (a) asset-backed, multi token/collateral-type atomic spot cash collateral trading & on-chain settlement;
    (b) scalable, semi-fungible & metadata-backed extendible type-system;
    (c) upgradable contracts: cryptographic checksumming of v+0 and v+1 contract data fields;
    (d) full ERC20 implementation (inc. transferFrom, allowance, approve) for self-custody;
    (e) multiple reserved contract owner/operator addresses, for concurrent parallel/batched operations via independent account-nonce sequencing;
    (f) split ledger: hybrid permission semantics - owner-controller ("whitelisted") addresses for centralised spot trade execution, alongside third-party controlled ("graylisted") addresses for self-custody;
    (g) generic metadata batch minting via extendible (append-only, immutable) KVP collection;
    (h) hybrid on/off chain futures settlement engine (take & pay period processing, via central clearing account), with on-chain position management & position-level P&L;
    (i) WIP: CFT - decentralized issuance & corporate actions: subscriber cashflow (e.g. ETH/BNB) processing of (USD-priced or ETH/BNB-priced) token issuances, and (inversely) issuer cashflow processing of CFT-equity or CFT-loan payments. 

## Functionality: Core (CT)
Features of STM include:
* Multi-type token & multi-collateral currency split ledger
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
* Operations: multi-owner permission model (ctor to accept addr[], & onlyOwner() tweak)
* WIP: futures

## Functionality: Cashflow (CFT)
* Type-delegation to nested child contract instance(s) [max 1-depth recursive]
* WIP: bond repayment/structure table
* WIP: issuer cashflow payments (todo: admin batching, PayableLib handling)
* WIP: ERC1404 & on-chain KYC whitelisting

## Core Design: Ledger
* Tokens are uniquely identifiable by a uint256 ID, are associated with a unique token type uint256 ID and are minted as part of a token batch.
* Each batch is uniquely identifiable by a uint64 ID and contains supplementary metadata in string KVP format, including IPFS document hash(es).
* Ledger entries consist of a mapping of token types to token IDs, and a mapping of currency types to currency (collateral) balances.

...


