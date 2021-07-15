// @ts-check
const fs = require('fs');
const argv = require('yargs-parser')(process.argv.slice(2));
// @ts-ignore artifacts from truffle
const StMaster = artifacts.require('StMaster');

const CONST = require('./const');

/**
 * Usage: `truffle exec restore.js -a=ADDR [--network <name>] [--compile]`,
 * @link https://github.com/trufflesuite/truffle/issues/889#issuecomment-522581580
 */
module.exports = async (callback) => {
  const contractAddress = `0x${argv?.a || '0000000000000000000000000000000000000000!'}`;

  // read data from json file
  const backupFile = `data/${contractAddress}.json`;
  const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

  callback(JSON.stringify(data, null, 2));
};
