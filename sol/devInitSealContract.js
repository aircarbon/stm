// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms

const envFile = require('path').resolve(
  __dirname,
  './.env.' + (process.env.INSTANCE_ID !== undefined ? process.env.INSTANCE_ID : ''),
);
require('dotenv').config({ path: envFile });

const { getAccountAndKey, web3_call, web3_tx, logGas } = require('./const.js');

process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

//
// Initializes the contract with default values, whitelists and seals
//
(async function () {
  let x = await getAccountAndKey(0);
  OWNER = x.addr;
  OWNER_privKey = x.privKey;

  // initialize contract default values
  await require('./devSetupContract.js').setDefaults();
  //process.exit();

  // whitelist & seal contract
  const contractSealed = await web3_call('getContractSeal', []);
  console.log('contractSealed: ', contractSealed);
  if (!contractSealed) {
    console.group('WHITELISTING...');
    const WHITELIST_COUNT = Number(process.env.WHITELIST_COUNT || 30);
    const wl = await web3_call('getWhitelist', []);
    const wl_addrs = [];
    for (let i = 0; i < WHITELIST_COUNT; i++) {
      // note - we include account[0] owner account in the whitelist
      x = await getAccountAndKey(i);
      if (!wl.map((p) => p.toLowerCase()).includes(x.addr.toLocaleLowerCase())) {
        wl_addrs.push(x.addr);
      } else console.log(`skipping ${x.addr} (already in WL)...`);
    }
    await web3_tx('whitelistMany', [wl_addrs], OWNER, OWNER_privKey);

    console.groupEnd();
    console.group('SEALING...');
    await web3_tx('sealContract', [], OWNER, OWNER_privKey);
    console.groupEnd();
    if (process.env.CONTRACT_TYPE === 'CASHFLOW_CONTROLLER') {
      // whitelist & seal base types
      const nameOverride = undefined;
      const { tokenTypes } = await web3_call('getSecTokenTypes', [], nameOverride);
      for (let type of tokenTypes) {
        console.group('SEALING FOR...', type);
        await web3_tx('whitelistMany', [wl_addrs], OWNER, OWNER_privKey, nameOverride, type.cashflowBaseAddr);
        await web3_tx('sealContract', [], OWNER, OWNER_privKey, nameOverride, type.cashflowBaseAddr);
      }
    }
  }

  process.exit();
})();
