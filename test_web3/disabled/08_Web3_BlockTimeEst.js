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

    it(`web3 direct - block time estimates...`, async () => {
        const { web3, ethereumTxChain } = CONST.getTestContextWeb3();
        
        var timestamp_est = 1479642530; // block 1
        for (var i=1 ; i < 100 ; i++) {
            const b = await web3.eth.getBlock(i);
            console.log(`${b.timestamp}`);
        }
    });
});

  