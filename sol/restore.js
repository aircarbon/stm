// @ts-check
const fs = require("fs");
const { toBN } = require("web3-utils");
const chalk = require("chalk");
const argv = require("yargs-parser")(process.argv.slice(2));
// @ts-ignore artifacts from truffle
const StMaster = artifacts.require("StMaster");
const series = require("async/series");

const CONST = require("./const");
const { helpers } = require("../orm/dist");

process.on("unhandledRejection", console.error);

// how many items to process in one batch
const WHITELIST_CHUNK_SIZE = 100;
const BATCH_CHUNK_SIZE = 2;

// create a sleep function to be used in the async series
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const { data, info } = JSON.parse(fs.readFileSync(backupFile, "utf8"));

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
  const whitelistAddresses = await newContract.getWhitelist();
  const whitelistPromises = data.whitelistAddresses
    .reduce((result, addr) => {
      if (whitelistAddresses.includes(addr)) {
        return result;
      }

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
          if (addresses.length === 0) {
            return cb(null, []);
          }

          newContract
            .whitelistMany(addresses)
            .then((result) => cb(null, result))
            .catch((error) => cb(error));
        }
    );

  await series(whitelistPromises);

  // add ccy data to new contract
  const ccyTypes = await newContract.getCcyTypes();
  const { ccyTypes: currencyTypes } = helpers.decodeWeb3Object(ccyTypes);
  const currencyNames = currencyTypes.map((type) => type.name);
  const ccyTypesPromises = data.ccyTypes.map(
    (ccyType) =>
      function addCcyType(cb) {
        if (currencyNames.includes(ccyType.name)) {
          return cb(null, ccyType);
        }
        console.log(`Adding ccyType`, ccyType);
        newContract
          .addCcyType(ccyType.name, ccyType.unit, ccyType.decimals)
          .then((ccy) => cb(null, ccy))
          .catch((error) => cb(error));
      }
  );

  await series(ccyTypesPromises);
  await sleep(1000);

  // add token types to new contract
  const tokTypes = await newContract.getSecTokenTypes();
  const { tokenTypes } = helpers.decodeWeb3Object(tokTypes);
  const tokenNames = tokenTypes.map((type) => type.name);
  const tokenTypesPromises = data.tokenTypes.map(
    (tokenType) =>
      function addTokenType(cb) {
        if (tokenNames.includes(tokenType.name)) {
          return cb(null, tokenType);
        }

        console.log(`Adding tokenType - spot type`, tokenType.name);
        newContract
          .addSecTokenType(
            tokenType.name,
            CONST.settlementType.SPOT,
            CONST.nullFutureArgs,
            CONST.nullAddr
          )
          .then((token) => cb(null, token))
          .catch((error) => cb(error));
      }
  );

  await series(tokenTypesPromises);
  await sleep(1000);

  // load batches data to new contract
  const maxBatchId = await newContract.getSecTokenBatch_MaxId();
  console.log(`Max batch id: ${maxBatchId}`);

  const batchesPromises = data.batches
    .filter((batch) => batch.id > maxBatchId)
    .reduce((result, batch) => {
      const lastItem = result?.[result.length - 1] ?? [];
      if (lastItem && lastItem.length === BATCH_CHUNK_SIZE) {
        return [...result, [batch]];
      } else {
        return [...result.slice(0, -1), [...lastItem, batch]];
      }
    }, [])
    .map(
      (batches, index, allBatches) =>
        function loadSecTokenBatch(cb) {
          console.log(`Adding batches`, batches);
          console.log(`Processing: ${index + 1}/${allBatches.length}`);
          const batchCount = batches[1]?.id || batches[0]?.id;
          newContract
            .loadSecTokenBatch(batches, batchCount)
            .then((result) => cb(null, result))
            .catch((error) => cb(error));
        }
    );

  await series(batchesPromises);
  await sleep(1000);

  // load ledgers data to new contract
  const ledgersPromises = data.ledgers.map(
    (ledger, index, allLedgers) =>
      function createLedgerEntry(cb) {
        const owner = data.ledgerOwners[index];
        console.log(
          `Creating ledger entry #${index} - currency`,
          owner,
          ledger.ccys
        );
        console.log(`Processing: ${index + 1}/${allLedgers.length}`);
        newContract
          .createLedgerEntry(
            owner,
            ledger.ccys,
            ledger.spot_sumQtyMinted,
            ledger.spot_sumQtyBurned
          )
          .then((result) => cb(null, result))
          .catch((error) => cb(error));
      }
  );
  await series(ledgersPromises);
  await sleep(1000);

  const addSecTokensPromises = data.ledgers.flatMap(
    (ledger, index, allLedgers) =>
      function addSecToken(cb) {
        const owner = data.ledgerOwners[index];
        console.log(
          `Creating ledger entry #${index} - token `,
          owner,
          ledger.tokens
        );
        console.log(`Processing: ${index + 1}/${allLedgers.length}`);
        if (ledger.tokens.length === 0) {
          return cb(null, []);
        }

        return series(
          ledger.tokens.map(
            (token) =>
              function AddSecTokenToEntry(callback) {
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
                    token.ft_PL
                  )
                  .then((result) => callback(null, result))
                  .catch((error) => callback(error));
              }
          )
        )
          .then((result) => cb(null, result))
          .catch((error) => cb(error));
      }
  );
  await series(addSecTokensPromises);
  await sleep(1000);

  await newContract.setTokenTotals(
    data.secTokenBaseId,
    toBN(data.secTokenMintedCount),
    toBN(data.secTokenMintedQty),
    toBN(data.secTokenBurnedQty)
  );

  // set fee for currency and token types
  const feePromises = [];
  currencyTypes.map((ccyType, index) => {
    feePromises.push(function setFeeForCcyType(cb) {
      // get currency type fee by id
      const fee = data.ccyFees[index];
      newContract
        .setFee_CcyType(ccyType.id, CONST.nullAddr, fee)
        .then((result) => cb(null, result))
        .catch((error) => cb(error));
    });
  });
  tokenTypes.map((tokenType, index) => {
    feePromises.push(function setFeeForTokenType(cb) {
      const fee = data.tokenFees[index];
      newContract
        .setFee_TokType(tokenType.id, CONST.nullAddr, fee)
        .then((result) => cb(null, result))
        .catch((error) => cb(error));
    });
  });

  await newContract.sealContract();

  const ledgerHash = await CONST.getLedgerHashcode(newContract);
  if (ledgerHash !== info.ledgerHash) {
    console.error(`Ledger hash mismatch!`, {
      ledgerHash,
      previousHash: info.ledgerHash,
    });
    return callback(new Error(`Ledger hash mismatch!`));
  }

  callback("Done.");
};
