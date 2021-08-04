// @ts-check
const { soliditySha3, hexToNumberString } = require('web3-utils');
const argv = require('yargs-parser')(process.argv.slice(2));

const CONST = require('../const');
const { helpers } = require('../../orm/build');

// implement get ledger hash
// Refer to: getLedgerHashcode on LedgerLib.sol
function getLedgerHashOffChain(data) {
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
  }
  console.log('ledger hash - token types & exchange token fees', ledgerHash);

  // hash whitelist
  const whitelistAddresses = data?.whitelistAddresses ?? [];
  whitelistAddresses.forEach((address) => {
    ledgerHash = soliditySha3(ledgerHash, address);
  });

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

  console.log('result', ledgerHash);
  return ledgerHash;
}

async function createBackupData(contract, contractAddress, contractType) {
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

  // get ledgers
  const ledgerOwners = await contract.getLedgerOwners();
  const ledgers = await Promise.all(ledgerOwners.map((owner) => contract.getLedgerEntry(owner)));

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
  const ccyFeePromise = [];
  for (let index = 0; index < currencyTypes.length; index++) {
    ccyFeePromise.push(contract.getFee(CONST.getFeeType.CCY, currencyTypes[index].id, CONST.nullAddr));
  }
  const ccyFees = await Promise.all(ccyFeePromise);

  // get all token types fee
  const tokenFeePromise = [];
  for (let index = 0; index < tokenTypes.length; index++) {
    tokenFeePromise.push(contract.getFee(CONST.getFeeType.TOK, tokenTypes[index].id, CONST.nullAddr));
  }
  const tokenFees = await Promise.all(tokenFeePromise);

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
      whitelistAddresses,
      ledgerOwners,
      ccyTypes: currencyTypes.map((ccy) => ({
        id: ccy.id,
        name: ccy.name,
        unit: ccy.unit,
        decimals: ccy.decimals,
      })),
      ccyFees: ccyFees.map((fee) => helpers.decodeWeb3Object(fee)),
      tokenTypes: tokenTypes.map((tok, index) => {
        console.log(tok, index);
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
      tokenFees: tokenFees.map((fee) => helpers.decodeWeb3Object(fee)),
      ledgers: ledgers
        .map((ledger) => helpers.decodeWeb3Object(ledger))
        .map((ledger, index) => {
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
        }),
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
