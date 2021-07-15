// @ts-check
const fs = require('fs');
const argv = require('yargs-parser')(process.argv.slice(2));
// @ts-ignore artifacts from truffle
const StMaster = artifacts.require('StMaster');
// @ts-ignore
const series = require('async/series');

process.on('unhandledRejection', console.error);

/**
 * Usage: `truffle exec restore.js -a=ADDR [--network <name>] [--compile]`,
 * @link https://github.com/trufflesuite/truffle/issues/889#issuecomment-522581580
 */
module.exports = async (callback) => {
  const contractAddress = `0x${argv?.a}`.toLowerCase();

  // return error if not a valid address
  if (!contractAddress.match(/^0x[0-9a-f]{40}$/i)) {
    return callback(new Error(`Invalid address: ${contractAddress}`));
  }

  // read data from json file
  const backupFile = `data/${contractAddress}.json`;
  const { data, info } = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

  await StMaster.deployed();

  // deploy new contract with info
  const newContract = await StMaster.new(
    info.owners,
    info.contractType,
    info.name,
    info.version,
    info.unit,
    info.symbol,
    info.decimals,
  );

  // get contract info
  const name = await newContract.name();
  const version = await newContract.version();
  console.log(`New contract address: ${newContract.address}`);
  console.log(`Name: ${name}`);
  console.log(`Version: ${version}`);

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

  callback();
};
