# AirCarbon - ERC20 AirCarbon EEU Contract

## Setup

- `npm install`
- `npm i truffle -g`
- `npm i ganache-cli -g`

## Run local node

- `ganache-cli -a 100 -i 888`
  > runs with 100 accounts (tests require more than 10 built into `truffle develop`)
  > runs with custom network ID 888
  > runs with InstaMining by default

## Run Tests

- `truffle compile`
- `truffle test --network development`

## Migrate (Deploy) Contracts

- `truffle migrate --network development` (ganache-cli local node)
- `truffle migrate --network ropsten_scoop` (scoop's ropsten geth node)
- `truffle migrate --network rinkeby_infura` (infura rinkeby is much faster than infura ropsten)

## Dbg - `truffle develop`

- `truffle develop`

  > note: tests will fail with `develop`'s built-in ganache instance (not enough test accounts)\

- `migrate`
- `AcMaster.deployed().then((i) => { ac=i })`
- `` AcMaster.MintedEeuBatch({}).watch((err,res) => { console.log(`MintedEeuBatch... id = ${res.args.id}`) }) ``
- `ac.methods`
- `ac.mintEeuBatch(0, 1, '0xc3241d546dDE0Bf0A42BE0b3fEe70Da17ad724c9')`
- `ac.getLedgerEntry('0xc3241d546dDE0Bf0A42BE0b3fEe70Da17ad724c9')`
- `ac.getEeus()`

## WIP - TODOs

    ### contract - extendability
    * move EeuType separate contract, return as [] -- for dynamic support of new types
    * make usdCents & ethWei [] to CollateralType[], extendible - same as EeuType
    * tests - re. extending "Types" contract

    ### contract - core fn's
    * trade/transfer, inc. token split & merge
    * IPFS pointers & URL pointers for batch minting

    ### contract - ERC721-compat
    * ERC721 interface/compat: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
    * ** one vEEU = one ("size/KG-mutable") NFT **
    * (more like "semi-fungable token" (i.e. IFF sizes of two same-type NFT-EEUs are same, they are actually fungible while sizes are the same))

    ### contract - security
    * global contract-paused flag (admin)

    ### ac-admin - web3/JS
    * authentication & action-logging (implies DB)
    * contract-action invoker (one page per action)
    * contract event viewer (new & historic)
    * ledger viewer/summary
    * proto-TX-explorer
    * API layer (separate deployment to ac-admin?)
