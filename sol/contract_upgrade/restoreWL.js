// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms

// @ts-check
const { soliditySha3 } = require('web3-utils');
const fs = require('fs');
const path = require('path');
const { toBN } = require('web3-utils');
const chalk = require('chalk');
const argv = require('yargs-parser')(process.argv.slice(2));
// @ts-ignore artifacts from truffle
const StMaster = artifacts.require('StMaster');
const series = require('async/series');

const { getLedgerHashOffChain } = require('./utils');
const CONST = require('../const');
const { exit } = require('process');

process.on('unhandledRejection', console.error);

// how many items to process in one batch
const WHITELIST_COUNT = 5000;
const WHITELIST_CHUNK_SIZE = 100;

// create a sleep function to be used in the async series
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Usage: `INSTANCE_ID=local truffle exec upgrade_contract/restoreWL.js -s=ADDR -t=NEW_ADDR  -h=[offchain|onchain] [--network <name>] [--compile]`,
 * @link https://github.com/trufflesuite/truffle/issues/889#issuecomment-522581580
 */
module.exports = async (callback) => {
  console.time('restoreWL');
  const contractAddress = `0x${argv?.s}`.toLowerCase();
  const newContractAddress = `0x${argv?.t}`.toLowerCase();

  // return error if not a valid address
  if (!contractAddress.match(/^0x[0-9a-f]{40}$/i)) {
    return callback(new Error(`Invalid backup address: ${contractAddress}`));
  }
  if (!newContractAddress.match(/^0x[0-9a-f]{40}$/i)) {
    return callback(new Error(`Invalid target address: ${newContractAddress}`));
  }

  // read data from json file
  const dataDir = path.join(__dirname, 'data');
  const backupFile = path.join(dataDir, `WL-${contractAddress}.json`);
  const { info, wlHash: sourceWlHash, count: sourceWlCount, whitelistAddresses } = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

  // deploy new contract with info
  const newContract = await StMaster.at(newContractAddress);
  // show debug info in table format
  console.log(chalk.yellow(`${info.name} (${info.version})`));

  // get contract info
  const name = await newContract.name();
  const version = await newContract.version();
  console.log('Restore WL addresses from source (and create additional if any)')
  console.log(`New contract address: ${newContract.address}`);
  console.log(`Name: ${name}`);
  console.log(`Version: ${version}`);

  // whitelisting addresses to new contract
  const whitelistAddressesOnTarget = await newContract.getWhitelist();
  console.log('# of WL Addresses on Target', whitelistAddressesOnTarget.length);
  const additionalWLAddresses = [];
  for (let i = whitelistAddresses.length; i < WHITELIST_COUNT; i++) {
    // note - we include account[0] owner account in the whitelist
    const x = await CONST.getAccountAndKey(i);
    if (!whitelistAddresses.map((p) => p.toLowerCase()).includes(x.addr.toLowerCase())) {
      additionalWLAddresses.push(x.addr);
    } else {
      console.log(`skipping ${x.addr} (already in WL)...`);
    }
  }
  
  const addressesToWhiteList = [...whitelistAddresses, ...additionalWLAddresses];

  const addressesToWhiteListChunks = addressesToWhiteList
    .reduce((result, addr) => {
      if (whitelistAddressesOnTarget.map((p) => p.toLowerCase()).includes(addr.toLowerCase())) {
        return result;
      }

      const lastItem = result?.[result.length - 1] ?? [];
      if (lastItem && lastItem.length === WHITELIST_CHUNK_SIZE) {
        return [...result, [addr]];
      } else {
        return [...result.slice(0, -1), [...lastItem, addr]];
      }
    }, []);

  const whitelistPromises =  addressesToWhiteListChunks.map(
      (addresses, index) =>
        function addWhitelist(cb) {
          console.log(`Adding whitelist addresses`, addresses);
          console.log(`Chunk ${index + 1} / ${addressesToWhiteListChunks.length}`)
          if (addresses.length === 0) {
            return cb(null, []);
          }

          newContract
            .whitelistMany(addresses)
            .then((result) => cb(null, result))
            .catch((error) => cb(error));
        },
    );

  await series(whitelistPromises);

  const targetWhitelistAddresses = await newContract.getWhitelist();
  let targetWLHash = '';

  for (let i = 0; i < sourceWlCount; i++) {
    targetWLHash = soliditySha3(targetWLHash, targetWhitelistAddresses[i]);
  }

  if (sourceWlHash !== targetWLHash) {
    console.error(`Ledger hash mismatch!`, {
      sourceWlHash,
      targetWLHash,
    });
    return callback(new Error(`Ledger hash mismatch!`));
  }

  console.log(`GREAT! WhitelistAddress hashes match!`, {
    sourceWlHash,
    targetWLHash,
  });

  console.timeEnd('restoreWL');
  callback('Done.');
};
