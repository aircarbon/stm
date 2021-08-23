// @ts-check
const fs = require('fs');
const path = require('path');
const ky = require('ky-universal');
const argv = require('yargs-parser')(process.argv.slice(2));
// @ts-ignore artifacts from truffle
const StMaster = artifacts.require('StMaster');
const series = require('async/series');

const { helpers } = require('../../orm/build');

process.on('unhandledRejection', console.error);

const getLedgerOwners = async (instanceType, token, body) => {
  console.log('getLedgerOwners', instanceType, body);
  if (instanceType.includes('DEMO_97')) {
    const response = await ky
      .get('https://demo-ac-wa-api.aircarbon.co/api/contracts/accounts', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
        searchParams: { ...body, networkId: 97 },
        timeout: false,
      })
      .json();
    return response.accounts;
  }

  if (instanceType.includes('56')) {
    const response = await ky
      .get('https://ac-wa-api.aircarbon.co/api/contracts/accounts', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
        searchParams: { ...body, networkId: 56 },
        timeout: false,
      })
      .json();
    return response.accounts;
  }

  const response = await ky
    .get('https://uat-ac-wa-api.aircarbon.co/api/contracts/accounts', {
      headers: {
        Authorization: 'Bearer ' + token,
      },
      searchParams: { ...body, networkId: 97 },
      timeout: false,
    })
    .json();
  return response.accounts;
};

const getFee = async (instanceType, token, body) => {
  console.log('getFee', instanceType, body);
  if (instanceType.includes('DEMO_97')) {
    const response = await ky
      .get('https://demo-ac-wa-api.aircarbon.co/api/contracts/fee', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
        searchParams: { ...body, networkId: 97 },
        timeout: false,
      })
      .json();
    return {
      fee_fixed: Number(response.fee_fixed._hex),
      fee_percBips: Number(response.fee_percBips._hex),
      fee_min: Number(response.fee_min._hex),
      fee_max: Number(response.fee_max._hex),
      ccy_perMillion: Number(response.ccy_perMillion._hex),
      ccy_mirrorFee: response.ccy_mirrorFee,
    };
  }

  if (instanceType.includes('56')) {
    const response = await ky
      .get('https://ac-wa-api.aircarbon.co/api/contracts/fee', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
        searchParams: { ...body, networkId: 56 },
        timeout: false,
      })
      .json();
    return {
      fee_fixed: Number(response.fee_fixed._hex),
      fee_percBips: Number(response.fee_percBips._hex),
      fee_min: Number(response.fee_min._hex),
      fee_max: Number(response.fee_max._hex),
      ccy_perMillion: Number(response.ccy_perMillion._hex),
      ccy_mirrorFee: response.ccy_mirrorFee,
    };
  }

  const response = await ky
    .get('https://uat-ac-wa-api.aircarbon.co/api/contracts/fee', {
      headers: {
        Authorization: 'Bearer ' + token,
      },
      searchParams: { ...body, networkId: 97 },
      timeout: false,
    })
    .json();
  return {
    fee_fixed: Number(response.fee_fixed._hex),
    fee_percBips: Number(response.fee_percBips._hex),
    fee_min: Number(response.fee_min._hex),
    fee_max: Number(response.fee_max._hex),
    ccy_perMillion: Number(response.ccy_perMillion._hex),
    ccy_mirrorFee: response.ccy_mirrorFee,
  };
};

/**
 * Usage: `INSTANCE_ID=local truffle exec contract_upgrade/prepare.js -s=ADDR -t=TOKEN [--network <name>] [--compile]`,
 * @link https://github.com/trufflesuite/truffle/issues/889#issuecomment-522581580
 */
module.exports = async (callback) => {
  const contractAddress = `0x${argv?.s}`.toLowerCase();

  // return error if not a valid address
  if (!contractAddress.match(/^0x[0-9a-f]{40}$/i)) {
    return callback(new Error(`Invalid address: ${contractAddress}`));
  }

  const contract = await StMaster.at(contractAddress);
  const name = await contract.name();
  const version = await contract.version();
  console.log(`Contract address: ${contractAddress}`);
  console.log(`Name: ${name}`);
  console.log(`Version: ${version}`);

  const ledgerOwners = await getLedgerOwners(process.env.INSTANCE_ID, argv.t, {
    contractName: name,
    contractVersion: version,
  });

  // get all ccy and token types
  const ccyTypes = await contract.getCcyTypes();
  const { ccyTypes: currencyTypes } = helpers.decodeWeb3Object(ccyTypes);

  const tokTypes = await contract.getSecTokenTypes();
  const { tokenTypes } = helpers.decodeWeb3Object(tokTypes);

  // get all global fee
  const ccyPromises = [];
  currencyTypes.forEach((currencyType) => {
    ccyPromises.push(
      getFee(process.env.INSTANCE_ID, argv.t, {
        contractName: name,
        contractVersion: version,
        type: 'Currency',
        address: '0x0000000000000000000000000000000000000000',
        typeId: currencyType.id,
      }),
    );
  });
  const tokenPromises = [];
  tokenTypes.forEach((tokenType) => {
    tokenPromises.push(
      getFee(process.env.INSTANCE_ID, argv.t, {
        contractName: name,
        contractVersion: version,
        type: 'Token',
        address: '0x0000000000000000000000000000000000000000',
        typeId: tokenType.id,
      }),
    );
  });

  const globalFees = { tokens: await Promise.all(tokenPromises), currencies: await Promise.all(ccyPromises) };

  // get fee for all ledger owners
  const ledgerOwnersFeesPromises = [];
  ledgerOwners.forEach((ledgerOwner) => {
    // get all global fee
    const ccyPromises = [];
    currencyTypes.forEach((currencyType) => {
      ccyPromises.push(
        getFee(process.env.INSTANCE_ID, argv.t, {
          contractName: name,
          contractVersion: version,
          type: 'Currency',
          address: ledgerOwner,
          typeId: currencyType.id,
        }),
      );
    });
    const tokenPromises = [];
    tokenTypes.forEach((tokenType) => {
      tokenPromises.push(
        getFee(process.env.INSTANCE_ID, argv.t, {
          contractName: name,
          contractVersion: version,
          type: 'Token',
          address: ledgerOwner,
          typeId: tokenType.id,
        }),
      );
    });
    ledgerOwnersFeesPromises.push(function getFeeForOwner(cb) {
      Promise.all(tokenPromises)
        .then((tokens) => Promise.all(ccyPromises).then((currencies) => cb(null, { tokens, currencies })))
        .catch((error) => cb(error));
    });
  });

  const ledgerOwnersFees = await series(ledgerOwnersFeesPromises);

  const data = {
    ledgerOwners,
    ledgerOwnersFees,
    ccyTypes: currencyTypes.map((ccy) => ({
      id: ccy.id,
      name: ccy.name,
      unit: ccy.unit,
      decimals: ccy.decimals,
    })),
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
    globalFees,
  };

  // write backup to json file
  const backupFile = path.join(__dirname, `${name}.json`);
  console.log(`Writing backup to ${backupFile}`);
  fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));

  callback();
};
