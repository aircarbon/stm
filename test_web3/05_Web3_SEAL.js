const assert = require('assert');
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const { db } = require('../../common/dist');
require('dotenv').config();
const _ = require('lodash');
const chalk = require('chalk');

const CONST = require('../const.js');
describe(`Contract Web3 Interface`, async () => {

    //
    // can run these to test web3 more quickly, e.g.
    //         Dev: ("export WEB3_NETWORK_ID=888 && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //  Ropsten AC: ("export WEB3_NETWORK_ID=3 && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //

    before(async function () {
    });

    it(`web3 direct - seal`, async () => {
        // seal
        const sealedStatus = await CONST.web3_call('getContractSeal', []);
        if (!sealedStatus) {
            const owner = await CONST.getAccountAndKey(0);
            const sealTx = await CONST.web3_tx('sealContract', [], owner.addr, owner.privKey);
        }
    });
});

  