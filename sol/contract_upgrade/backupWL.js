// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms

// @ts-check
const fs = require('fs');
const path = require('path');
const argv = require('yargs-parser')(process.argv.slice(2));
// @ts-ignore artifacts from truffle
const StMaster = artifacts.require('StMaster');
const { soliditySha3 } = require('web3-utils');

const CONST = require('../const');

process.on('unhandledRejection', console.error);

/**
 * Usage: `INSTANCE_ID=local truffle exec contract_upgrade/backupWL.js -s=ADDR -h=[offchain|onchain] [--network <name>] [--compile]`,
 * @link https://github.com/trufflesuite/truffle/issues/889#issuecomment-522581580
 */
module.exports = async (callback) => {
  const contractAddress = `0x${argv?.s}`.toLowerCase();
  console.time('backupWL');

  // return error if not a valid address
  if (!contractAddress.match(/^0x[0-9a-f]{40}$/i)) {
    return callback(new Error(`Invalid address: ${contractAddress}`));
  }

  const contract = await StMaster.at(contractAddress);

  const whitelistAddresses = await contract.getWhitelist();
  let wlHash = '';
  whitelistAddresses.forEach((address) => {
    wlHash = soliditySha3(wlHash, address);
  });

  // create data directory if not exists
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  const network = argv?.network || 'development';
  const name = await contract.name();
  const version = await contract.version();

  const info = {
    network,
    contractAddress,
    name,
    version
  }

  // write backup to json file
  const backupFile = path.join(dataDir, `WL-${contractAddress}.json`);
  console.log(`Writing backup to ${backupFile}`);
  fs.writeFileSync(backupFile, JSON.stringify({ info, wlHash, count: whitelistAddresses.length, whitelistAddresses }, null, 2));

  console.timeEnd('backupWL');
  callback();
};
