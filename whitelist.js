require('dotenv').config();
const mapSeries = require('async/mapSeries');
const got = require('got');
const { web3_call } = require('./const.js');
const { db } = require('../common/dist');

process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

(async function () {
  const contractSealed = await web3_call('getContractSeal', []);
  const DEFAULT_WHITELIST_INDEX = 10;
  if (contractSealed) {
    // reset whitelist index, to default
    console.warn('Reset default whitelist index');
    await db.AddConfigSetting('next_wl_index', DEFAULT_WHITELIST_INDEX);

    const GAS_PRICES_URL = 'https://www.etherchain.org/api/gasPriceOracle';

    const response = await got(GAS_PRICES_URL);
    const { safeLow, standard, fast, fastest } = JSON.parse(response.body);

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

    // insert all whitelist addresses
    const allWhitelisted = await web3_call('getWhitelist', []);
    mapSeries(
      allWhitelisted,
      async (addr) => {
        console.warn(addr);
        await db.AddWhitelistAddress(addr);
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
    console.warn('NOT SEAL YET!');
  }
})();
