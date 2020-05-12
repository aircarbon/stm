require('dotenv').config();
const mapSeries = require('async/mapSeries');
const allSettled = require('promise.allsettled');
const got = require('got');
const { web3_call } = require('./const.js');
const { db } = require('../common/dist/lib');

//
// Initializes test/local DB with default/test values
//

process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

(async function () {
  const contractSealed = await web3_call('getContractSeal', []);
  const DEFAULT_WHITELIST_INDEX = 10;
  if (contractSealed) {
    // reset whitelist index to default
    console.warn('Reset default whitelist index');
    await db.AddConfigSetting('next_wl_index', DEFAULT_WHITELIST_INDEX);

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

    await Promise.all(gasPricesPromise);

    // insert gas prices
    try {
      const [ethChainResult, gasStationResult] = await allSettled([
        got('https://www.etherchain.org/api/gasPriceOracle'),
        got('https://ethgasstation.info/json/ethgasAPI.json'),
      ]);
      console.warn({
        ethChainResult,
        gasStationResult,
      });
      if (ethChainResult.status === 'fulfilled') {
        const { safeLow, standard, fast, fastest } = JSON.parse(ethChainResult.value.body);
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
        const { safeLow, average, fast, fastest } = JSON.parse(gasStationResult.value.body);
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
    console.warn('NOT SEALED YET!');
  }
})();
