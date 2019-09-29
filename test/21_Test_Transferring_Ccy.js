const ac = artifacts.require('AcMaster');
const CONST = require('../const.js');
const helper = require('./transferHelper.js');

contract('AcMaster', accounts => {
    var acm;

    beforeEach(async () => {
        acm = await ac.deployed();

        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx += 2;
        //console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${acm.address} (owner: ${accounts[0]}) - getEeuBatchCount: ${(await acm.getEeuBatchCount.call()).toString()}`);
    });

    it('transferring ccy - should allow one-sided transfer (A -> B) of one currency (USD) across ledger entries', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                eeuTypeId_A: 0,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: CONST.thousandUsd_cents / 2,      ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
    });

    it('transferring ccy - should allow one-sided transfer (B -> A) of one currency (ETH) across ledger entries', async () => {
        await acm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.accountNdx + 1], { from: accounts[0] });
        await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                eeuTypeId_A: 0,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
        });
    });
    
    it('transferring ccy - should allow two-sided transfer (A <-> B) of the same currency across ledger entries', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                eeuTypeId_A: 0,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: CONST.thousandUsd_cents / 2,      ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: CONST.thousandUsd_cents / 4,      ccyTypeId_B: CONST.ccyType.USD,
        });
    });

    it('transferring ccy - should allow two-sided transfer (A <-> B) of different currencies across ledger entries', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.billionUsd_cents,        accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.ETH, CONST.millionEth_wei,          accounts[global.accountNdx + 1], { from: accounts[0] });
        await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                eeuTypeId_A: 0,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: CONST.billionUsd_cents,           ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: CONST.millionEth_wei,             ccyTypeId_B: CONST.ccyType.ETH,
        });
    });

    it('transferring ccy - should have reasonable gas cost for one-sided currency transfer (A -> B), aka. fund movement', async () => {
        await acm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.ETH, 0,                             accounts[global.accountNdx + 1], { from: accounts[0] });
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                eeuTypeId_A: 0,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        console.log(`\t>>> gasUsed - ccy one-way (A -> B): ${data.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('transferring ccy - should have reasonable gas cost for two-sided currency transfer (A <-> B)', async () => {
        await acm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.accountNdx + 1], { from: accounts[0] });
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                eeuTypeId_A: 0,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 10000000,                         ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 50000000,                         ccyTypeId_B: CONST.ccyType.ETH,
        });
        console.log(`\t>>> gasUsed - ccy two-way (A <-> B): ${data.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('transferring ccy - should not allow one-sided transfer (A -> B) of an invalid currency value', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                0, 0, 0, 0, 0
                -1,                          // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring ccy - should not allow one-sided transfer (B -> A) of an invalid currency value', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                0, 0, 0, 0, 
                0,                           // ccy_amount_A
                0,                           // ccyTypeId_A
                -1,                          // ccy_amount_B
                CONST.ccyType.USD,           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });    

    it('transferring ccy - should not allow two-sided transfer (A <-> B) of invalid currency values', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                0, 0, 0, 0, 
                -1,                          // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                -1,                          // ccy_amount_B
                CONST.ccyType.USD,           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });    

    it('transferring ccy - should not allow one-sided transfer (A -> B) of a currency value in excess of the balance', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                0, 0, 0, 0, 
                CONST.thousandUsd_cents + 1, // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring ccy - should not allow one-sided transfer (B -> A) of a currency value in excess of the balance', async () => {
        await acm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                0, 0, 0, 0, 
                0,                           // ccy_amount_A
                0,                           // ccyTypeId_A
                CONST.thousandEth_wei,       // ccy_amount_B
                CONST.ccyType.ETH,           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring ccy - should not allow two-sided transfer (A <-> B) of currency values in excess of the balances', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 
                0, 0, 0, 0, 
                CONST.millionUsd_cents,      // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                CONST.thousandEth_wei,       // ccy_amount_B
                CONST.ccyType.ETH,           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });
});