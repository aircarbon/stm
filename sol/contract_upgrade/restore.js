// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms

// @ts-check
const fs = require('fs');
const path = require('path');
const { toBN } = require('web3-utils');
const chalk = require('chalk');
const argv = require('yargs-parser')(process.argv.slice(2));
// @ts-ignore artifacts from truffle
const StMaster = artifacts.require('StMaster');
const series = require('async/series');

const { getLedgerHashOffChain, createBackupData } = require('./utils');
const CONST = require('../const');
const { helpers } = require('../../orm/build');

process.on('unhandledRejection', console.error);

// how many items to process in one batch
const WHITELIST_CHUNK_SIZE = 100;
const BATCH_CHUNK_SIZE = 2;

// create a sleep function to be used in the async series
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Usage: `INSTANCE_ID=local truffle exec upgrade_contract/restore.js -s=ADDR -t=NEW_ADDR  -h=[offchain|onchain] [--network <name>] [--compile]`,
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
  const dataDir = path.join(__dirname, 'data');
  const backupFile = path.join(dataDir, `${contractAddress}.json`);
  const { data, info, ledgerHash: previousHash } = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

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
        },
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
      },
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

        console.log(`Adding tokenType`, tokenType);
        newContract
          .addSecTokenType(tokenType.name, tokenType.settlementType, tokenType.ft, tokenType.cashflowBaseAddr)
          .then((token) => cb(null, token))
          .catch((error) => cb(error));
      },
  );

  await series(tokenTypesPromises);
  await sleep(1000);

  const hasSealed = await newContract.getContractSeal();
  console.log('Contract seal', hasSealed);

  if (!hasSealed) {
    // load batches data to new contract
    const maxBatchId = await newContract.getSecTokenBatch_MaxId();
    console.log(`Max batch id: ${maxBatchId}`);

    const batchesPromises = data.batches
      .filter((batch) => Number(batch.id) > Number(maxBatchId))
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
            console.log(`Processing batches: ${index + 1}/${allBatches.length}`);
            const batchCount = batches[1]?.id || batches[0]?.id;
            newContract
              .loadSecTokenBatch(batches, batchCount)
              .then((result) => cb(null, result))
              .catch((error) => cb(error));
          },
      );

    await series(batchesPromises);
    await sleep(1000);

    // get ledgers
    const ledgerOwners = await newContract.getLedgerOwners();
    const ledgers = (await Promise.all(ledgerOwners.map((owner) => newContract.getLedgerEntry(owner))))
      .map((ledger) => helpers.decodeWeb3Object(ledger))
      .map((ledger) => {
        return {
          ...ledger,
          ccys: ledger.ccys.map((ccy) => ({
            ccyTypeId: ccy.ccyTypeId,
            name: ccy.name,
            unit: ccy.unit,
            balance: ccy.balance,
            reserved: ccy.reserved,
          })),
        };
      });

    // load ledgers data to new contract
    const ledgersPromises = data.ledgers.map(
      (ledger, index, allLedgers) =>
        function createLedgerEntry(cb) {
          const owner = data.ledgerOwners[index];
          // skip if owner already inserted
          if (ledgerOwners.includes(owner)) {
            cb(null, []);
          } else {
            console.log(`Creating ledger entry #${index} - currency`, owner, ledger.ccys);
            console.log(`Processing ledger - currency: ${index + 1}/${allLedgers.length}`);
            newContract
              .createLedgerEntry(owner, ledger.ccys, ledger.spot_sumQtyMinted, ledger.spot_sumQtyBurned)
              .then((result) => cb(null, result))
              .catch((error) => cb(error));
          }
        },
    );
    await series(ledgersPromises);
    await sleep(1000);

    const addSecTokensPromises = data.ledgers.flatMap(
      (ledger, index, allLedgers) =>
        function addSecToken(cb) {
          const owner = data.ledgerOwners[index];
          if (ledger.tokens.length === 0) {
            return cb(null, []);
          }

          // skip if already inserted
          let tokens = ledger.tokens;
          if (ledgerOwners.includes(owner)) {
            const stIds = ledgers[ledgerOwners.indexOf(owner)].tokens.map((token) => token.stId);
            tokens = tokens.filter((token) => !stIds.includes(token.stId));
            if (tokens.length === 0) {
              return cb(null, []);
            }
          }

          console.log(`Processing ledger - token: ${index + 1}/${allLedgers.length}`, owner, tokens);

          return series(
            tokens.map(
              (token) =>
                function AddSecTokenToEntry(callback) {
                  console.log('AddSecTokenToEntry', token.stId);
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
                    .then((result) => callback(null, result))
                    .catch((error) => callback(error));
                },
            ),
          )
            .then((result) => cb(null, result))
            .catch((error) => cb(error));
        },
    );
    await series(addSecTokensPromises);
    await sleep(1000);

    // add globalSecTokens to new contract
    const globalSecTokensPromises = data.globalSecTokens.map(
      (token, index, tokens) =>
        function addGlobalSecToken(cb) {
          console.log('Add global sec token', token);
          console.log(`Processing ${index + 1}/${tokens.length}`);
          const { stId, mintedQty, currentQty } = token;
          const transferedFullSecTokensEvent = data.transferedFullSecTokensEvents.find(
            (event) => Number(event.stId) === Number(stId),
          );
          if (transferedFullSecTokensEvent) {
            console.log(`Found transferedFullSecTokensEvent for ${stId}`, transferedFullSecTokensEvent);
          }
          newContract
            .getSecToken(stId)
            .then((result) => helpers.decodeWeb3Object(result))
            .then((existToken) =>
              existToken.exists
                ? existToken
                : newContract.addSecToken(
                    '0x0000000000000000000000000000000000000000',
                    token.batchId,
                    stId,
                    token.tokTypeId,
                    Number(mintedQty) - Number(transferedFullSecTokensEvent?.qty ?? 0),
                    Number(currentQty) - Number(transferedFullSecTokensEvent?.qty ?? 0),
                    token.ft_price,
                    token.ft_lastMarkPrice,
                    token.ft_ledgerOwner,
                    token.ft_PL,
                  ),
            )
            .then((result) => cb(null, result))
            .catch((error) => cb(error));
        },
    );
    await series(globalSecTokensPromises);
    await sleep(1000);

    await newContract.setTokenTotals(
      data.secTokenBaseId,
      toBN(data.secTokenMintedCount),
      toBN(data.secTokenMintedQty),
      toBN(data.secTokenBurnedQty),
    );

    // set fee for currency and token types
    const ccyFeePromises = data.ccyTypes.map((ccyType, index) => {
      return function setFeeForCcyType(cb) {
        const fee = data.ccyFees[index];
        console.log(`Setting fee for ccyType ${ccyType.name}`, fee);
        newContract
          .setFee_CcyType(ccyType.id, CONST.nullAddr, fee)
          .then((result) => cb(null, result))
          .catch((error) => cb(error));
      };
    });
    await series(ccyFeePromises);
    await sleep(1000);

    const tokenFeePromises = data.tokenTypes.map((tokenType, index) => {
      return function setFeeForTokenType(cb) {
        const fee = data.tokenFees[index];
        console.log(`Setting fee for tokenType ${tokenType.name}`, fee);
        newContract
          .setFee_TokType(tokenType.id, CONST.nullAddr, fee)
          .then((result) => cb(null, result))
          .catch((error) => cb(error));
      };
    });

    await series(tokenFeePromises);
    await sleep(1000);
  }

  const backupData = await createBackupData(newContract, newContractAddress, 0, false);

  const onChainLedgerHash = argv?.h === 'onchain';
  const ledgerHash = onChainLedgerHash
    ? await CONST.getLedgerHashcode(newContract)
    : getLedgerHashOffChain(backupData.data);

  // write backup to json file
  const newBackupFile = path.join(dataDir, `${newContractAddress}.json`);
  console.log(`Writing backup to ${backupFile}`);
  fs.writeFileSync(newBackupFile, JSON.stringify({ ledgerHash, ...backupData }, null, 2));

  if (ledgerHash !== previousHash) {
    console.error(`Ledger hash mismatch!`, {
      ledgerHash,
      previousHash,
    });
    return callback(new Error(`Ledger hash mismatch!`));
  }

  await newContract.sealContract();

  callback('Done.');
};
