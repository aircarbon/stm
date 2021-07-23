// @ts-check
const fs = require("fs");
const argv = require("yargs-parser")(process.argv.slice(2));
// @ts-ignore artifacts from truffle
const StMaster = artifacts.require("StMaster");

const CONST = require("./const");
const { helpers } = require("../orm/build");

process.on("unhandledRejection", console.error);

/**
 * Usage: `truffle exec backup.js -s=ADDR [--network <name>] [--compile]`,
 * @link https://github.com/trufflesuite/truffle/issues/889#issuecomment-522581580
 */
module.exports = async (callback) => {
  const contractAddress = `0x${argv?.s}`.toLowerCase();

  // return error if not a valid address
  if (!contractAddress.match(/^0x[0-9a-f]{40}$/i)) {
    return callback(new Error(`Invalid address: ${contractAddress}`));
  }

  const contract = await StMaster.at(contractAddress);

  // TODO: support different contract types
  // skip if contract type is not commodity
  const contractType = await contract.getContractType();
  if (Number(contractType) !== Number(CONST.contractType.COMMODITY)) {
    callback(`Invalid contract type: ${contractType}`);
    return;
  }

  // get contract info
  const owners = await contract.getOwners();
  const unit = await contract.unit();
  const symbol = await contract.symbol();
  const decimals = await contract.decimals();
  const network = argv?.network || "development";
  // Note: we might got to { code: -32000, message: 'execution reverted' } on BSC Mainnet/Testnet with Binance nodes
  // only works with our private node
  const ledgerHash = await CONST.getLedgerHashcode(contract);
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
  const ledgers = await Promise.all(
    ledgerOwners.map((owner) => contract.getLedgerEntry(owner))
  );

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
    ccyFeePromise.push(
      contract.getFee(
        CONST.getFeeType.CCY,
        currencyTypes[index].id,
        CONST.nullAddr
      )
    );
  }
  const ccyFees = await Promise.all(ccyFeePromise);

  // get all token types fee
  const tokenFeePromise = [];
  for (let index = 0; index < tokenTypes.length; index++) {
    tokenFeePromise.push(
      contract.getFee(
        CONST.getFeeType.CCY,
        tokenTypes[index].id,
        CONST.nullAddr
      )
    );
  }
  const tokenFees = await Promise.all(tokenFeePromise);

  // write backup to json file
  const backup = {
    info: {
      network,
      contractAddress,
      contractType,
      ledgerHash,
      name,
      version,
      owners,
      symbol,
      unit,
      decimals,
    },
    data: {
      secTokenBaseId,
      secTokenMintedCount,
      secTokenBurnedQty,
      secTokenMintedQty,
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
        return {
          ...tok,
          ft: {
            expiryTimestamp: tokTypes[0][index]["ft"]["expiryTimestamp"],
            underlyerTypeId: tokTypes[0][index]["ft"]["underlyerTypeId"],
            refCcyId: tokTypes[0][index]["ft"]["refCcyId"],
            initMarginBips: tokTypes[0][index]["ft"]["initMarginBips"],
            varMarginBips: tokTypes[0][index]["ft"]["varMarginBips"],
            contractSize: tokTypes[0][index]["ft"]["contractSize"],
            feePerContract: tokTypes[0][index]["ft"]["feePerContract"],
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
              fee_fixed: batches[index]["origTokFee"]["fee_fixed"],
              fee_percBips: batches[index]["origTokFee"]["fee_percBips"],
              fee_min: batches[index]["origTokFee"]["fee_min"],
              fee_max: batches[index]["origTokFee"]["fee_max"],
              ccy_perMillion: batches[index]["origTokFee"]["ccy_perMillion"],
              ccy_mirrorFee: batches[index]["origTokFee"]["ccy_mirrorFee"],
            },
          };
        }),
    },
  };

  // write backup to json file
  const backupFile = `data/${contractAddress}.json`;
  console.log(`Writing backup to ${backupFile}`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

  callback();
};
