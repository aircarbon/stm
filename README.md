# SecTokMaster - Security Token Master (ERC20 [partial] Compatible Commodity or Cashflow Token)

[Overview](./contracts/Interfaces/docs/OVERVIEW__STM.md)

## Setup
- `npm install`
- `npm i truffle -g`
- `npm i ganache-cli -g`

## Run local node
- `ganache-cli --accounts 1024 --networkId 888 --mnemonic "educate school blast ability display bleak club soon curve car oil ostrich" --gasLimit 7800000`
 > runs with a large number of accounts (the tests require more than 10 built into `truffle develop`)
 > runs with custom network ID 888
 > runs with gas limit ~= reported default geth Ropsten-connected node gas limit
 > runs with InstaMining by default
 > OR (better, for individual dev account separation by networkId): from repo root: `yarn ganache` after change NETWORK_ID=xxx in .env files.

## Configs
Create the following .env config files, using the `.env.example` example:
`.env.DEMO`  => DEV AWS, DEMO instance
`.env.UAT`   => DEV AWS, UAT instance
`.env.DEV`   => DEV AWS, DEV instance
`.env.local` => localhost, debug instance

## Dual Mode (CONTRACT_TYPE)
Operates as a semi-fungible (multi-minting batch, multi-type) COMMODITY token, or as a fungible (single-minting batch, single-type) CASHFLOW token.

## Migrate (Deploy) Contracts
Set `INSTANCE_ID` environment variable to one of: `local`, `DEV`, `DEMO`, or `UAT` to control contract deployment prefix and database.
Migration script `2_deploy_contract.js` will pickup this env var and deploy a test contract accordingly.
- `export INSTANCE_ID=local && truffle migrate --network development --reset` (ganache-cli local node)
- `export INSTANCE_ID=DEV && truffle migrate --network ropsten_ac --reset` (Deploy AWS DEV instance using AirCarbon's ropsten Geth node)
- `export INSTANCE_ID=UAT && truffle migrate --network ropsten_inufra --reset` (Deploy AWS UAT instance using Infura Ropsten)
- `export INSTANCE_ID=DEMO && truffle migrate --network rinkeby_infura --reset` (Deploy AWS DEMO instance using Infura Rinkeby)

## Whitelist & seal Deployed Contract
For setup of deployed contract ready for use, see `04_Web3_INIT_MULTI_DATA_AC.js` web3 test(s), to: add addresses to the contract's whitelist, seal the contract and optionally submit test transactions/data.

## Run Tests
- `truffle compile` or (undocumented) `truffle compile --reset` if it keeps recompiling when there aren't any changes in the Solidity
- `truffle test --network development`

## Docs
- `npx soldoc --output html ./contracts/interfaces/docs/soldoc ./contracts/Interfaces`
- `npx solidity-docgen -i ./contracts/interfaces -o ./contracts/interfaces/docs/solidity-docgen --contract-pages`

## Dbg - misc
If you see `Error: invalid reporter "eth-gas-reporter"` -- try running `npm i` in ./packages/erc20

## Dbg - `truffle develop`
- `truffle develop`
  > note: tests will fail with `develop`'s built-in ganache instance (not enough test accounts)
- `migrate`
- `AcMaster.deployed().then((i) => { ac=i })`
- `` AcMaster.MintedSecTokenBatch({}).watch((err,res) => { console.log(`MintedSecTokenBatch... id = ${res.args.id}`) }) ``
- `ac.methods`
- `ac.mintSecTokenBatch(1, 1000, 1, '0xc3241d546dDE0Bf0A42BE0b3fEe70Da17ad724c9', { ccy_mirrorFee: false, ccy_perThousand: 0, fee_fixed: 1, fee_percBips: 10, fee_min: 0, fee_max: 0 }, 0, [], [])`
- `ac.getLedgerEntry('0xc3241d546dDE0Bf0A42BE0b3fEe70Da17ad724c9')`
- `ac.getSecToken(1)`
