const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;

    var erc20_accountNdx = 500; // we start graylist erc20 addresses at this index

    before(async () => {  
        stm = await st.deployed();

        // whitelist the first N accounts (exchange-controlled accounts)
        const N = 10;
        for (var i=0 ; i < N ; i++) { // note - we include account[0] owner account in the whitelist
            const addr = accounts[i];
            const whitelistTx = await stm.whitelist(addr);
            CONST.logGas(whitelistTx, `whitelist account ndx #${i} ${addr}`);
        }
        const whitelist = await stm.getWhitelist();
        console.log('*** WHITELIST ***\n', whitelist);
    });
    
    beforeEach(async () => {
        erc20_accountNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`global.accountNdx: ${erc20_accountNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it('Erc20 - should not be able to add already whitelisted address', async () => {
        try {
            await stm.whitelist(accounts[0]);
        } catch (ex) {
            assert(ex.reason == 'Already whitelisted', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it('Erc20 - should be able to seal the whitelist', async () => {
        const sealTx = await stm.sealWhitelist();
        console.log('*** WHITELIST SEALED ***\ntx=', sealTx.tx);
    });

    it('Erc20 - should not be able to add to whitelist after sealing', async () => {
        try {
            const addr = accounts[erc20_accountNdx];
            await stm.whitelist(addr);
        } catch (ex) {
            assert(ex.reason == 'Whitelist sealed', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
});
