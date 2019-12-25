const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;

    const countDefaultSecSecTokenTypes = 2;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() == CONST.contractType.CASHFLOW) this.skip();
        await stm.sealContract();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
    });

    beforeEach(async () => {
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`token types - should have correct default values`, async () => {
        const types = (await stm.getSecTokenTypes()).tokenTypes;
        assert(types.length == countDefaultSecSecTokenTypes, 'unexpected default eeu type count');

        assert(types[0].name.includes('UNFCCC'), `unexpected default eeu type name 1`);
        assert(types[0].id == 1, 'unexpected default eeu type id 1');

        assert(types[1].name.includes('VERRA'), `unexpected default eeu type name 2`);
        assert(types[1].id == 2, 'unexpected default eeu type id 2');
    });

    it(`token types - should be able to use newly added ST types`, async () => {
        // add new ST type
        const addSecTokenTx = await stm.addSecTokenType('NEW_TYPE_NAME_2');
        const types = (await stm.getSecTokenTypes()).tokenTypes;
        assert(types.filter(p => p.name == 'NEW_TYPE_NAME_2')[0].id == countDefaultSecSecTokenTypes + 1, 'unexpected/missing new eeu type (2)');
        truffleAssert.eventEmitted(addSecTokenTx, 'AddedSecTokenType', ev => ev.id == countDefaultSecSecTokenTypes + 1 && ev.name == 'NEW_TYPE_NAME_2');

        // get new type id
        const newTypeId = types.filter(p => p.name == 'NEW_TYPE_NAME_2')[0].id;

        // batch count before
        const batchCountBefore = (await stm.getSecTokenBatchCount.call()).toNumber(); 
        //console.log(`batchCountBefore`, batchCountBefore);
        
        // mint new ST type: 2 batches 
        for (var i=0 ; i < 2 ; i++) {
            await stm.mintSecTokenBatch(newTypeId, CONST.ktCarbon * 100, 1, accounts[global.TaddrNdx], CONST.nullFees, [], [], { from: accounts[0] });
        }
        const batchCountAfter_Mint1 = (await stm.getSecTokenBatchCount.call()).toNumber(); 
        assert(batchCountAfter_Mint1 == batchCountBefore + 2, `unexpected max batch id ${batchCountAfter_Mint1} after minting (1)`);

        // mint default ST type: 4 batches 
        for (var i=0 ; i < 4 ; i++) {
            await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon * 100, 1, accounts[global.TaddrNdx], CONST.nullFees, [], [], { from: accounts[0] });
        }
        const batchCountAfter_Mint2 = (await stm.getSecTokenBatchCount.call()).toNumber();
        assert(batchCountAfter_Mint2 == batchCountBefore + 6, `unexpected max batch id ${batchCountAfter_Mint2} after minting (2)`);

        // validate ledger: 6 vSTs, 2 of new type
        const ledgerEntryAfter = await stm.getLedgerEntry(accounts[global.TaddrNdx]);
        assert(ledgerEntryAfter.tokens.length == 6, 'unexpected eeu count in ledger');
        assert(ledgerEntryAfter.tokens.filter(p => p.tokenTypeId == newTypeId).length == 2, 'unexpected new eeu type in ledger');
    });

    it(`token types - should not allow non-owner to add an ST type`, async () => {
        try {
            await stm.addSecTokenType('NEW_TYPE_NAME_3', { from: accounts[1] });
        } catch (ex) { 
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });

    it(`token types - should not allow adding an existing ST type name`, async () => {
        try {
            const types = (await stm.getSecTokenTypes()).tokenTypes;
            await stm.addSecTokenType(types[0].name, { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Duplicate name', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });

    it(`token types - should not allow adding an ST type when contract is read only`, async () => {
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            await stm.addSecTokenType('NEW_TYPE_NAME_4', { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            await stm.setReadOnly(false, { from: accounts[0] });
            return;
        }
        await stm.setReadOnly(false, { from: accounts[0] });
        assert.fail('expected contract exception');
    });
});