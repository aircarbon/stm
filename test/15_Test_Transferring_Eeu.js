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
    it('transferring eeu - should allow one-sided transfer (A -> B) of a full single EEU (VCS) across ledger entries', async () => {
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
    });

    // one-sided kg transfer, no consideration, 1 full + 1 partial EEU (split)
    it('transferring eeu - should allow one-sided transfer (A -> B) of 1.5 vEEUs (VCS) across ledger entries', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.tonCarbon, 2,      accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund        (CONST.ccyType.USD, CONST.thousandUsd_cents, accounts[global.accountNdx + 1], { from: accounts[0] });
        
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 750,                              eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        helper.assert_nFull_1Partial({
                       fullEvents: data.eeuFullEvents,
                    partialEvents: data.eeuPartialEvents,
      expectFullTransfer_eeuCount: 1,
              ledgerSender_before: data.ledgerA_before,   ledgerSender_after: data.ledgerA_after,
            ledgerReceiver_before: data.ledgerB_before, ledgerReceiver_after: data.ledgerB_after,
        });
    });

    it('transferring eeu - should allow one-sided transfer (B -> A) of 1.5 vEEUs (UNFCCC) across ledger entries', async () => {
        await acm.fund        (CONST.ccyType.USD,    CONST.thousandUsd_cents, accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 2,      accounts[global.accountNdx + 1], { from: accounts[0] });
        
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                eeuTypeId_A: 0,
                    kg_B: 750,                              eeuTypeId_B: CONST.eeuType.UNFCCC,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        helper.assert_nFull_1Partial({
                       fullEvents: data.eeuFullEvents,
                    partialEvents: data.eeuPartialEvents,
      expectFullTransfer_eeuCount: 1,
              ledgerSender_before: data.ledgerB_before,   ledgerSender_after: data.ledgerB_after,
            ledgerReceiver_before: data.ledgerA_before, ledgerReceiver_after: data.ledgerA_after,
        });
    });

    // one-sided kg transfer, no consideration, 1 full + 1 partial EEU (split), receiver owns other type
    it('transferring eeu - should allow one-sided transfer (A -> B) of 1.5 vEEUs (VCS) across ledger entries, receiver owns other type', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 2,      accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], { from: accounts[0] });
        
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 750,                              eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        helper.assert_nFull_1Partial({
                       fullEvents: data.eeuFullEvents,
                    partialEvents: data.eeuPartialEvents,
      expectFullTransfer_eeuCount: 1,
              ledgerSender_before: data.ledgerA_before,   ledgerSender_after: data.ledgerA_after,
            ledgerReceiver_before: data.ledgerB_before, ledgerReceiver_after: data.ledgerB_after,
        });
    });

    // one-sided kg transfer, no consideration, 3 full + 1 partial EEU (split), receiver owns other type, sender owns >1 batch 
    it('transferring eeu - should allow one-sided transfer (A -> B) of 3.5 vEEUs (VCS) across ledger entries, receiver owns other type, sender owns >1 batch', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 2,      accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 2,      accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 2,      accounts[global.accountNdx + 1], { from: accounts[0] });
        
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 1750,                             eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        helper.assert_nFull_1Partial({
                       fullEvents: data.eeuFullEvents,
                    partialEvents: data.eeuPartialEvents,
      expectFullTransfer_eeuCount: 3,
              ledgerSender_before: data.ledgerA_before,   ledgerSender_after: data.ledgerA_after,
            ledgerReceiver_before: data.ledgerB_before, ledgerReceiver_after: data.ledgerB_after,
        });
    });

    // two-sided kg transfer / kg consideration, 1 full + 1 partial EEU (split), receiver owns and sends same type
    it('transferring eeu - should allow two-sided transfer (A <-> B) 1.5 vEEUs of the same EEU type across ledger entries', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 2,      accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 2,      accounts[global.accountNdx + 1], { from: accounts[0] });
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 750,                              eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 250,                              eeuTypeId_B: CONST.eeuType.VCS,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
    });

    // two-sided kg transfer / kg consideration, 1 full + 1 partial EEU (split), receiver owns and sends different type
    it('transferring eeu - should allow two-sided transfer (A <-> B) 1.5 vEEUs of different EEU types across ledger entries', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 2,      accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 2,      accounts[global.accountNdx + 1], { from: accounts[0] });
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 750,                              eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 250,                              eeuTypeId_B: CONST.eeuType.UNFCCC,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        // console.log('ledgerA_before.eeus', data.ledgerA_before.eeus);
        // console.log('ledgerB_before.eeus', data.ledgerB_before.eeus);
        // console.log('ledgerA_after.eeus', data.ledgerA_after.eeus);
        // console.log('ledgerB_after.eeus', data.ledgerB_after.eeus);
    });

    it('transferring eeu - should not allow one-sided transfer (A -> B) of an invalid tonnage', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1],
                -1,                          // kg_A
                CONST.eeuType.VCS,           // eeuTypeId_A
                0,                           // kg_B
                0,                           // eeuTypeId_B
                0, 0, 0, 0, 
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring eeu - should not allow one-sided transfer (B -> A) of an invalid tonnage', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1],
                0,                           // kg_A
                0,                           // eeuTypeId_A
                -1,                          // kg_B
                CONST.eeuType.VCS,           // eeuTypeId_B
                0, 0, 0, 0, 
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });    

    it('transferring eeu - should not allow one-sided transfer (A -> B) of a tonnage in excess of the amount held, correct type held', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.mtCarbon,  1,      accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1],
                CONST.tonCarbon + 1,         // kg_A
                CONST.eeuType.VCS,           // eeuTypeId_A
                0,                           // kg_B
                0,                           // eeuTypeId_B
                0, 0, 0, 0, 
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring eeu - should not allow one-sided transfer (A -> B) of a tonnage in excess of the amount held, incorrect type held', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.mtCarbon,  1,      accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1],
                CONST.tonCarbon,             // kg_A
                CONST.eeuType.UNFCCC,        // eeuTypeId_A
                0,                           // kg_B
                0,                           // eeuTypeId_B
                0, 0, 0, 0, 
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });    

    it('transferring eeu - should not allow one-sided transfer (B -> A) of a tonnage in excess of the amount held, correct type held', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1],
                0,                           // kg_A
                0,                           // eeuTypeId_A
                CONST.tonCarbon + 1,         // kg_B
                CONST.eeuType.VCS,           // eeuTypeId_B
                0, 0, 0, 0, 
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });
    
    it('transferring eeu - should not allow one-sided transfer (B -> A) of a tonnage in excess of the amount held, incorrect type held', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1],
                0,                           // kg_A
                0,                           // eeuTypeId_A
                CONST.tonCarbon,             // kg_B
                CONST.eeuType.UNFCCC,        // eeuTypeId_B
                0, 0, 0, 0, 
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });       
     
});