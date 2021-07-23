const assert = require('assert');
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const { db } = require('../../utils-server');

const CONST = require('../const.js');
process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

describe(`Contract Web3 Interface`, async () => {

    //  Local: ("export INSTANCE_ID=local && mocha test_web3 --timeout 10000000 --exit")
    //  AWS Dev: ("export INSTANCE_ID=DEV && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //  AWS UAT: ("export INSTANCE_ID=UAT && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")

    before(async function () {
    });

    it(`web3 direct - getCashflowData()`, async () => {
        const cfd = await CONST.web3_call('getCashflowData', [])
        console.log('getCashflowData', cfd);
    });
});

