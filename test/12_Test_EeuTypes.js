const ac = artifacts.require('AcMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract('AcMaster', accounts => {
    var acm, accountNdx = 1;

    const countDefaultEeuTypes = 2;

    beforeEach(async () => {
        acm = await ac.deployed();
        accountNdx++;
    });

    it('eeu types - should have correct default values', async () => {
        const types = (await acm.getEeuTypes()).eeuTypes;
        assert(types.length == countDefaultEeuTypes, 'unexpected default eeu type count');

        assert(types[0].name == 'UNFCCC', 'unexpected default eeu type name 0');
        assert(types[0].id == 0, 'unexpected default eeu type id 0');

        assert(types[1].name == 'VCS', 'unexpected default eeu type name 1');
        assert(types[1].id == 1, 'unexpected default eeu type id 1');
    });

    it('eeu types - should be able to use newly added EEU types', async () => {
        // add new EEU type
        const addEeuTx = await acm.addEeuType('NEW_TYPE_NAME_2');
        const types = (await acm.getEeuTypes()).eeuTypes;
        assert(types.filter(p => p.name == 'NEW_TYPE_NAME_2')[0].id == countDefaultEeuTypes, 'unexpected/missing new eeu type (2)');

        truffleAssert.eventEmitted(addEeuTx, 'AddedEeuType', ev => { 
            return ev.id == countDefaultEeuTypes
                && ev.name == 'NEW_TYPE_NAME_2'
                ;
        });

        // get new type id
        const newTypeId = types.filter(p => p.name == 'NEW_TYPE_NAME_2')[0].id;
        
        // mint new EEU type: 2x 2 vEEUs
        for (var i=0 ; i < 2 ; i++) {
            await acm.mintEeuBatch(newTypeId, CONST.ktCarbon * 100, 2, accounts[accountNdx], { from: accounts[0] });
        }
        assert((await acm.getEeuBatchCount.call()).toNumber() == 2, 'unexpected max batch id after minting (1)');

        // mint default EEU type: 2x 2 vEEUs
        for (var i=0 ; i < 2 ; i++) {
            await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon * 100, 2, accounts[accountNdx], { from: accounts[0] });
        }
        assert((await acm.getEeuBatchCount.call()).toNumber() == 4, 'unexpected max batch id after minting (2)');

        // validate ledger: 8 vEEUs, 4 of each type in 2 batches, including 4 of new type
        const ledgerEntryAfter = await acm.getLedgerEntry(accounts[accountNdx]);
        assert(ledgerEntryAfter.eeus.length == 8, 'unexpected eeu count in ledger');
        assert(ledgerEntryAfter.eeus.filter(p => p.eeuTypeId == newTypeId).length == 4, 'unexpected new eeu type in ledger');
    });

    it('eeu types - should not allow non-owner to add an EEU type', async () => {
        try {
            await acm.addEeuType('NEW_TYPE_NAME_3', { from: accounts[1], });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('eeu types - should not allow adding an existing EEU type name', async () => {
        try {
            await acm.addEeuType('UNFCCC');
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });
});