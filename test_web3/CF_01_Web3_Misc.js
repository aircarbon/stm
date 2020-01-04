const assert = require('assert');
//const acmJson = require('../build/contracts/StMaster.json');
//const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const { db } = require('../../common/dist');
require('dotenv').config();

const CONST = require('../const.js');

const OWNER_NDX = 0;
var OWNER, OWNER_privKey;

describe(`Contract Web3 Interface`, async () => {

    //
    // can run these to test web3 more quickly, e.g.
    //         Dev: ("export WEB3_NETWORK_ID=888 && export CONTRACT_TYPE=CASHFLOW && mocha test_web3 --timeout 9120000 --exit")
    //  Ropsten AC: ("export WEB3_NETWORK_ID=3 && export CONTRACT_TYPE=CASHFLOW && mocha test_web3 --timeout 9120000 --exit")
    //

    it(`web3 direct - cashflow - balanceOf`, async () => {
        var x;
        x = await CONST.getAccountAndKey(OWNER_NDX);
        OWNER = x.addr; OWNER_privKey = x.privKey;
        const data = await CONST.web3_call('balanceOf', [ '0xb67762628da0fbeb4793bd54a9e09d1dfd4cb08d' ], OWNER, OWNER_privKey);
        console.log('data', data);
    });
});

  