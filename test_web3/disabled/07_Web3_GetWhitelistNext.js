const assert = require('assert');
//const acmJson = require('../build/contracts/StMaster.json');
//const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const { db } = require('../../common/dist');
require('dotenv').config();

const CONST = require('../const.js');

describe(`Contract Web3 Interface`, async () => {

    //
    // can run these to test web3 more quickly, e.g.
    //         Dev: ("export WEB3_NETWORK_ID=888 && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //  Ropsten AC: ("export WEB3_NETWORK_ID=3 && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //

    before(async function () {
    });

    it(`web3 direct - getWhitelist()`, async () => {
        const wl_all = await CONST.web3_call('getWhitelist', [])
        console.log('wl_all', wl_all);
    });

    it(`web3 direct - getWhitelistNext()`, async () => {
        const wl_next = await CONST.web3_call('getWhitelistNext', [])
        console.log('wl_next', wl_next);
    });
});

  