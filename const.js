//const BigNumber = require('big-number');
const Big = require('big.js');
//const BN = require('bn.js');

const Web3 = require('web3');
const web3 = new Web3();

module.exports = {
    logTestAccountUsage: false,

    nullAddr: "0x0000000000000000000000000000000000000000",

    nullFees: {
        fee_fixed: 0,
        fee_percBips: 0,
        fee_min: 0,
        fee_max: 0,
    },

    // transfer types (event data)
    transferType: Object.freeze({
        USER: 0,
EXCHANGE_FEE: 1,
    ORIG_FEE: 2,
    }),

    // token types (contract data)
    tokenType: Object.freeze({
        UNFCCC: 1,
           VCS: 2,
    }),

    // ccy types (contract data)
    ccyType: Object.freeze({
        SGD: 1,
        ETH: 2,
    }), 

    // eeu kg constants
    tonCarbon: 1000,                      // one ton carbon in kg
     ktCarbon: 1000 * 1000,               // kiloton carbon in kg
     mtCarbon: 1000 * 1000 * 1000,        // megaton carbon in kg
     gtCarbon: 1000 * 1000 * 1000 * 1000, // gigaton carbon in kg

    // ccy constants
         oneUsd_cents: Big(1 * 100).toFixed(),
     hundredUsd_cents: Big(100 * 100).toFixed(),
    thousandUsd_cents: Big(1000 * 100).toFixed(),
     millionUsd_cents: Big(1000 * 1000 * 100).toFixed(),
     billionUsd_cents: Big(1000).times(1000).times(1000).times(100).toFixed(),
    thousandthEth_wei: Big(web3.utils.toWei("1", "ether") / 1000).toFixed(),                  // "1000000000000000", 
     hundredthEth_wei: Big(web3.utils.toWei("1", "ether") / 100).toFixed(),                   // "10000000000000000", 
         tenthEth_wei: Big(web3.utils.toWei("1", "ether") / 10).toFixed(),                    // "100000000000000000", 
           oneEth_wei: Big(web3.utils.toWei("1", "ether")).toFixed(),                         // "1000000000000000000", 
      thousandEth_wei: Big(web3.utils.toWei("1", "ether") * 1000).toFixed(),                  // "1000000000000000000000", 
       millionEth_wei: Big(web3.utils.toWei("1", "ether")).times(1000).times(1000).toFixed(), // "1000000000000000000000000", 

    // gas approx values - for cost estimations
    gasPriceEth: web3.utils.fromWei(web3.utils.toWei("20", "gwei"), 'ether'),
         ethUsd: 146

};
