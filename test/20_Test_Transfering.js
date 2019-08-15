const ac = artifacts.require('AcMaster');
const CONST = require('../const.js');
const helper = require('./transferHelper.js');

contract('AcMaster', accounts => {
    var acm;

    beforeEach(async () => {
        acm = await ac.deployed();

        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx += 2;
        console.log(`global.global.accountNdx: ${global.accountNdx} - beforeEach: ${acm.address} - getEeuBatchCount: ${(await acm.getEeuBatchCount.call()).toString()}`);
    });

    it('transferring - should not allow non-owner to transfer across ledger entries', async () => {
        try {
            await acm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 0, 0, 0, 0, 0, 0, 0, 0,  { from: accounts[1] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring - should not allow a null transfer', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 0, 0, 0, 0, 0, 0, 0, 0,  { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });
    
    it('transferring - should not allow a transfer to an unkown ledger entry', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        try {
            await acm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                0, 0, 0, 0, 
                CONST.thousandUsd_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring - should not allow a transfer from an unkown ledger entry', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                0, 0, 0, 0, 
                CONST.thousandUsd_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring - should not same-origin multiple asset transfers (1)', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1,     accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1,     accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                CONST.ktCarbon,              // kg_A
                CONST.eeuType.VCS,           // eeuTypeId_A
                0,                           // kg_B
                0,                           // eeuTypeId_B
                CONST.thousandUsd_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring - should not same-origin multiple asset transfers (2)', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1,     accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1,     accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                0,                           // kg_A
                0,                           // eeuTypeId_A
                CONST.ktCarbon,              // kg_B
                CONST.eeuType.VCS,           // eeuTypeId_B
                0,                           // ccy_amount_A
                0,                           // ccyTypeId_A
                CONST.thousandUsd_cents,     // ccy_amount_B
                CONST.ccyType.USD,           // ccyTypeId_B
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring - should not same-origin multiple asset transfers (3)', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1,     accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1,     accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                CONST.ktCarbon,              // kg_A
                CONST.eeuType.VCS,           // eeuTypeId_A
                CONST.ktCarbon,              // kg_B
                CONST.eeuType.VCS,           // eeuTypeId_B
                CONST.thousandUsd_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                CONST.thousandUsd_cents,     // ccy_amount_B
                CONST.ccyType.USD,           // ccyTypeId_B
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

});