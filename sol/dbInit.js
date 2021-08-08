// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms

const envFile = require('path').resolve(
  __dirname,
  './.env.' + (process.env.INSTANCE_ID !== undefined ? process.env.INSTANCE_ID : ''),
);
require('dotenv').config({ path: envFile });
const mapSeries = require('async/mapSeries');
const allSettled = require('promise.allsettled');
const ky = require('ky-universal');
const { web3_call } = require('./const.js');
const  db  = require('../orm/build');

// Copy whitelist address to DB and init whitelist & oracle price settings
//           Local: ("INSTANCE_ID=local node dbInit.js")
//           DEV: ("INSTANCE_ID=DEV node dbInit.js")
//           UAT: ("INSTANCE_ID=UAT node dbInit.js")
//           PROD: ("INSTANCE_ID=PROD node dbInit.js")
process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

(async function () {
  const contractSealed = await web3_call('getContractSeal', []);
  const DEFAULT_WHITELIST_INDEX = 10;
  if (contractSealed) {
    // reset whitelist index to default
    console.warn('Reset default whitelist index');
    try {
      await db.AddConfigSetting('next_wl_index', DEFAULT_WHITELIST_INDEX);
    } catch (error) {
      console.warn('Whitelist index is already configured');
    }

    const defaultGasPrices = [
      'gasPrice_admin_mintSecTokenBatch_mwei',
      'gasPrice_admin_fund_mwei',
      'gasPrice_admin_transferOrTrade_mwei',
      'gasPrice_admin_burnTokens_mwei',
      'gasPrice_admin_withdraw_mwei',
      'gasPrice_admin_setOriginatorFeeTokenBatch_mwei',
      'gasPrice_admin_addMetaSecTokenBatch_mwei',
      'gasPrice_admin_setFee_CcyType_mwei',
      'gasPrice_admin_setFee_TokType_mwei',
      'gasPrice_exchange_transferOrTrade_mwei',
    ];

    const gasPricesPromise = defaultGasPrices.map((action) => db.AddConfigSetting(action, 'fast'));

    try {
      await Promise.all(gasPricesPromise);
    } catch (error) {
      console.warn('Gas price setting has been setup');
    }

    // insert gas prices
    try {
      const [ethChainResult, gasStationResult] = await allSettled([
        ky('https://www.etherchain.org/api/gasPriceOracle').json(),
        ky('https://ethgasstation.info/json/ethgasAPI.json').json(),
      ]);
      if (ethChainResult.status === 'fulfilled') {
        const { safeLow, standard, fast, fastest } = ethChainResult.value;
        console.warn('Oracles prices in GWei', {
          safeLow,
          standard,
          fast,
          fastest,
        });
        await Promise.all([
          db.AddGasPriceValue('safeLow', safeLow),
          db.AddGasPriceValue('standard', standard),
          db.AddGasPriceValue('fast', fast),
          db.AddGasPriceValue('fastest', fastest),
        ]);
      } else if (gasStationResult.status === 'fulfilled') {
        const { safeLow, average, fast, fastest } = gasStationResult.value;
        console.warn('Oracles prices in GWei', {
          safeLow,
          average,
          fast,
          fastest,
        });
        await Promise.all([
          db.AddGasPriceValue('safeLow', safeLow / 10),
          db.AddGasPriceValue('standard', average / 10),
          db.AddGasPriceValue('fast', fast / 10),
          db.AddGasPriceValue('fastest', fastest / 10),
        ]);
      }
    } catch (error) {
      console.error(error);
    }

    // TODO: sync countries from Cynopsis to DB https://developer.cynopsis.co/#/records/records_countries

    // insert all whitelist addresses
    const allWhitelisted = await web3_call('getWhitelist', []);
    const totalAddresses = await db.GetTotalWhitelistAddress();
    console.warn(totalAddresses.recordsets[0][0].total, allWhitelisted.length);
    if (totalAddresses.recordsets[0][0].total < allWhitelisted.length) {
      mapSeries(
        allWhitelisted,
        async (addr) => {
          console.warn(addr);
          try {
            await db.AddWhitelistAddress(addr);
          } catch (error) {
            if (error.message.includes('Cannot insert duplicate key row in object')) {
              console.warn('This address has been added.');
            } else {
              throw new Error(error.message);
            }
          }
          return addr;
        },
        (err, result) => {
          if (err) {
            console.warn(err);
          } else {
            console.warn(result);
          }
          process.exit();
        },
      );
    } else {
      console.warn('Whitelist address is ready');
      process.exit();
    }
  } else {
    console.warn('NOT SEALED YET!');
  }
})();
