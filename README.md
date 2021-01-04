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
Create the following .env config files, using the `.env.example` as a template:
`.env.local` => localhost, debug instance
`.env.DEMO` => DEV AWS, DEMO instance
`.env.UAT` => DEV AWS, UAT instance
`.env.DEV` => DEV AWS, DEV instance
`.env.AC_TEST_1` => TEST(AC PrivateNet), Test1 instance

## Dual Mode (CONTRACT_TYPE)
Operates as a semi-fungible (multi-minting batch, multi-type) COMMODITY token, or as a fungible (single-minting batch, single-type) CASHFLOW token.

## Target environment
Set with `INSTANCE_ID` env var to one of: `local`, `DEV`, `DEMO`, or `UAT` to control pre-processor, contract deployment prefix and contract database.
Pre-processor `process_sol_js` and migration script `2_deploy_contract.js` use this env var to load config from .env files, e.g. `.env.local`, `.env.UAT`, etc.

## (1) Pre-process & compile
Invoke `process_sol_js` to pre-process .sol and .js files, based on detected `CONTRACT_TYPE`:
- `node process_sol_js`

Pre-process, compile & output bytecode sizes (see `StMaster.sol` re. 24k bytecode limit):
- `node process_sol_js && truffle compile --reset --all && grep \"bytecode\" build/contracts/* | awk '{print $1 " " length($3)/2}'`

## (2) Pro-process, compile & migrate (Deploy) Contracts
- `export INSTANCE_ID=local && node process_sol_js && truffle migrate --network development --reset` (ganache-cli local node)
- `export INSTANCE_ID=DEV && node process_sol_js && truffle migrate --network ropsten_ac --reset` (Deploy AWS DEV instance using AirCarbon's Ropsten Geth node)
- `export INSTANCE_ID=UAT && node process_sol_js && truffle migrate --network bsc_testnet_bn --reset` (Deploy AWS UAT instance using Infura Ropsten)
- `export INSTANCE_ID=DEMO && node process_sol_js && truffle migrate --network bsc_testnet_bn --reset` (Deploy AWS DEMO instance on AirCarbon's privnet)

PROD: WIP/TESTING...
- `export INSTANCE_ID=PROD_1 && node process_sol_js && truffle migrate --network mainnet_ac --reset` (Deploy AWS PROD instance on ETH Mainnet)
- `export INSTANCE_ID=PROD_52101 && node process_sol_js && truffle migrate --network prodnet_ac --reset` (Deploy AWS PROD instance on AC Private Prodnet Chain)
- `export INSTANCE_ID=PROD_56 && node process_sol_js && truffle migrate --network bsc_mainnet_ac --reset` (Deploy AWS PROD instance on BSC Mainnet)

## Whitelist & seal Deployed Contract
For setup of deployed contract ready for use, see `04_Web3_INIT_MULTI_DATA_AC.js` web3 test(s), to: add addresses to the contract's whitelist, seal the contract and optionally submit test transactions/data.

Then need to populate the whitelist addresses and oracle price setting to our DB with below command.

```sh
# More usages on dbInit.js
INSTANCE_ID=local && node dbInit.js
```

## Run Tests
- `export INSTANCE_ID=local && node process_sol_js && truffle compile` or (undocumented) `... truffle compile --reset` if it keeps recompiling when there aren't any changes in the Solidity
- `export INSTANCE_ID=local && node process_sol_js && truffle test --network development`

## Docs
- `npx soldoc --output html ./contracts/interfaces/docs/soldoc ./contracts/Interfaces`
- `npx solidity-docgen -i ./contracts/interfaces -o ./contracts/interfaces/docs/solidity-docgen --contract-pages`

## Dbg - misc
If you see `Error: invalid reporter "eth-gas-reporter"` -- try running `npm i` in ./packages/erc20

