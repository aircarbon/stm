const assert = require('assert');
//const acmJson = require('../build/contracts/StMaster.json');
//const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const { db } = require('../utils-server/dist');

const CONST = require('../const.js');
process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

describe(`Contract Web3 Interface`, async () => {

    //
    //           Local: ("export INSTANCE_ID=local && mocha test_web3 --timeout 10000000 --exit")
    //         AWS Dev: ("export INSTANCE_ID=DEV && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //         AWS UAT: ("export INSTANCE_ID=UAT && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //

    before(async function () {
    });

    it(`web3 direct - block time estimates...`, async () => {
        const { web3, ethereumTxChain } = CONST.getTestContextWeb3();

        var timestamp_est = 1479642530; // block 1
        for (var i=1 ; i < 100 ; i++) {
            const b = await web3.eth.getBlock(i);
            console.log(`${b.timestamp}`);
        }
    });
});

