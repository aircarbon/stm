const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;
    const WHITELIST_COUNT = 50;

    before(async () => {  
        stm = await st.deployed();
    });

    it('whitelist - should not be able to add already whitelisted address', async () => {

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
        const sealTx = await stm.sealContract();
        console.log('*** WHITELIST SEALED *** tx=', sealTx.tx);
    });

    it('whitelist - should not be able to add to whitelist after sealing', async () => {
        try {
            const addr = accounts[WHITELIST_COUNT];
            await stm.whitelist(addr);
        } catch (ex) {
            assert(ex.reason == 'Contract is sealed', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
});
