// @ts-check
const fs = require('fs');
const argv = require('yargs-parser')(process.argv.slice(2));
// @ts-ignore artifacts from truffle
const StMaster = artifacts.require('StMaster');

const CONST = require('./const');
const { helpers } = require('../utils-common/dist');

process.on('unhandledRejection', console.error);

/**
 * Usage: `truffle exec backup.js -s=ADDR [--network <name>] [--compile]`,
 * @link https://github.com/trufflesuite/truffle/issues/889#issuecomment-522581580
 */
module.exports = async (callback) => {
  const contractAddress = `0x${argv?.s}`.toLowerCase();

  // return error if not a valid address
  if (!contractAddress.match(/^0x[0-9a-f]{40}$/i)) {
    return callback(new Error(`Invalid address: ${contractAddress}`));
  }

  const contract = await StMaster.at(contractAddress);

  // TODO: support different contract types
  // skip if contract type is not commodity
  const contractType = await contract.getContractType();
  if (Number(contractType) !== Number(CONST.contractType.COMMODITY)) {
    callback(`Invalid contract type: ${contractType}`);
    return;
  }

  // get contract info
  const owners = await contract.getOwners();
  const unit = await contract.unit();
  const symbol = await contract.symbol();
  const decimals = await contract.decimals();
  const network = argv?.network || 'development';
  // Note: we might got to { code: -32000, message: 'execution reverted' } on BSC Mainnet/Testnet with Binance nodes
  // only works with our private node
  const ledgerHash = await CONST.getLedgerHashcode(contract);
  const name = await contract.name();
  const version = await contract.version();
  console.log(`Contract address: ${contractAddress}`);
  console.log(`Name: ${name}`);
  console.log(`Version: ${version}`);

  // get all ccy and token types
  const ccyTypes = await contract.getCcyTypes();
  const { ccyTypes: currencyTypes } = helpers.decodeWeb3Object(ccyTypes);
  console.log(
    `Currency types`,
    currencyTypes.map((ccy) => ({
      id: ccy.id,
      name: ccy.name,
      unit: ccy.unit,
      decimals: ccy.decimals,
    })),
  );
  const tokTypes = await contract.getSecTokenTypes();
  const { tokenTypes } = helpers.decodeWeb3Object(tokTypes);
  console.log(`Token types`, tokenTypes);

  // get ledgers
  const ledgerOwners = await contract.getLedgerOwners();
  const ledgers = await Promise.all(ledgerOwners.map((owner) => contract.getLedgerEntry(owner)));

  // get all batches
  const batchesPromise = [];
  const maxBatchId = await contract.getSecTokenBatch_MaxId();
  for (let index = 1; index <= maxBatchId; index++) {
    batchesPromise.push(contract.getSecTokenBatch(index));
  }
  const batches = await Promise.all(batchesPromise);

  const whitelistAddresses = await contract.getWhitelist();

  // write backup to json file
  const backup = {
    info: {
      network,
      contractAddress,
      contractType,
      ledgerHash,
      name,
      version,
      owners,
      symbol,
      unit,
      decimals,
    },
    data: {
      whitelistAddresses,
      ledgerOwners,
      ccyTypes: currencyTypes.map((ccy) => ({
        id: ccy.id,
        name: ccy.name,
        unit: ccy.unit,
        decimals: ccy.decimals,
      })),
      tokenTypes,
      ledgers: ledgers.map((ledger) => helpers.decodeWeb3Object(ledger)),
      batches: batches.map((batch) => helpers.decodeWeb3Object(batch)),
    },
  };

  // write backup to json file
  const backupFile = `data/${contractAddress}.json`;
  console.log(`Writing backup to ${backupFile}`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

  callback();
};
