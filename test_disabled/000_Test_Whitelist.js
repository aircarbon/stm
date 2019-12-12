const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/hdkey');
const wallet = require('ethereumjs-wallet');
const CONST = require('../const.js');
const helper = require('../test/transferHelper.js');

contract("StMaster", accounts => {
    var stm;
    const WHITELIST_COUNT = 50;

    // async function getPrivKey() {
    //     const MNEMONIC = require('../dev_mnemonic.js').MNEMONIC;
    //     console.log('MNEMONIC: ', MNEMONIC);
    //     const seed = await bip39.mnemonicToSeed(MNEMONIC);
    //     const hdk = hdkey.fromMasterSeed(seed);

    //     // a0 = m/44'/60'/0'/0/0
    //     // a1 = m/44'/60'/0'/0/1
    //     const addr_node = hdk.derivePath("m/44'/60'/0'/0/0");
    //     const addr = addr_node.getWallet().getAddressString();
    //     const private_key = addr_node.getWallet().getPrivateKey();        
    //     console.log('   0 addr: ', addr);
    //     console.log('0 privkey: ', private_key.toString());
    //     console.dir(private_key);  // 0x0cf8f198ace6d2d92a2c1cd7f3fc9b42e2af3b7fd7e64371922cb73a81493c1a
    // }

    before(async () => {  
        stm = await st.deployed();
    });

    it('whitelist - should not be able to add already whitelisted address', async () => {
        //getPrivKey();

        stm = await st.deployed();

        // whitelist (exchange-controlled accounts) all accounts up to graylist test start
        var totalCostUsd = 0;
        for (var i=0 ; i < WHITELIST_COUNT ; i++) { // note - we include account[0] owner account in the whitelist
            const addr = accounts[i];
            const whitelistTx = await stm.whitelist(addr);
            totalCostUsd += CONST.logGas(whitelistTx, `whitelist account ndx #${i} ${addr}`);
        }
        global.TaddrNdx += WHITELIST_COUNT;

        console.log('TOTAL COST USD $: ', totalCostUsd.toFixed(2)); // 50 = $10 one by one

        const whitelist = await stm.getWhitelist();
        console.log(`*** WHITELIST ***\n`, whitelist); 
    });

    it('whitelist - should not be able to add already whitelisted address', async () => {
        try {
            await stm.whitelist(accounts[0]);
        } catch (ex) {
            assert(ex.reason == 'Already whitelisted', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it('whitelist - should be able to seal the whitelist', async () => {
        const sealTx = await stm.sealWhitelist();
        console.log('*** WHITELIST SEALED *** tx=', sealTx.tx);
    });

    it('whitelist - should not be able to add to whitelist after sealing', async () => {
        try {
            const addr = accounts[WHITELIST_COUNT];
            await stm.whitelist(addr);
        } catch (ex) {
            assert(ex.reason == 'Whitelist sealed', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
});
