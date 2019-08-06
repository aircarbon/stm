const BigNumber = require('big-number');
const Web3 = require('web3');
const web3 = new Web3();

module.exports = {
    // types
    eeuType: Object.freeze({
        UNFCCC: 0,
           VCS: 1,
    }),

    ccyType: Object.freeze({
        USD: 0,
        ETH: 1,
    }),

    // eeu kg constants
    tonCarbon: 1000,                      // one ton carbon in kg
     ktCarbon: 1000 * 1000,               // kiloton carbon in kg
     mtCarbon: 1000 * 1000 * 1000,        // megaton carbon in kg
     gtCarbon: 1000 * 1000 * 1000 * 1000, // gigaton carbon in kg

    // ccy constants
    thousandUsd_cents: BigNumber(1000 * 100),
     millionUsd_cents: BigNumber(1000 * 1000 * 100),
           oneEth_wei: BigNumber(web3.utils.toWei("1", "ether")),
      thousandEth_wei: BigNumber(web3.utils.toWei("1", "ether") * 1000),
       millionEth_wei: BigNumber(web3.utils.toWei("1", "ether")).multiply(1000).multiply(1000),

    // gas approx values - for cost estimations
    gasPriceEth: web3.utils.fromWei(web3.utils.toWei("20", "gwei"), 'ether'),
         ethUsd: 220

};
