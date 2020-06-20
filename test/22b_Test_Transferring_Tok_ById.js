const truffleAssert = require('truffle-assertions');
const st = artifacts.require('StMaster');
const BN = require('bn.js');
const CONST = require('../const.js');
const transferHelper = require('./transferHelper.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
        
        await stm.whitelistMany(accounts.slice(global.TaddrNdx, global.TaddrNdx + 50));
        await stm.sealContract();
        await setupHelper.setDefaults({ stm, accounts });
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // one-sided kg transfer, no consideration, 1 full ST
    it(`transferring tok by id - should allow one-sided transfer (A -> B) of 2 STs across ledger entries`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.GT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents, B,                          );

        const burnType = CONST.tokenType.TOK_T2;
        
        const le_before_A = await stm.getLedgerEntry(A);
        const sts_A = le_before_A.tokens.filter(p => p.tokenTypeId == burnType && p.stId % 3 == 1);
        const stIds_A = sts_A.map(p => p.stId);
        const stsQty_A = sts_A.map(p => p.currentQty).reduce((a,b) => a.add(new BN(b)), new BN(0));
        //console.log('stIds_A', stIds_A);
        //console.log('stsQty_A.toString()', stsQty_A.toString());
        //console.log('le_before_A', le_before_A);

        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                     ledger_B: B,
                   qty_A: stsQty_A.toString(),              tokenTypeId_A: burnType,
                   qty_B: 0,                                tokenTypeId_B: 0,
               k_stIds_A: stIds_A,                              k_stIds_B: [],
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
        });
        const le_after_A = await stm.getLedgerEntry(A);
        console.log('le_after_A.tokens', le_after_A.tokens);
        assert(le_after_A.tokens.length == le_before_A.tokens.length - stIds_A.length, 'unexpected ledger A token count after transfer');

        const le_after_B = await stm.getLedgerEntry(B);
        console.log('le_after_B.tokens', le_after_B.tokens);
        assert(le_after_B.tokens.length == stIds_A.length, 'unexpected ledger B token count after transfer');

        // assert(data.eeuFullEvents.length == 1 && data.eeuPartialEvents == 0, 'unexpected event composition');
        // assert(data.eeuFullEvents[0].stId == data.ledgerA_before.tokens[0].stId, 'unexpected event eeu id vs. ledger A before');
        // assert(data.ledgerA_after.tokens.length == 0, 'unexpected eeu count ledger A after');
        // assert(data.ledgerB_after.tokens.length == 1, 'unexpected eeu count ledger B after');
        // assert(data.ledgerB_after.tokens[0].stId == data.ledgerA_before.tokens[0].stId, 'unexpected eeu id ledger B after vs. ledger A before');
    });

    // it(`transferring tok - should allow one-sided transfer (B -> A) of 1.0 vST (CORSIA) across ledger entries`, async () => {
    //     await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents, accounts[global.TaddrNdx + 0],                            { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        
    //     const data = await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
    //                qty_A: 0,                                tokenTypeId_A: 0,
    //                qty_B: CONST.GT_CARBON,                  tokenTypeId_B: CONST.tokenType.TOK_T1,
    //         ccy_amount_A: 0,                                  ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                  ccyTypeId_B: 0,
    //     });
    //     assert(data.eeuFullEvents.length == 1 && data.eeuPartialEvents == 0, 'unexpected event composition');
    //     assert(data.eeuFullEvents[0].stId == data.ledgerB_before.tokens[0].stId, 'unexpected event eeu id vs. ledger B before');
    //     assert(data.ledgerB_after.tokens.length == 0, 'unexpected eeu count ledger B after');
    //     assert(data.ledgerA_after.tokens.length == 1, 'unexpected eeu count ledger A after');
    //     assert(data.ledgerA_after.tokens[0].stId == data.ledgerB_before.tokens[0].stId, 'unexpected eeu id ledger A after vs. ledger B before');
    // });

    // // one-sided kg transfer, no consideration, 0.5 ST (split)
    // it(`transferring tok - should allow one-sided transfer (A -> B) of 0.5 vST (NATURE) across ledger entries`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents, accounts[global.TaddrNdx + 1],                            { from: accounts[0] });
        
    //     const data = await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
    //                qty_A: CONST.GT_CARBON / 2,              tokenTypeId_A: CONST.tokenType.TOK_T2,
    //                qty_B: 0,                                tokenTypeId_B: 0,
    //         ccy_amount_A: 0,                                  ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                  ccyTypeId_B: 0,
    //     });
    //     assert(data.eeuFullEvents.length == 0 && data.eeuPartialEvents.length == 1, 'unexpected event composition');
    //     assert(data.eeuPartialEvents[0].splitFromSecTokenId == data.ledgerA_before.tokens[0].stId, 'unexpected event parent eeu id vs. ledger A before');
    //     assert(data.eeuPartialEvents[0].newSecTokenId == data.ledgerB_after.tokens[0].stId, 'unexpected event soft-minted eeu id vs. ledger B after');
    //     assert(data.ledgerA_after.tokens.length == 1, 'unexpected eeu count ledger A after');
    //     assert(data.ledgerB_after.tokens.length == 1, 'unexpected eeu count ledger B after');
    //     assert(data.ledgerB_after.tokens[0].stId != data.ledgerA_after.tokens[0].stId, 'unexpected eeu id ledger B after vs. ledger A after');
    // });

    // it(`transferring tok - should allow one-sided transfer (B -> A) of 0.5 vST (NATURE) across ledger entries`, async () => {
    //     await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents, accounts[global.TaddrNdx + 0],                            { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        
    //     const data = await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
    //                qty_A: 0,                                tokenTypeId_A: 0,
    //                qty_B: CONST.GT_CARBON / 2,              tokenTypeId_B: CONST.tokenType.TOK_T2,
    //         ccy_amount_A: 0,                                  ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                  ccyTypeId_B: 0,
    //     });
    //     assert(data.eeuFullEvents.length == 0 && data.eeuPartialEvents.length == 1, 'unexpected event composition');
    //     assert(data.eeuPartialEvents[0].splitFromSecTokenId == data.ledgerB_before.tokens[0].stId, 'unexpected event parent eeu id vs. ledger B before');
    //     assert(data.eeuPartialEvents[0].newSecTokenId == data.ledgerA_after.tokens[0].stId, 'unexpected event soft-minted eeu id vs. ledger A after');
    //     assert(data.ledgerA_after.tokens.length == 1, 'unexpected eeu count ledger A after');
    //     assert(data.ledgerB_after.tokens.length == 1, 'unexpected eeu count ledger B after');
    //     assert(data.ledgerA_after.tokens[0].stId != data.ledgerB_after.tokens[0].stId, 'unexpected eeu id ledger A after vs. ledger B after');
    // });

    // // one-sided kg transfer, no consideration, partial ST (split), receiver owns other type
    // it(`transferring tok - should allow one-sided transfer (A -> B) of 0.5 vST (NATURE) across ledger entries, receiver owns other type`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        
    //     const data = await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
    //                qty_A: 500,                              tokenTypeId_A: CONST.tokenType.TOK_T2,
    //                qty_B: 0,                                tokenTypeId_B: 0,
    //         ccy_amount_A: 0,                                  ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                  ccyTypeId_B: 0,
    //     });
    //     transferHelper.assert_nFull_1Partial({
    //                    fullEvents: data.eeuFullEvents,
    //                 partialEvents: data.eeuPartialEvents,
    //   expectFullTransfer_eeuCount: 0,
    //           ledgerSender_before: data.ledgerA_before,   ledgerSender_after: data.ledgerA_after,
    //         ledgerReceiver_before: data.ledgerB_before, ledgerReceiver_after: data.ledgerB_after,
    //     });
    // });

    // // one-sided kg transfer, no consideration, full + partial ST (split), receiver owns other type
    // it(`transferring tok - should allow one-sided transfer (A -> B) of 1.5 vSTs (NATURE) across ledger entries, receiver owns other type`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        
    //     const data = await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
    //                qty_A: 1500000,                          tokenTypeId_A: CONST.tokenType.TOK_T2,
    //                qty_B: 0,                                tokenTypeId_B: 0,
    //         ccy_amount_A: 0,                                  ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                  ccyTypeId_B: 0,
    //     });
    //     transferHelper.assert_nFull_1Partial({
    //                    fullEvents: data.eeuFullEvents,
    //                 partialEvents: data.eeuPartialEvents,
    //   expectFullTransfer_eeuCount: 1,
    //           ledgerSender_before: data.ledgerA_before,   ledgerSender_after: data.ledgerA_after,
    //         ledgerReceiver_before: data.ledgerB_before, ledgerReceiver_after: data.ledgerB_after,
    //     });
    // });

    // // one-sided kg transfer, no consideration, full + partial ST (split), receiver owns same type
    // it(`transferring tok - should allow one-sided transfer (A -> B) of 1.5 vSTs (NATURE) across ledger entries, receiver owns same type`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     const data = await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
    //                qty_A: 1500000,                          tokenTypeId_A: CONST.tokenType.TOK_T2,
    //                qty_B: 0,                                tokenTypeId_B: 0,
    //         ccy_amount_A: 0,                                  ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                  ccyTypeId_B: 0,
    //     });
    //     //console.log('data.eeuFullEvents', data.eeuFullEvents);
    //     //console.log('data.eeuPartialEvents', data.eeuPartialEvents);
    //     transferHelper.assert_nFull_1Partial({
    //                    fullEvents: data.eeuFullEvents,
    //                 partialEvents: data.eeuPartialEvents,
    //   expectFullTransfer_eeuCount: 1,
    //           ledgerSender_before: data.ledgerA_before,   ledgerSender_after: data.ledgerA_after,
    //         ledgerReceiver_before: data.ledgerB_before, ledgerReceiver_after: data.ledgerB_after,
    //     });
    // });

    // // two-sided kg transfer / kg consideration, 1 full + 1 partial ST (split), receiver owns and sends same type
    // it(`transferring tok - should allow two-sided transfer (A <-> B) ~0.5 vSTs (NATURE) across ledger entries, receiver owns same type`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     const data = await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
    //                qty_A: 750,                              tokenTypeId_A: CONST.tokenType.TOK_T2,
    //                qty_B: 250,                              tokenTypeId_B: CONST.tokenType.TOK_T2,
    //         ccy_amount_A: 0,                                  ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                  ccyTypeId_B: 0,
    //     });
    // });

    // // two-sided kg transfer / kg consideration, 1 full + 1 partial ST (split), receiver owns and sends different type
    // it(`transferring tok - should allow two-sided transfer (A <-> B) ~0.5 vSTs (swap ST types) across ledger entries`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     const data = await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
    //                qty_A: 750,                              tokenTypeId_A: CONST.tokenType.TOK_T2,
    //                qty_B: 250,                              tokenTypeId_B: CONST.tokenType.TOK_T1,
    //         ccy_amount_A: 0,                                  ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                  ccyTypeId_B: 0,
    //     });
    // });

    // // merge test
    // // one-sided kg transfer, no consideration, partial ST (split), receiver owns same type, same batch (merge)
    // it(`transferring tok - should allow one-sided transfer (A -> B) of 0.5 + 0.25 vSTs (NATURE) across ledger entries, receiver owns same type, same batch`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.fund(CONST.ccyType.USD,                      0,                       accounts[global.TaddrNdx + 1],                            { from: accounts[0] });
        
    //     // setup: transfer 0.5, from batch 1 
    //     await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
    //                qty_A: 500,                              tokenTypeId_A: CONST.tokenType.TOK_T2,
    //                qty_B: 0,                                tokenTypeId_B: 0,
    //         ccy_amount_A: 0,                                  ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                  ccyTypeId_B: 0,
    //     });

    //     // transfer 0.25, also from batch 1 -- expect merge on existing destination eeu of same batch
    //     const data = await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
    //                qty_A: 250,                              tokenTypeId_A: CONST.tokenType.TOK_T2,
    //                qty_B: 0,                                tokenTypeId_B: 0,
    //         ccy_amount_A: 0,                                  ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                  ccyTypeId_B: 0,
    //     });
    //     assert(data.ledgerB_after.tokens.length == 1, 'ledger B was not merged');
    //     assert(data.eeuPartialEvents.some(p => p.mergedToSecTokenId == data.ledgerB_before.tokens[0].stId), 'unexpected merge event data');
    // });

    // // merge test
    // // one-sided kg transfer, no consideration, partial ST (split), receiver owns same type, same and different batches (merge)
    // it(`transferring tok - should allow one-sided transfer (A -> B) of 0.1 + 0.001, 0.001... vSTs (CORSIA) across ledger entries, receiver owns same type, same batch`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1,    CONST.KT_CARBON, 1,   accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1,    CONST.KT_CARBON, 1,   accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        
    //     // setup: transfer 0.1, split batch 1 to receiver
    //     await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
    //                qty_A: 100,                              tokenTypeId_A: CONST.tokenType.TOK_T1,
    //                qty_B: 0,                                tokenTypeId_B: 0,
    //         ccy_amount_A: 0,                                  ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                  ccyTypeId_B: 0,
    //     });

    //     // repeated transfers -- expect consistent merge of existing destination eeu of the same batch
    //     for (var i = 0; i < 3 ; i++) {
    //         const data = await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],    ledger_B: accounts[global.TaddrNdx + 1],
    //                qty_A: 1,                           tokenTypeId_A: CONST.tokenType.TOK_T1,
    //                qty_B: 0,                           tokenTypeId_B: 0,
    //         ccy_amount_A: 0,                             ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                             ccyTypeId_B: 0,
    //         });
    //         assert(data.ledgerB_after.tokens.length == data.ledgerB_before.tokens.length, 'ledger B was not merged');
    //         assert(data.eeuPartialEvents.some(p => data.ledgerB_before.tokens.some(p2 => p2.stId == p.mergedToSecTokenId)), 'unexpected merge event data');
    //     }
    // });

    // // merge test
    // // two-sided kg / kg transfer, partial ST (split), receiver owns same type, same batch (merge)
    // it(`transferring tok - should allow two-sided transfer (A <-> B) of 0.1 + 0.001, 0.001... vSTs (CORSIA) across ledger entries, receiver owns same type, same batch`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1,    CONST.KT_CARBON, 1,   accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,   accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        
    //     // setup A: transfer 0.1 from B, split batch 2 to A
    //     // setup B: transfer 0.1 from A, split batch 1 to B
    //     await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
    //                qty_A: 100,                              tokenTypeId_A: CONST.tokenType.TOK_T1,
    //                qty_B: 100,                              tokenTypeId_B: CONST.tokenType.TOK_T2,
    //         ccy_amount_A: 0,                                  ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                  ccyTypeId_B: 0,
    //     });

    //     // repeated transfers -- expect consistent merge of existing destination eeu of the same batch
    //     for (var i = 0; i < 3 ; i++) {
    //         const data = await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
    //                qty_A: 1,                                tokenTypeId_A: CONST.tokenType.TOK_T1,
    //                qty_B: 1,                                tokenTypeId_B: CONST.tokenType.TOK_T2,
    //         ccy_amount_A: 0,                                  ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                  ccyTypeId_B: 0,
    //         });
    //         assert(data.ledgerB_after.tokens.length == data.ledgerB_before.tokens.length, 'ledger B was not merged');
    //         assert(data.eeuPartialEvents.some(p => data.ledgerB_before.tokens.some(p2 => p2.stId == p.mergedToSecTokenId)), 'unexpected merge event data for ledger B');

    //         assert(data.ledgerA_after.tokens.length == data.ledgerA_before.tokens.length, 'ledger A was not merged');
    //         assert(data.eeuPartialEvents.some(p => data.ledgerA_before.tokens.some(p2 => p2.stId == p.mergedToSecTokenId)), 'unexpected merge event data for ledger A');
    //     }
    // });

    // it(`transferring tok - should not allow one-sided transfer (A -> B) of an invalid (-1) token unit quantity`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     try {
    //         await transferHelper.transferWrapper(stm, accounts,
    //             accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1],
    //             -1,                          // qty_A
    //             CONST.tokenType.TOK_T2,      // tokenTypeId_A
    //             0,                           // qty_B
    //             0,                           // tokenTypeId_B
    //             0, 0, 0, 0, 
    //             false,                       // applyFees
    //             { from: accounts[0] });
    //     } catch (ex) { 
    //         assert(ex.reason == 'Bad qty_A', `unexpected: ${ex.reason}`);
    //         return;
    //     }
    //     assert.fail('expected contract exception');
    // });

    // it(`transferring tok - should not allow one-sided transfer (B -> A) of an invalid (-1) token unit quantity`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     try {
    //         await transferHelper.transferWrapper(stm, accounts,
    //             accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1],
    //             0,                           // qty_A
    //             0,                           // tokenTypeId_A
    //             -1,                          // qty_B 
    //             CONST.tokenType.TOK_T2,      // tokenTypeId_B
    //             0, 0, 0, 0, 
    //             false,                       // applyFees
    //             { from: accounts[0] });
    //     } catch (ex) { 
    //         assert(ex.reason == 'Bad qty_B', `unexpected: ${ex.reason}`);
    //         return;
    //     }
    //     assert.fail('expected contract exception');
    // });    

    // it(`transferring tok - should not allow one-sided transfer (A -> B) of tokens in excess of the amount held, correct type held`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.GT_CARBON,  1,     accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     try {
    //         await transferHelper.transferWrapper(stm, accounts,
    //             accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1],
    //             CONST.KT_CARBON + 1,         // qty_A
    //             CONST.tokenType.TOK_T2,      // tokenTypeId_A
    //             0,                           // qty_B
    //             0,                           // tokenTypeId_B
    //             0, 0, 0, 0, 
    //             false,                       // applyFees
    //             { from: accounts[0] });
    //     } catch (ex) { 
    //         assert(ex.reason == 'Insufficient tokens', `unexpected: ${ex.reason}`);
    //         return;
    //     }
    //     assert.fail('expected contract exception');
    // });

    // it(`transferring tok - should not allow one-sided transfer (A -> B) of tokens in excess of the amount held, incorrect type held`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.GT_CARBON,  1,     accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     try {
    //         await transferHelper.transferWrapper(stm, accounts,
    //             accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1],
    //             CONST.KT_CARBON,             // qty_A
    //             CONST.tokenType.TOK_T1,      // tokenTypeId_A
    //             0,                           // qty_B
    //             0,                           // tokenTypeId_B
    //             0, 0, 0, 0, 
    //             false,                       // applyFees
    //             { from: accounts[0] });
    //     } catch (ex) { 
    //         assert(ex.reason == 'No tokens', `unexpected: ${ex.reason}`);
    //         return;
    //     }
    //     assert.fail('expected contract exception');
    // });    

    // it(`transferring tok - should not allow one-sided transfer (B -> A) of tokens in excess of the amount held, correct type held`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     try {
    //         await transferHelper.transferWrapper(stm, accounts,
    //             accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1],
    //             0,                           // qty_A
    //             0,                           // tokenTypeId_A
    //             CONST.KT_CARBON + 1,         // qty_B
    //             CONST.tokenType.TOK_T2,      // tokenTypeId_B
    //             0, 0, 0, 0, 
    //             false,                       // applyFees
    //             { from: accounts[0] });
    //     } catch (ex) { 
    //         assert(ex.reason == 'Insufficient tokens', `unexpected: ${ex.reason}`);
    //         return;
    //     }
    //     assert.fail('expected contract exception');
    // });
    
    // it(`transferring tok - should not allow one-sided transfer (B -> A) of tokens in excess of the amount held, incorrect type held`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     try {
    //         await transferHelper.transferWrapper(stm, accounts,
    //             accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1],
    //             0,                           // qty_A
    //             0,                           // tokenTypeId_A
    //             CONST.KT_CARBON,             // qty_B
    //             CONST.tokenType.TOK_T1,      // tokenTypeId_B
    //             0, 0, 0, 0, 
    //             false,                       // applyFees
    //             { from: accounts[0] });
    //     } catch (ex) { 
    //         assert(ex.reason == 'No tokens', `unexpected: ${ex.reason}`);
    //         return;
    //     }
    //     assert.fail('expected contract exception');
    // });
});