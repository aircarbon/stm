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

    // one-sided kg transfer, no consideration, 1 full EEU
    /*it('transferring eeu - should allow one-sided transfer (A -> B) of a full single EEU (VCS) across ledger entries', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund        (CONST.ccyType.USD, CONST.thousandUsd_cents, accounts[global.accountNdx + 1], { from: accounts[0] });
        
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: CONST.ktCarbon,                   eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        assert(data.eeuFullEvents.length == 1 && data.eeuPartialEvents == 0, 'unexpected event composition');
        assert(data.eeuFullEvents[0].eeuId == data.ledgerA_before.eeus[0].eeuId, 'unexpected event eeu id vs. ledger A before');
        assert(data.ledgerA_after.eeus.length == 0, 'unexpected eeu count ledger A after');
        assert(data.ledgerB_after.eeus.length == 1, 'unexpected eeu count ledger B after');
        assert(data.ledgerB_after.eeus[0].eeuId == data.ledgerA_before.eeus[0].eeuId, 'unexpected eeu id ledger B after vs. ledger A before');
    });

    it('transferring eeu - should allow one-sided transfer (B -> A) of a full single EEU (UNFCCC) across ledger entries', async () => {
        await acm.fund        (CONST.ccyType.USD,    CONST.thousandUsd_cents, accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1,       accounts[global.accountNdx + 1], { from: accounts[0] });
        
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                eeuTypeId_A: 0,
                    kg_B: CONST.ktCarbon,                   eeuTypeId_B: CONST.eeuType.UNFCCC,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        assert(data.eeuFullEvents.length == 1 && data.eeuPartialEvents == 0, 'unexpected event composition');
        assert(data.eeuFullEvents[0].eeuId == data.ledgerB_before.eeus[0].eeuId, 'unexpected event eeu id vs. ledger B before');
        assert(data.ledgerB_after.eeus.length == 0, 'unexpected eeu count ledger B after');
        assert(data.ledgerA_after.eeus.length == 1, 'unexpected eeu count ledger A after');
        assert(data.ledgerA_after.eeus[0].eeuId == data.ledgerB_before.eeus[0].eeuId, 'unexpected eeu id ledger A after vs. ledger B before');
    });

    // one-sided kg transfer, no consideration, 0 full + 1 partial EEU (split)
    it('transferring eeu - should allow one-sided transfer (A -> B) of a partial EEU (VCS) across ledger entries', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund        (CONST.ccyType.USD, CONST.thousandUsd_cents, accounts[global.accountNdx + 1], { from: accounts[0] });
        
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: CONST.ktCarbon / 2,               eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        assert(data.eeuFullEvents.length == 0 && data.eeuPartialEvents.length == 1, 'unexpected event composition');
        assert(data.eeuPartialEvents[0].splitFromEeuId == data.ledgerA_before.eeus[0].eeuId, 'unexpected event parent eeu id vs. ledger A before');
        assert(data.eeuPartialEvents[0].newEeuId == data.ledgerB_after.eeus[0].eeuId, 'unexpected event soft-minted eeu id vs. ledger B after');
        assert(data.ledgerA_after.eeus.length == 1, 'unexpected eeu count ledger A after');
        assert(data.ledgerB_after.eeus.length == 1, 'unexpected eeu count ledger B after');
        assert(data.ledgerB_after.eeus[0].eeuId != data.ledgerA_after.eeus[0].eeuId, 'unexpected eeu id ledger B after vs. ledger A after');
    });

    it('transferring eeu - should allow one-sided transfer (B -> A) of a partial EEU (VCS) across ledger entries', async () => {
        await acm.fund        (CONST.ccyType.USD, CONST.thousandUsd_cents, accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1,       accounts[global.accountNdx + 1], { from: accounts[0] });
        
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                eeuTypeId_A: 0,
                    kg_B: CONST.ktCarbon / 2,               eeuTypeId_B: CONST.eeuType.VCS,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        assert(data.eeuFullEvents.length == 0 && data.eeuPartialEvents.length == 1, 'unexpected event composition');
        assert(data.eeuPartialEvents[0].splitFromEeuId == data.ledgerB_before.eeus[0].eeuId, 'unexpected event parent eeu id vs. ledger B before');
        assert(data.eeuPartialEvents[0].newEeuId == data.ledgerA_after.eeus[0].eeuId, 'unexpected event soft-minted eeu id vs. ledger A after');
        assert(data.ledgerA_after.eeus.length == 1, 'unexpected eeu count ledger A after');
        assert(data.ledgerB_after.eeus.length == 1, 'unexpected eeu count ledger B after');
        assert(data.ledgerA_after.eeus[0].eeuId != data.ledgerB_after.eeus[0].eeuId, 'unexpected eeu id ledger A after vs. ledger B after');
    });*/

    // one-sided kg transfer, no consideration, 1 full + 1 partial EEU (split)
    //...
    
    // one-sided kg transfer, no consideration, n full + 1 partial EEU (split)
    // two-sided kg transfer, kg consideration, x3 as above
    //
    // two-sided mixed transfer (trade): kg for ccy, x3 as above

    /*it('transferring eeu - should not allow a currency transfer to an unkown ledger entry', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        try {
            await acm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 0, 0, 0, 0,
                CONST.thousandUsd_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring eeu - should not allow a currency transfer from an unkown ledger entry', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 0, 0, 0, 0,
                CONST.thousandUsd_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring eeu - should not allow one-sided transfer (A -> B) of an invalid currency value', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1],
                0, 0, 0, 0, 
                -1,                          // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring eeu - should not allow one-sided transfer (B -> A) of an invalid currency value', async () => {
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
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });    

    it('transferring eeu - should not allow two-sided transfer (A <-> B) of invalid currency values', async () => {
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
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });    

    it('transferring eeu - should not allow one-sided transfer (A -> B) of a currency value in excess of the balance', async () => {
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
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring eeu - should not allow one-sided transfer (B -> A) of a currency value in excess of the balance', async () => {
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
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring eeu - should not allow two-sided transfer (A <-> B) of currency values in excess of the balances', async () => {
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
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });*/
});