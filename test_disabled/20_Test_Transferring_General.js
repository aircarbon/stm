const st = artifacts.require('StMaster');
const CONST = require('../const.js');
const helper = require('./transferHelper.js');

contract("StMaster", accounts => {
    var stm;

    beforeEach(async () => {
        stm = await st.deployed();
        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx += 2;
        //console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${stm.address} (owner: ${accounts[0]}) - getSecTokenBatchCount: ${(await stm.getSecTokenBatchCount.call()).toString()}`);
    });

    it('transferring - should not allow non-owner to transfer across ledger entries', async () => {
        try {
            await stm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 0, 0, 0, 0, 0, 0, 0, 0, false, { from: accounts[1] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring - should not allow a null transfer', async () => {
        await stm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await stm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 0, 0, 0, 0, 0, 0, 0, 0, false, { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });
    
    it('transferring - should not allow a transfer to an unkown ledger entry', async () => {
        await stm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        try {
            await stm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                0, 0, 0, 0, 
                CONST.thousandUsd_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                false,
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring - should not allow a transfer from an unkown ledger entry', async () => {
        await stm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await stm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                0, 0, 0, 0, 
                CONST.thousandUsd_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring - should not allow single-origin multiple-asset transfers (1)', async () => {
        await stm.fund(CONST.ccyType.USD,                CONST.thousandUsd_cents,       accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.ktCarbon, 1,             accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD,                CONST.thousandUsd_cents,       accounts[global.accountNdx + 1],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.ktCarbon, 1,             accounts[global.accountNdx + 1], [], [], { from: accounts[0] });
        try {
            await stm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                CONST.ktCarbon,              // qty_A
                CONST.tokenType.VCS,         // tokenTypeId_A
                0,                           // qty_B
                0,                           // tokenTypeId_B
                CONST.thousandUsd_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                false,
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring - should not allow single-origin multiple-asset transfers (2)', async () => {
        await stm.fund(CONST.ccyType.USD,                CONST.thousandUsd_cents,       accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.ktCarbon, 1,             accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD,                CONST.thousandUsd_cents,       accounts[global.accountNdx + 1],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.ktCarbon, 1,             accounts[global.accountNdx + 1], [], [], { from: accounts[0] });
        try {
            await stm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                0,                           // qty_A
                0,                           // tokenTypeId_A
                CONST.ktCarbon,              // qty_B
                CONST.tokenType.VCS,         // tokenTypeId_B
                0,                           // ccy_amount_A
                0,                           // ccyTypeId_A
                CONST.thousandUsd_cents,     // ccy_amount_B
                CONST.ccyType.USD,           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring - should not allow single-origin multiple-asset transfers (3)', async () => {
        await stm.fund(CONST.ccyType.USD,                CONST.thousandUsd_cents,       accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.ktCarbon, 1,             accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD,                CONST.thousandUsd_cents,       accounts[global.accountNdx + 1],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.ktCarbon, 1,             accounts[global.accountNdx + 1], [], [], { from: accounts[0] });
        try {
            await stm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                CONST.ktCarbon,              // qty_A
                CONST.tokenType.VCS,         // tokenTypeId_A
                CONST.ktCarbon,              // qty_B
                CONST.tokenType.VCS,         // tokenTypeId_B
                CONST.thousandUsd_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                CONST.thousandUsd_cents,     // ccy_amount_B
                CONST.ccyType.USD,           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring - should not allow transfer to self', async () => {
        await stm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await stm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 0], 
                0, 0, 0, 0, 
                CONST.thousandUsd_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring - should not allow transfers when contract is read only', async () => {
        await stm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.accountNdx + 1],         { from: accounts[0] });
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            await stm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                0, 0, 0, 0, 
                CONST.thousandUsd_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                CONST.oneEth_wei,            // ccy_amount_B
                CONST.ccyType.ETH,           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { 
            await stm.setReadOnly(false, { from: accounts[0] });
            return;
        }
        await stm.setReadOnly(false, { from: accounts[0] });
        assert.fail('expected restriction exception');
    });

});