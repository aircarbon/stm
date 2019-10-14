const ac = artifacts.require('AcMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract('AcMaster', accounts => {
    var acm;//, global.accountNdx = 1;

    beforeEach(async () => {
        acm = await ac.deployed();
        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx++;
        //console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${acm.address} (owner: ${accounts[0]}) - getEeuBatchCount: ${(await acm.getEeuBatchCount.call()).toString()}`);
    });

    it('setup - contract owner should have default ledger entry', async () => {
        const ownerLedgerEntry = await acm.getLedgerEntry(accounts[0]);
        assert(ownerLedgerEntry.exists == true, 'contract owner missing ledger entry');
    });

    it('setup - only contract owner should be able to set read only state', async () => {
        try {
            await acm.setReadOnly(true, { from: accounts[1] });
        } catch (ex) {
            return;
        }
        assert.fail('expected restriction exception');
    });
});
