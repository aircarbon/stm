// @ts-check
const fs = require('fs');
const argv = require('yargs-parser')(process.argv.slice(2));
// @ts-ignore artifacts from truffle
const StMaster = artifacts.require('StMaster');

const CONST = require('./const');

/**
 * Usage: `truffle exec backup.js -a=ADDR [--network <name>] [--compile]`,
 * @link https://github.com/trufflesuite/truffle/issues/889#issuecomment-522581580
 */
module.exports = async (callback) => {
  const contractAddress = `0x${argv?.a || '0000000000000000000000000000000000000000!'}`;

  const contract = await StMaster.at(contractAddress);

  // TODO: support different contract types
  // skip if contract type is not commodity
  const contractType = await contract.getContractType();
  if (Number(contractType) !== Number(CONST.contractType.COMMODITY)) {
    callback(`Invalid contract type: ${contractType}`);
    return;
  }

  const owners = await contract.getOwners();
  const unit = await contract.unit();
  const symbol = await contract.symbol();
  const decimals = await contract.decimals();
  const ledgerHash = await CONST.getLedgerHashcode(contract);
  const name = await contract.name();
  const version = await contract.version();
  // show debug info
  console.log(`Contract address: ${contractAddress}`);
  console.log(`Ledger hash: ${ledgerHash}`);
  console.log(`Name: ${name}`);
  console.log(`Version: ${version}`);

  // get all ccy and token types
  const ccyTypes = await contract.getCcyTypes();
  const tokenTypes = await contract.getSecTokenTypes();
  // show debug info
  console.log(`Currency types: ${ccyTypes}`);
  console.log(`Token types: ${tokenTypes}`);

  // get all whitelists addresses
  const whitelistAddresses = await contract.getWhitelist();

  // get all ledger owners and their entry
  const ledgerOwners = await contract.getLedgerOwners();
  const ledgers = await Promise.all(ledgerOwners.map((owner) => contract.getLedgerEntry(owner)));
  // show debug info
  console.log(`Ledger owners: ${ledgerOwners}`);

  // get all batches
  const batchesPromise = [];
  const maxBatchId = await contract.getSecTokenBatch_MaxId();
  for (let index = 1; index <= maxBatchId; index++) {
    batchesPromise.push(contract.getSecTokenBatch(index));
  }
  const batches = await Promise.all(batchesPromise);

  // write backup to json file
  const backup = {
    info: {
      network: argv?.network || 'development',
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
      ccyTypes,
      tokenTypes,
      whitelistAddresses,
      ledgerOwners,
      ledgers,
      batches,
    },
  };

  // write backup to json file
  const backupFile = `data/${contractAddress}.json`;
  console.log(`Writing backup to ${backupFile}`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

  callback(backupFile);
};
