const assert = require('assert');
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const { db } = require('../../common/dist');
const _ = require('lodash');
const chalk = require('chalk');

const CONST = require('../const.js');
process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

describe(`Contract Web3 Interface`, async () => {

    //
    //           Local: ("export INSTANCE_ID=local && mocha test_web3 --timeout 10000000 --exit")
    //         AWS Dev: ("export INSTANCE_ID=DEV && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //         AWS UAT: ("export INSTANCE_ID=UAT && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //        AWS DEMO: ("export INSTANCE_ID=DEMO && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //

    before(async function () {
    });

    it(`web3 direct - WEB SOCKET - new tx sub...`, async () => {
        const { web3, ethereumTxChain } = CONST.getTestContextWeb3(true);
        //console.log(web3.currentProvider);

        const sub = web3.eth.subscribe('pendingTransactions', function (error, result) {
        }).on("data", function (transactionHash) {
            console.log('pendingTransactions, data: ', transactionHash);
            // web3.eth.getTransaction(transactionHash)
            // .then(function (transaction) {
            //     console.log('TX', transaction);
            // });
        });

        const O = await CONST.getAccountAndKey(0);
        for (let i = 0; i < 50000; i++) {
            await sleep(100);
            console.log('...');

            // owner ledger entry
            await CONST.web3_tx('fund', [CONST.ccyType.USD, 0, O.addr], O.addr, O.privKey); 
        }
    });

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
});

  