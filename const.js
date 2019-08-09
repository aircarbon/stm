//const BigNumber = require('big-number');
const Big = require('big.js');

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
    thousandUsd_cents: Big(1000 * 100).toFixed(),
     millionUsd_cents: Big(1000 * 1000 * 100).toFixed(),
           oneEth_wei: Big(web3.utils.toWei("1", "ether")).toFixed(),                         // "1000000000000000000", 
      thousandEth_wei: Big(web3.utils.toWei("1", "ether") * 1000).toFixed(),                  // "1000000000000000000000", 
       millionEth_wei: Big(web3.utils.toWei("1", "ether")).times(1000).times(1000).toFixed(), // "1000000000000000000000000", 

    // gas approx values - for cost estimations
    gasPriceEth: web3.utils.fromWei(web3.utils.toWei("20", "gwei"), 'ether'),
         ethUsd: 220

};
