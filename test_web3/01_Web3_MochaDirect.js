const assert = require('assert');
const CONST = require('../const.js');
const EthereumJsTx = require('ethereumjs-tx');

describe('Contract Web3 Interface', async () => {

    //
    // can run these to test web3 more quickly ("mocha test_web3 --timeout 120000 --exit")
    //

    it('Should be able to derive exchange whitelist addresses and private keys from the mnemonic phrase', async () => {
        const { addr: fromAddr, privKey: fromPrivKey } = await CONST.getAccountAndKey(0);
        const { addr: toAddr,   privKey: toPrivKey }   = await CONST.getAccountAndKey(1);
        assert(fromPrivKey == '0cf8f198ace6d2d92a2c1cd7f3fc9b42e2af3b7fd7e64371922cb73a81493c1a');
    });

    // not working cleanly; Mocha doesn't terminate the test while the web3 .sendSignedTransaction() callbacks are still firing (which is forever, re. confirmed()?)
    it('Should be able to send ETH from exchange whitelist addresses', async function(done) {
        const data = await CONST.sendEthTestAddr(0, 1, "0.01");
        console.log('sendEthTestAddr resolved:', data);
        //return CONST.sendEthTestAddr(0, 1, "0.01");
    });

});

  