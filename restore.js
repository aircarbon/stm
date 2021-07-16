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

// how many items to process in one batch
const WHITELIST_CHUNK_SIZE = 100;
const BATCH_CHUNK_SIZE = 2;

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
  const whitelistPromises = data.whitelistAddresses
    .reduce((result, addr) => {
      const lastItem = result?.[result.length - 1] ?? [];
      if (lastItem && lastItem.length === WHITELIST_CHUNK_SIZE) {
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
        console.log(`Adding ccyType`, ccyType);
        newContract
          .addCcyType(ccyType.name, ccyType.unit, ccyType.decimals)
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

  // load ledgers data to new contract
  const ledgersPromises = data.ledgers.map(
    (ledger, index) =>
      function createLedgerEntry(cb) {
        const owner = data.ledgerOwners[index];
        console.log(`Creating ledger entry #${index} - currency`, owner, ledger.ccys);
        newContract
          .createLedgerEntry(owner, ledger.ccys, ledger.spot_sumQtyMinted, ledger.spot_sumQtyBurned)
          .then((result) => cb(null, result))
          .catch((error) => cb(error));
      },
  );
  await series(ledgersPromises);
  const addSecTokensPromises = data.ledgers.flatMap(
    (ledger, index) =>
      function addSecToken(cb) {
        const owner = data.ledgerOwners[index];
        console.log(`Creating ledger entry #${index} - token `, owner, ledger.tokens);
        return ledger.tokens.map((token) =>
          newContract
            .addSecToken(
              owner,
              token.batchId,
              token.stId,
              token.tokTypeId,
              token.mintedQty,
              token.currentQty,
              token.ft_price,
              token.ft_lastMarkPrice,
              token.ft_ledgerOwner,
              token.ft_PL,
            )
            .then((result) => cb(null, result))
            .catch((error) => cb(error)),
        );
      },
  );
  await series(addSecTokensPromises);

  // load batches data to new contract
  const batchesPromises = data.batches
    .reduce((result, batch) => {
      const lastItem = result?.[result.length - 1] ?? [];
      if (lastItem && lastItem.length === BATCH_CHUNK_SIZE) {
        return [...result, [batch]];
      } else {
        return [...result.slice(0, -1), [...lastItem, batch]];
      }
    }, [])
    .map(
      (batches) =>
        function loadSecTokenBatch(cb) {
          console.log(`Adding batches`, batches);
          newContract
            .loadSecTokenBatch(batches, batches.length)
            .then((result) => cb(null, result))
            .catch((error) => cb(error));
        },
    );

  await series(batchesPromises);

  // Default fee for smart contract
  await newContract.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, {
    ...CONST.nullFees,
    ccy_perMillion: 300,
    ccy_mirrorFee: true,
    fee_min: 300,
  });

  await newContract.sealContract();

  callback();
};
