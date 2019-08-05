const Web3 = require('web3');
const web3 = new Web3();

module.exports = {
    eeuType: Object.freeze({
        UNFCCC: 0,
        VCS: 1,
    }),

    tonCarbon: 1000,                      // one ton carbon in kg
     ktCarbon: 1000 * 1000,               // kiloton carbon in kg
     mtCarbon: 1000 * 1000 * 1000,        // megaton carbon in kg
     gtCarbon: 1000 * 1000 * 1000 * 1000, // gigaton carbon in kg

    // approx values - for cost estimations
    gasPriceEth: web3.utils.fromWei(web3.utils.toWei("20", "gwei"), 'ether'),
         ethUsd: 220

};
