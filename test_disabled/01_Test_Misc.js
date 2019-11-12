const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;

    beforeEach(async () => {
        stm = await st.deployed();
        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx++;
        //console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${stm.address} (owner: ${accounts[0]}) - getSecTokenBatchCount: ${(await stm.getSecTokenBatchCount.call()).toString()}`);
    });

    it('setup - contract owner should have default ledger entry', async () => {
        const ownerLedgerEntry = await stm.getLedgerEntry(accounts[0]);
        assert(ownerLedgerEntry.exists == true, 'contract owner missing ledger entry');
    });

    it('setup - only contract owner should be able to set read only state', async () => {
        try {
            await stm.setReadOnly(true, { from: accounts[1] });
        } catch (ex) {
            return;
        }
        assert.fail('expected restriction exception');
    });
});
