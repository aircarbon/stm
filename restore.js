// @ts-check
const fs = require('fs');
const chalk = require('chalk');
const argv = require('yargs-parser')(process.argv.slice(2));
// @ts-ignore artifacts from truffle
const StMaster = artifacts.require('StMaster');
const series = require('async/series');

const CONST = require('./const');
const { helpers } = require('../utils-common/dist');

process.on('unhandledRejection', console.error);

/**
 * Usage: `truffle exec restore.js -s=ADDR -t=NEW_ADDR [--network <name>] [--compile]`,
 * @link https://github.com/trufflesuite/truffle/issues/889#issuecomment-522581580
 */
module.exports = async (callback) => {
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
  const backupFile = `data/${contractAddress}.json`;
  const { data, info } = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

  // deploy new contract with info
  const newContract = await StMaster.at(newContractAddress);
  // show debug info in table format
  console.log(chalk.yellow(`${info.name} (${info.version})`));

  // get contract info
  const name = await newContract.name();
  const version = await newContract.version();
  console.log(`New contract address: ${newContract.address}`);
  console.log(`Name: ${name}`);
  console.log(`Version: ${version}`);

  // whitelisting addresses to new contract
  const WHITELIST_COUNT = 10;
  const whitelistPromises = data.whitelistAddresses
    .reduce((result, addr) => {
      const lastItem = result?.[result.length - 1] ?? [];
      if (lastItem && lastItem.length === WHITELIST_COUNT) {
        return [...result, [addr]];
      } else {
        return [...result.slice(0, -1), [...lastItem, addr]];
      }
    }, [])
    .map(
      (addresses) =>
        function addWhitelist(cb) {
          console.log(`Adding whitelist addresses`, addresses);
          newContract
            .whitelistMany(addresses)
            .then((result) => cb(null, result))
            .catch((error) => cb(error));
        },
    );

  await series(whitelistPromises);

  // add ccy data to new contract
  const ccyTypesPromises = data.ccyTypes.map(
    (ccyType) =>
      function addCcyType(cb) {
        console.log(`Adding ccyType`, ccyType[1], ccyType[2], ccyType[3]);
        newContract
          .addCcyType(ccyType[1], ccyType[2], ccyType[3])
          .then((ccy) => cb(null, ccy))
          .catch((error) => cb(error));
      },
  );

  await series(ccyTypesPromises);
  const ccyTypes = await newContract.getCcyTypes();
  console.log(helpers.decodeWeb3Object(ccyTypes));

  // add token types to new contract
  const tokenTypesPromises = data.tokenTypes.map(
    (tokenType) =>
      function addTokenType(cb) {
        console.log(`Adding tokenType - spot type`, tokenType.name);
        newContract
          .addSecTokenType(tokenType.name, CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr)
          .then((token) => cb(null, token))
          .catch((error) => cb(error));
      },
  );

  await series(tokenTypesPromises);
  const tokenTypes = await newContract.getSecTokenTypes();
  console.log(helpers.decodeWeb3Object(tokenTypes));

  // Default fee for smart contract
  await newContract.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, {
    ...CONST.nullFees,
    ccy_perMillion: 300,
    ccy_mirrorFee: true,
    fee_min: 300,
  });

  callback();
};
