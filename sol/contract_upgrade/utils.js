// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms

// @ts-check
const { soliditySha3, hexToNumberString } = require('web3-utils');
const Web3 = require('web3');
const argv = require('yargs-parser')(process.argv.slice(2));
const parallelLimit = require('async/parallelLimit');
const fs = require('fs');
const path = require('path');

const CONST = require('../const');
const { helpers } = require('../../orm/build');
const config = require('../truffle-config');
const { series } = require('async');

// implement get ledger hash
// Refer to: getLedgerHashcode on LedgerLib.sol
function getLedgerHashOffChain(data, ignoreGlobalStIds = [], wlAddressesStopAtIdx) {
  console.log('getLedgerHashOffChain');
  // hash currency types & exchange currency fees
  let ledgerHash = '';
  const ccyTypes = data?.ccyTypes ?? [];
  const ccyFees = data?.ccyFees ?? [];
  for (let index = 0; index < ccyTypes.length; index++) {
    const ccyType = ccyTypes[index];
    ledgerHash = soliditySha3(ledgerHash, ccyType.id, ccyType.name, ccyType.unit, ccyType.decimals);
    if (
      Number(ccyFees[index]?.fee_fixed) ||
      Number(ccyFees[index]?.fee_percBips) ||
      Number(ccyFees[index]?.fee_min) ||
      Number(ccyFees[index]?.fee_max) ||
      Number(ccyFees[index]?.ccy_perMillion) ||
      Boolean(ccyFees[index]?.ccy_mirrorFee)
    ) {
      ledgerHash = soliditySha3(
        ledgerHash,
        ccyFees[index].fee_fixed,
        ccyFees[index].fee_percBips,
        ccyFees[index].fee_min,
        ccyFees[index].fee_max,
        ccyFees[index].ccy_perMillion,
        ccyFees[index].ccy_mirrorFee,
      );
    }

    // hash ledger owner fees for token type
    data.ledgerOwnersFees.forEach((ledgerOwnerFee) => {
      const fee = ledgerOwnerFee.currencies[index];
      if (
        Number(fee?.fee_fixed) ||
        Number(fee?.fee_percBips) ||
        Number(fee?.fee_min) ||
        Number(fee?.fee_max) ||
        Number(fee?.ccy_perMillion) ||
        Boolean(fee?.ccy_mirrorFee)
      ) {
        ledgerHash = soliditySha3(
          ledgerHash,
          fee.fee_fixed,
          fee.fee_percBips,
          fee.fee_min,
          fee.fee_max,
          fee.ccy_perMillion,
          fee.ccy_mirrorFee,
        );
      }
    });
  }
  console.log('ledger hash - hash currency types & exchange currency fees', ledgerHash);

  // hash token types & exchange token fees
  const tokenTypes = data?.tokenTypes ?? [];
  const tokenFees = data?.tokenFees ?? [];
  for (let index = 0; index < tokenTypes.length; index++) {
    const tokenType = tokenTypes[index];
    ledgerHash = soliditySha3(
      ledgerHash,
      tokenType.name,
      tokenType.settlementType,
      tokenType.ft.expiryTimestamp,
      tokenType.ft.underlyerTypeId,
      tokenType.ft.refCcyId,
      tokenType.ft.initMarginBips,
      tokenType.ft.varMarginBips,
      tokenType.ft.contractSize,
      tokenType.ft.feePerContract,
      tokenType.cashflowBaseAddr,
    );
    if (
      Number(tokenFees[index]?.fee_fixed) ||
      Number(tokenFees[index]?.fee_percBips) ||
      Number(tokenFees[index]?.fee_min) ||
      Number(tokenFees[index]?.fee_max) ||
      Number(tokenFees[index]?.ccy_perMillion) ||
      Boolean(tokenFees[index]?.ccy_mirrorFee)
    ) {
      ledgerHash = soliditySha3(
        ledgerHash,
        tokenFees[index].fee_fixed,
        tokenFees[index].fee_percBips,
        tokenFees[index].fee_min,
        tokenFees[index].fee_max,
        tokenFees[index].ccy_perMillion,
        tokenFees[index].ccy_mirrorFee,
      );
    }
    // hash ledger owner fees for token type
    data.ledgerOwnersFees.forEach((ledgerOwnerFee) => {
      const fee = ledgerOwnerFee.tokens[index];
      if (
        Number(fee?.fee_fixed) ||
        Number(fee?.fee_percBips) ||
        Number(fee?.fee_min) ||
        Number(fee?.fee_max) ||
        Number(fee?.ccy_perMillion) ||
        Boolean(fee?.ccy_mirrorFee)
      ) {
        ledgerHash = soliditySha3(
          ledgerHash,
          fee.fee_fixed,
          fee.fee_percBips,
          fee.fee_min,
          fee.fee_max,
          fee.ccy_perMillion,
          fee.ccy_mirrorFee,
        );
      }
    });
  }
  console.log('ledger hash - token types & exchange token fees', ledgerHash);

  // hash whitelist
  const whitelistAddresses = data?.whitelistAddresses ?? [];
  if (wlAddressesStopAtIdx) {
    for (let i = 0; i < wlAddressesStopAtIdx; i++) {
      ledgerHash = soliditySha3(ledgerHash, data?.whitelistAddresses[i]);
    }
  } else {
    whitelistAddresses.forEach((address) => {
      ledgerHash = soliditySha3(ledgerHash, address);
    });
  }

  console.log('ledger hash - whitelist', ledgerHash);

  // hash batches
  const batches = data?.batches ?? [];
  batches.forEach((batch) => {
    ledgerHash = soliditySha3(
      ledgerHash,
      batch.id,
      batch.mintedTimestamp,
      batch.tokTypeId,
      batch.mintedQty,
      batch.burnedQty,
      ...batch.metaKeys,
      ...batch.metaValues,
      batch.origTokFee.fee_fixed,
      batch.origTokFee.fee_percBips,
      batch.origTokFee.fee_min,
      batch.origTokFee.fee_max,
      batch.origTokFee.ccy_perMillion,
      batch.origTokFee.ccy_mirrorFee,
      batch.origCcyFee_percBips_ExFee,
      batch.originator,
    );
  });

  console.log('ledger hash - batches', ledgerHash);

  // hash ledgers
  const ledgers = data?.ledgers ?? [];
  const ledgerOwners = data?.ledgerOwners ?? [];
  for (let index = 0; index < ledgers.length; index++) {
    if (index !== 0) {
      ledgerHash = soliditySha3(ledgerHash, ledgerOwners[index]);
    }
    const legerEntry = ledgers[index];
    ledgerHash = soliditySha3(
      ledgerHash,
      legerEntry.spot_sumQty,
      legerEntry.spot_sumQtyMinted,
      legerEntry.spot_sumQtyBurned,
    );

    const ccys = legerEntry.ccys ?? [];
    ccys.forEach((ccy) => {
      ledgerHash = soliditySha3(ledgerHash, ccy.ccyTypeId, ccy.name, ccy.unit, ccy.balance, ccy.reserved);
    });

    const tokens = legerEntry.tokens ?? [];
    tokens.forEach((token) => {
      ledgerHash = soliditySha3(
        ledgerHash,
        token.stId,
        token.tokTypeId,
        token.tokTypeName,
        token.batchId,
        token.mintedQty,
        token.currentQty,
        token.ft_price,
        token.ft_ledgerOwner,
        token.ft_lastMarkPrice,
        token.ft_PL,
      );
    });
  }
  console.log('ledger hash - ledgers', ledgerHash);

  // hash secTokens
  const secTokens = data?.globalSecTokens ?? [];
  secTokens.forEach((token) => {
    if (ignoreGlobalStIds.length > 0) {
      const isExist = ignoreGlobalStIds.find((event) => Number(event.stId) === Number(token.stId));
      if (!isExist) {
        ledgerHash = soliditySha3(
          ledgerHash,
          token.stId,
          token.tokTypeId,
          token.tokTypeName,
          token.batchId,
          token.mintedQty,
          token.currentQty,
          token.ft_price,
          token.ft_ledgerOwner,
          token.ft_lastMarkPrice,
          token.ft_PL,
        );
      }
    } else {
      ledgerHash = soliditySha3(
        ledgerHash,
        token.stId,
        token.tokTypeId,
        token.tokTypeName,
        token.batchId,
        token.mintedQty,
        token.currentQty,
        token.ft_price,
        token.ft_ledgerOwner,
        token.ft_lastMarkPrice,
        token.ft_PL,
      );
    }
  });

  console.log('result', ledgerHash);
  return ledgerHash;
}

// get transfer full token event by chunk
const EVENT_CHUNK_SIZE = 1000;
const MAX_CONCURRENT = 5;
const startFrom = 3799000;
async function getTransferFullTokenEvents(contract) {
  const promises = [];
  const network = argv?.network || 'development';
  // @ts-ignore
  const web3 = new Web3(config.networks[network].provider());
  const latestBlockNumber = await web3.eth.getBlockNumber();
  console.log(`Latest block number: ${latestBlockNumber}`);
  const range = Math.ceil((latestBlockNumber - startFrom) / EVENT_CHUNK_SIZE);
  for (let index = 0; index <= range; index += 1) {
    const fromBlock = index * EVENT_CHUNK_SIZE + startFrom;

    const toBlock = (index + 1) * EVENT_CHUNK_SIZE + startFrom;
    promises.push(function searchEventByBlockRange(cb) {
      console.log(`#${index}/${range} - Searching for TransferedFullSecToken`, {
        fromBlock,
        toBlock,
      });
      contract
        .getPastEvents('TransferedFullSecToken', {
          fromBlock,
          toBlock,
        })
        .then((events) => cb(null, events))
        .catch((err) => cb(err));
    });
  }

  return (await parallelLimit(promises, MAX_CONCURRENT)).flat();
}

async function createBackupData(contract, contractAddress, contractType, getTransferedFullSecToken = true) {
  const owners = await contract.getOwners();
  const unit = await contract.unit();
  const symbol = await contract.symbol();
  const decimals = await contract.decimals();
  const network = argv?.network || 'development';
  const name = await contract.name();
  const version = await contract.version();
  console.log(`Contract address: ${contractAddress}`);
  console.log(`Name: ${name}`);
  console.log(`Version: ${version}`);

  // get all ccy and token types
  const ccyTypes = await contract.getCcyTypes();
  const { ccyTypes: currencyTypes } = helpers.decodeWeb3Object(ccyTypes);

  const tokTypes = await contract.getSecTokenTypes();
  const { tokenTypes } = helpers.decodeWeb3Object(tokTypes);

  // open contract file if exist
  let previousLedgersOwners;
  let previousGlobalFees;
  let previousLedgerOwnersFees;
  const dataFile = path.join(__dirname, `${name}.json`);
  if (fs.existsSync(dataFile)) {
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    console.log(`Previous data found: ${name}.json`, data);
    previousLedgersOwners = data.ledgerOwners;
    previousGlobalFees = data.globalFees;
    previousLedgerOwnersFees = data.ledgerOwnersFees;
  }

  // get ledgers
  const ledgerOwners = previousLedgersOwners || (await contract.getLedgerOwners());
  const ledgers = (await Promise.all(ledgerOwners.map((owner) => contract.getLedgerEntry(owner))))
    .map((ledger) => helpers.decodeWeb3Object(ledger))
    .map((ledger, index, ledgers) => {
      return {
        ...ledger,
        ccys: ledgers[index].ccys.map((ccy) => ({
          ccyTypeId: ccy.ccyTypeId,
          name: ccy.name,
          unit: ccy.unit,
          balance: ccy.balance,
          reserved: ccy.reserved,
        })),
      };
    });

  if (!previousLedgerOwnersFees) {
    // fetch ledger owner fee for all currencies types and token types
    const ledgerOwnersFeesPromises = [];
    console.time('ledgerOwnersFeesPromises');
    ledgerOwners.forEach((owner, index) => {
      ledgerOwnersFeesPromises.push(function getedgerOwnersFees(cb) {
        console.log(`#${index + 1}/${ledgerOwners.length} - getedgerOwnersFees`, owner);
        const ccyFeePromise = [];
        for (let index = 0; index < currencyTypes.length; index++) {
          ccyFeePromise.push(contract.getFee(CONST.getFeeType.CCY, currencyTypes[index].id, owner));
        }
        const tokenFeePromise = [];
        for (let index = 0; index < tokenTypes.length; index++) {
          tokenFeePromise.push(contract.getFee(CONST.getFeeType.TOK, tokenTypes[index].id, owner));
        }

        Promise.all(ccyFeePromise)
          .then((ccyFees) =>
            Promise.all(tokenFeePromise).then((tokenFees) =>
              cb(null, {
                currencies: ccyFees.map((fee) => helpers.decodeWeb3Object(fee)),
                tokens: tokenFees.map((fee) => helpers.decodeWeb3Object(fee)),
              }),
            ),
          )
          .catch((err) => cb(err));
      });
    });
    previousLedgerOwnersFees = await series(ledgerOwnersFeesPromises);
    console.timeEnd('ledgerOwnersFeesPromises');
  }

  // get all batches
  const batchesPromise = [];
  const maxBatchId = await contract.getSecTokenBatch_MaxId();
  for (let index = 1; index <= maxBatchId; index++) {
    batchesPromise.push(contract.getSecTokenBatch(index));
  }
  const batches = await Promise.all(batchesPromise);

  const whitelistAddresses = await contract.getWhitelist();

  const secTokenBaseId = await contract.getSecToken_BaseId();
  const secTokenMintedCount = await contract.getSecToken_MaxId();
  const secTokenBurnedQty = await contract.getSecToken_totalBurnedQty();
  const secTokenMintedQty = await contract.getSecToken_totalMintedQty();

  // get all currency types fee
  let ccyFees;
  if (previousGlobalFees?.currencies) {
    ccyFees = previousGlobalFees.currencies;
  } else {
    const ccyFeePromise = [];
    for (let index = 0; index < currencyTypes.length; index++) {
      ccyFeePromise.push(contract.getFee(CONST.getFeeType.CCY, currencyTypes[index].id, CONST.nullAddr));
    }
    ccyFees = await Promise.all(ccyFeePromise);
  }

  // get all token types fee
  let tokenFees;
  if (previousGlobalFees?.tokens) {
    tokenFees = previousGlobalFees.tokens;
  } else {
    const tokenFeePromise = [];
    for (let index = 0; index < tokenTypes.length; index++) {
      tokenFeePromise.push(contract.getFee(CONST.getFeeType.TOK, tokenTypes[index].id, CONST.nullAddr));
    }
    tokenFees = await Promise.all(tokenFeePromise);
  }

  // get all stId
  const maxStId = Number(hexToNumberString(secTokenMintedCount));
  const getTokenPromise = [];
  const existStId = [];
  ledgers.forEach((ledger) => {
    ledger.tokens.forEach((token) => {
      const stId = Number(token.stId);
      if (!existStId.includes(stId)) {
        existStId.push(stId);
      }
    });
  });
  for (let index = 0; index < maxStId; index++) {
    if (!existStId.includes(index + 1)) {
      getTokenPromise.push(contract.getSecToken(index + 1));
    }
  }
  const globalSecTokens = await Promise.all(getTokenPromise);

  // get all TransferedFullSecToken events
  // TODO:  will remove on next migration
  console.time('transferedFullSecTokens');
  const events = getTransferedFullSecToken ? await getTransferFullTokenEvents(contract) : [];
  const transferedFullSecTokens = events
    .filter((event) => Number(event.returnValues.mergedToSecTokenId) > 0)
    .map((event) => ({
      from: event.returnValues.from,
      to: event.returnValues.to,
      stId: event.returnValues.stId,
      mergedToSecTokenId: event.returnValues.mergedToSecTokenId,
      qty: event.returnValues.qty,
      transferType: event.returnValues.transferType,
    }));
  console.timeEnd('transferedFullSecTokens');
  console.log(`transferedFullSecTokens count: ${transferedFullSecTokens.length}`);

  // write backup to json file
  const backup = {
    info: {
      network,
      contractAddress,
      contractType,
      name,
      version,
      owners,
      symbol,
      unit,
      decimals,
    },
    data: {
      secTokenBaseId: hexToNumberString(secTokenBaseId),
      secTokenMintedCount: hexToNumberString(secTokenMintedCount),
      secTokenBurnedQty: hexToNumberString(secTokenBurnedQty),
      secTokenMintedQty: hexToNumberString(secTokenMintedQty),
      transferedFullSecTokensEvents: transferedFullSecTokens,
      whitelistAddresses,
      ledgerOwners,
      ledgerOwnersFees: previousLedgerOwnersFees || [],
      ccyTypes: currencyTypes.map((ccy) => ({
        id: ccy.id,
        name: ccy.name,
        unit: ccy.unit,
        decimals: ccy.decimals,
      })),
      ccyFees: previousGlobalFees?.currencies ?? ccyFees.map((fee) => helpers.decodeWeb3Object(fee)),
      tokenTypes: tokenTypes.map((tok, index) => {
        return {
          ...tok,
          ft: {
            expiryTimestamp: tokTypes[0][index]['ft']['expiryTimestamp'],
            underlyerTypeId: tokTypes[0][index]['ft']['underlyerTypeId'],
            refCcyId: tokTypes[0][index]['ft']['refCcyId'],
            initMarginBips: tokTypes[0][index]['ft']['initMarginBips'],
            varMarginBips: tokTypes[0][index]['ft']['varMarginBips'],
            contractSize: tokTypes[0][index]['ft']['contractSize'],
            feePerContract: tokTypes[0][index]['ft']['feePerContract'],
          },
        };
      }),
      tokenFees: previousGlobalFees?.tokens ?? tokenFees.map((fee) => helpers.decodeWeb3Object(fee)),
      globalSecTokens: globalSecTokens.map((token) => helpers.decodeWeb3Object(token)),
      ledgers,
      batches: batches
        .map((batch) => helpers.decodeWeb3Object(batch))
        .map((batch, index) => {
          return {
            ...batch,
            origTokFee: {
              fee_fixed: batches[index]['origTokFee']['fee_fixed'],
              fee_percBips: batches[index]['origTokFee']['fee_percBips'],
              fee_min: batches[index]['origTokFee']['fee_min'],
              fee_max: batches[index]['origTokFee']['fee_max'],
              ccy_perMillion: batches[index]['origTokFee']['ccy_perMillion'],
              ccy_mirrorFee: batches[index]['origTokFee']['ccy_mirrorFee'],
            },
          };
        }),
    },
  };
  return backup;
}

exports.getLedgerHashOffChain = getLedgerHashOffChain;
exports.createBackupData = createBackupData;
