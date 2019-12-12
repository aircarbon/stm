const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;

    beforeEach(async () => {
        stm = await st.deployed();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // it('libs - test1', async () => {
    //     console.log('st2 addr', await stm.addr_st2.call());
    //     console.log('call st2', await stm.call_st2.call());
    // });

    it('setup - contract owner should have default ledger entry', async () => {
        const ownerLedgerEntry = await stm.getLedgerEntry(accounts[0]);
        assert(ownerLedgerEntry.exists == true, 'contract owner missing ledger entry');
    });

    it('setup - only contract owner should be able to set read only state', async () => {
        try {
            await stm.setReadOnly(true, { from: accounts[1] });
        } catch (ex) {
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
});
