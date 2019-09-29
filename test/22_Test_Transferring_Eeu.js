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

    // one-sided kg transfer, no consideration, 1 full EEU
    it('transferring eeu - should allow one-sided transfer (A -> B) of 1.0 vEEU (VCS) across ledger entries', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1,       accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.fund        (CONST.ccyType.USD, CONST.thousandUsd_cents, accounts[global.accountNdx + 1],         { from: accounts[0] });
        
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

    it('transferring eeu - should allow one-sided transfer (B -> A) of 1.0 vEEU (UNFCCC) across ledger entries', async () => {
        await acm.fund        (CONST.ccyType.USD,    CONST.thousandUsd_cents, accounts[global.accountNdx + 0],         { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1,       accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        
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

    // one-sided kg transfer, no consideration, 0.5 EEU (split)
    it('transferring eeu - should allow one-sided transfer (A -> B) of 0.5 vEEU (VCS) across ledger entries', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1,       accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.fund        (CONST.ccyType.USD, CONST.thousandUsd_cents, accounts[global.accountNdx + 1],         { from: accounts[0] });
        
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

    it('transferring eeu - should allow one-sided transfer (B -> A) of 0.5 vEEU (VCS) across ledger entries', async () => {
        await acm.fund        (CONST.ccyType.USD, CONST.thousandUsd_cents, accounts[global.accountNdx + 0],         { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1,       accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        
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
    // it('transferring eeu - should allow one-sided transfer (A -> B) of 1.5 vEEUs (VCS) across ledger entries', async () => {
    //     await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.tonCarbon, 2,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
    //     await acm.fund        (CONST.ccyType.USD, CONST.thousandUsd_cents, accounts[global.accountNdx + 1],         { from: accounts[0] });
    //     const data = await helper.transferLedger({ acm, accounts, 
    //             ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
    //                 kg_A: 750,                              eeuTypeId_A: CONST.eeuType.VCS,
    //                 kg_B: 0,                                eeuTypeId_B: 0,
    //         ccy_amount_A: 0,                                ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                ccyTypeId_B: 0,
    //     });
    //     helper.assert_nFull_1Partial({
    //                    fullEvents: data.eeuFullEvents,
    //                 partialEvents: data.eeuPartialEvents,
    //   expectFullTransfer_eeuCount: 1,
    //           ledgerSender_before: data.ledgerA_before,   ledgerSender_after: data.ledgerA_after,
    //         ledgerReceiver_before: data.ledgerB_before, ledgerReceiver_after: data.ledgerB_after,
    //     });
    // });
    // it('transferring eeu - should allow one-sided transfer (B -> A) of 1.5 vEEUs (UNFCCC) across ledger entries', async () => {
    //     await acm.fund        (CONST.ccyType.USD,    CONST.thousandUsd_cents, accounts[global.accountNdx + 0],         { from: accounts[0] });
    //     await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 2,      accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
    //     const data = await helper.transferLedger({ acm, accounts, 
    //             ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
    //                 kg_A: 0,                                eeuTypeId_A: 0,
    //                 kg_B: 750,                              eeuTypeId_B: CONST.eeuType.UNFCCC,
    //         ccy_amount_A: 0,                                ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                ccyTypeId_B: 0,
    //     });
    //     helper.assert_nFull_1Partial({
    //                    fullEvents: data.eeuFullEvents,
    //                 partialEvents: data.eeuPartialEvents,
    //   expectFullTransfer_eeuCount: 1,
    //           ledgerSender_before: data.ledgerB_before,   ledgerSender_after: data.ledgerB_after,
    //         ledgerReceiver_before: data.ledgerA_before, ledgerReceiver_after: data.ledgerA_after,
    //     });
    // });

    // one-sided kg transfer, no consideration, partial EEU (split), receiver owns other type
    it('transferring eeu - should allow one-sided transfer (A -> B) of 0.5 vEEU (VCS) across ledger entries, receiver owns other type', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 500,                              eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        helper.assert_nFull_1Partial({
                       fullEvents: data.eeuFullEvents,
                    partialEvents: data.eeuPartialEvents,
      expectFullTransfer_eeuCount: 0,
              ledgerSender_before: data.ledgerA_before,   ledgerSender_after: data.ledgerA_after,
            ledgerReceiver_before: data.ledgerB_before, ledgerReceiver_after: data.ledgerB_after,
        });
    });

    // one-sided kg transfer, no consideration, full + partial EEU (split), receiver owns other type
    it('transferring eeu - should allow one-sided transfer (A -> B) of 1.5 vEEUs (VCS) across ledger entries, receiver owns other type', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 1500,                             eeuTypeId_A: CONST.eeuType.VCS,
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

    // one-sided kg transfer, no consideration, full + partial EEU (split), receiver owns same type
    it('transferring eeu - should allow one-sided transfer (A -> B) of 1.5 vEEUs (VCS) across ledger entries, receiver owns same type', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 1500,                             eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        //console.log('data.eeuFullEvents', data.eeuFullEvents);
        //console.log('data.eeuPartialEvents', data.eeuPartialEvents);
        helper.assert_nFull_1Partial({
                       fullEvents: data.eeuFullEvents,
                    partialEvents: data.eeuPartialEvents,
      expectFullTransfer_eeuCount: 1,
              ledgerSender_before: data.ledgerA_before,   ledgerSender_after: data.ledgerA_after,
            ledgerReceiver_before: data.ledgerB_before, ledgerReceiver_after: data.ledgerB_after,
        });
    });

    // two-sided kg transfer / kg consideration, 1 full + 1 partial EEU (split), receiver owns and sends same type
    it('transferring eeu - should allow two-sided transfer (A <-> B) 1.5 vEEUs (VCS) across ledger entries, receiver owns same type', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
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
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
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

    // merge test
    // one-sided kg transfer, no consideration, partial EEU (split), receiver owns same type, same batch (merge)
    it('transferring eeu - should allow one-sided transfer (A -> B) of 0.5 + 0.25 vEEUs (VCS) across ledger entries, receiver owns same type, same batch', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.fund        (CONST.ccyType.USD,    0,                       accounts[global.accountNdx + 1],         { from: accounts[0] });
        
        // setup: transfer 0.5, from batch 1 
        await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 500,                              eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });

        // transfer 0.25, also from batch 1 -- expect merge on existing destination eeu of same batch
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 250,                              eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        assert(data.ledgerB_after.eeus.length == 1, 'ledger B was not merged');
        assert(data.eeuPartialEvents.some(p => p.mergedToEeuId == data.ledgerB_before.eeus[0].eeuId), 'unexpected merge event data');
    });

    // merge test
    // one-sided kg transfer, no consideration, partial EEU (split), receiver owns same type, same and different batches (merge)
    it('transferring eeu - should allow one-sided transfer (A -> B) of 0.1 + 0.001, 0.001... vEEUs (UNFCCC) across ledger entries, receiver owns same type, same batch', async () => {
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC,    CONST.tonCarbon, 1,   accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC,    CONST.tonCarbon, 1,   accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        
        // setup: transfer 0.1, split batch 1 to receiver
        await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 100,                              eeuTypeId_A: CONST.eeuType.UNFCCC,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });

        // repeated transfers -- expect consistent merge of existing destination eeu of the same batch
        for (var i = 0; i < 3 ; i++) {
            const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 1,                                eeuTypeId_A: CONST.eeuType.UNFCCC,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
            });
            assert(data.ledgerB_after.eeus.length == data.ledgerB_before.eeus.length, 'ledger B was not merged');
            assert(data.eeuPartialEvents.some(p => data.ledgerB_before.eeus.some(p2 => p2.eeuId == p.mergedToEeuId)), 'unexpected merge event data');
            //console.log(`i=${i} data.ledgerA_after.eeus`, data.ledgerA_after.eeus);
            //console.log(`i=${i} data.ledgerB_after.eeus`, data.ledgerB_after.eeus);
        }
    });

    // merge test
    // two-sided kg / kg transfer, partial EEU (split), receiver owns same type, same batch (merge)
    it('transferring eeu - should allow two-sided transfer (A <-> B) of 0.1 + 0.001, 0.001... vEEUs (UNFCCC) across ledger entries, receiver owns same type, same batch', async () => {
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC,    CONST.tonCarbon, 1,   accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,       CONST.tonCarbon, 1,   accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        
        // setup A: transfer 0.1 from B, split batch 2 to A
        // setup B: transfer 0.1 from A, split batch 1 to B
        await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 100,                              eeuTypeId_A: CONST.eeuType.UNFCCC,
                    kg_B: 100,                              eeuTypeId_B: CONST.eeuType.VCS,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });

        // repeated transfers -- expect consistent merge of existing destination eeu of the same batch
        for (var i = 0; i < 3 ; i++) {
            const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 1,                                eeuTypeId_A: CONST.eeuType.UNFCCC,
                    kg_B: 1,                                eeuTypeId_B: CONST.eeuType.VCS,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
            });
            assert(data.ledgerB_after.eeus.length == data.ledgerB_before.eeus.length, 'ledger B was not merged');
            assert(data.eeuPartialEvents.some(p => data.ledgerB_before.eeus.some(p2 => p2.eeuId == p.mergedToEeuId)), 'unexpected merge event data for ledger B');

            assert(data.ledgerA_after.eeus.length == data.ledgerA_before.eeus.length, 'ledger A was not merged');
            assert(data.eeuPartialEvents.some(p => data.ledgerA_before.eeus.some(p2 => p2.eeuId == p.mergedToEeuId)), 'unexpected merge event data for ledger A');
        }
    });

    it('transferring eeu - should have reasonable gas cost for one-sided 0.5 vEEU transfer (A -> B), aka. carbon movement', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.fund(CONST.ccyType.ETH, 0,                                  accounts[global.accountNdx + 1],         { from: accounts[0] });
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 750,                              eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        console.log(`\t>>> gasUsed - 0.5 vEEU one-way (A -> B): ${data.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('transferring eeu - should not allow one-sided transfer (A -> B) of an invalid tonnage', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1],
                -1,                          // kg_A
                CONST.eeuType.VCS,           // eeuTypeId_A
                0,                           // kg_B
                0,                           // eeuTypeId_B
                0, 0, 0, 0, 
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring eeu - should not allow one-sided transfer (B -> A) of an invalid tonnage', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1],
                0,                           // kg_A
                0,                           // eeuTypeId_A
                -1,                          // kg_B
                CONST.eeuType.VCS,           // eeuTypeId_B
                0, 0, 0, 0, 
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });    

    it('transferring eeu - should not allow one-sided transfer (A -> B) of a tonnage in excess of the amount held, correct type held', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.mtCarbon,  1,      accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1],
                CONST.tonCarbon + 1,         // kg_A
                CONST.eeuType.VCS,           // eeuTypeId_A
                0,                           // kg_B
                0,                           // eeuTypeId_B
                0, 0, 0, 0, 
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('transferring eeu - should not allow one-sided transfer (A -> B) of a tonnage in excess of the amount held, incorrect type held', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.mtCarbon,  1,      accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1],
                CONST.tonCarbon,             // kg_A
                CONST.eeuType.UNFCCC,        // eeuTypeId_A
                0,                           // kg_B
                0,                           // eeuTypeId_B
                0, 0, 0, 0, 
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });    

    it('transferring eeu - should not allow one-sided transfer (B -> A) of a tonnage in excess of the amount held, correct type held', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1],
                0,                           // kg_A
                0,                           // eeuTypeId_A
                CONST.tonCarbon + 1,         // kg_B
                CONST.eeuType.VCS,           // eeuTypeId_B
                0, 0, 0, 0, 
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });
    
    it('transferring eeu - should not allow one-sided transfer (B -> A) of a tonnage in excess of the amount held, incorrect type held', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1],
                0,                           // kg_A
                0,                           // eeuTypeId_A
                CONST.tonCarbon,             // kg_B
                CONST.eeuType.UNFCCC,        // eeuTypeId_B
                0, 0, 0, 0, 
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });
});