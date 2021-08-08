// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StTransferable.sol => TransferLib.sol
const truffleAssert = require('truffle-assertions');
const st = artifacts.require('StMaster');
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
    it(`transferring tok - should allow one-sided transfer (A -> B) of 1.0 vST (NATURE) across ledger entries`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,     CONST.thousandCcy_cents, accounts[global.TaddrNdx + 1], 'TEST', );
        
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: CONST.GT_CARBON,                    tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                  tokTypeId_B: 0,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
            transferType: CONST.transferType.MINT_FEE,
        });
        assert(data.tokFullEvents.length == 1 && data.tokPartialEvents == 0, 'unexpected event composition');
        assert(data.tokFullEvents[0].stId == data.ledgerA_before.tokens[0].stId, 'unexpected event eeu id vs. ledger A before');
        assert(data.ledgerA_after.tokens.length == 0, 'unexpected eeu count ledger A after');
        assert(data.ledgerB_after.tokens.length == 1, 'unexpected eeu count ledger B after');
        assert(data.ledgerB_after.tokens[0].stId == data.ledgerA_before.tokens[0].stId, 'unexpected eeu id ledger B after vs. ledger A before');
    });

    it(`transferring tok - should allow one-sided transfer (B -> A) of 1.0 vST (CORSIA) across ledger entries`, async () => {
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,     CONST.thousandCcy_cents, accounts[global.TaddrNdx + 0], 'TEST', );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                  tokTypeId_A: 0,
                   qty_B: CONST.GT_CARBON,                    tokTypeId_B: CONST.tokenType.TOK_T1,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
            transferType: CONST.transferType.BURN_FEE,
        });
        assert(data.tokFullEvents.length == 1 && data.tokPartialEvents == 0, 'unexpected event composition');
        assert(data.tokFullEvents[0].stId == data.ledgerB_before.tokens[0].stId, 'unexpected event eeu id vs. ledger B before');
        assert(data.ledgerB_after.tokens.length == 0, 'unexpected eeu count ledger B after');
        assert(data.ledgerA_after.tokens.length == 1, 'unexpected eeu count ledger A after');
        assert(data.ledgerA_after.tokens[0].stId == data.ledgerB_before.tokens[0].stId, 'unexpected eeu id ledger A after vs. ledger B before');
    });

    // one-sided kg transfer, no consideration, 0.5 ST (split)
    it(`transferring tok - should allow one-sided transfer (A -> B) of 0.5 vST (NATURE) across ledger entries`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,     CONST.thousandCcy_cents, accounts[global.TaddrNdx + 1], 'TEST', );
        
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: CONST.GT_CARBON / 2,                tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                  tokTypeId_B: 0,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
            transferType: CONST.transferType.WITHDRAW_FEE,
        });
        assert(data.tokFullEvents.length == 0 && data.tokPartialEvents.length == 1, 'unexpected event composition');
        assert(data.tokPartialEvents[0].splitFromSecTokenId == data.ledgerA_before.tokens[0].stId, 'unexpected event parent eeu id vs. ledger A before');
        assert(data.tokPartialEvents[0].newSecTokenId == data.ledgerB_after.tokens[0].stId, 'unexpected event soft-minted eeu id vs. ledger B after');
        assert(data.ledgerA_after.tokens.length == 1, 'unexpected eeu count ledger A after');
        assert(data.ledgerB_after.tokens.length == 1, 'unexpected eeu count ledger B after');
        assert(data.ledgerB_after.tokens[0].stId != data.ledgerA_after.tokens[0].stId, 'unexpected eeu id ledger B after vs. ledger A after');
    });

    it(`transferring tok - should allow one-sided transfer (B -> A) of 0.5 vST (NATURE) across ledger entries`, async () => {
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,     CONST.thousandCcy_cents, accounts[global.TaddrNdx + 0],   'TEST', );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                  tokTypeId_A: 0,
                   qty_B: CONST.GT_CARBON / 2,                tokTypeId_B: CONST.tokenType.TOK_T2,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
            transferType: CONST.transferType.DEPOSIT_FEE,
        });
        assert(data.tokFullEvents.length == 0 && data.tokPartialEvents.length == 1, 'unexpected event composition');
        assert(data.tokPartialEvents[0].splitFromSecTokenId == data.ledgerB_before.tokens[0].stId, 'unexpected event parent eeu id vs. ledger B before');
        assert(data.tokPartialEvents[0].newSecTokenId == data.ledgerA_after.tokens[0].stId, 'unexpected event soft-minted eeu id vs. ledger A after');
        assert(data.ledgerA_after.tokens.length == 1, 'unexpected eeu count ledger A after');
        assert(data.ledgerB_after.tokens.length == 1, 'unexpected eeu count ledger B after');
        assert(data.ledgerA_after.tokens[0].stId != data.ledgerB_after.tokens[0].stId, 'unexpected eeu id ledger A after vs. ledger B after');
    });

    // one-sided kg transfer, no consideration, 1 full + 1 partial ST (split)
    // DEPRECATED - no multi-vST minting
    // it(`transferring tok - should allow one-sided transfer (A -> B) of 1.5 vSTs (NATURE) across ledger entries`, async () => {
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 2,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     await stm.fund        (CONST.ccyType.USD, CONST.thousandCcy_cents, accounts[global.TaddrNdx + 1],         { from: accounts[0] });
    //     const data = await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],     ledger_B: accounts[global.TaddrNdx + 1],
    //                 qty_A: 750,                                tokTypeId_A: CONST.tokenType.TOK_T2,
    //                 qty_B: 0,                                  tokTypeId_B: 0,
    //         ccy_amount_A: 0,                                ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                ccyTypeId_B: 0,
    //     });
    //     transferHelper.assert_nFull_1Partial({
    //                    fullEvents: data.tokFullEvents,
    //                 partialEvents: data.tokPartialEvents,
    //   expectFullTransfer_eeuCount: 1,
    //           ledgerSender_before: data.ledgerA_before,   ledgerSender_after: data.ledgerA_after,
    //         ledgerReceiver_before: data.ledgerB_before, ledgerReceiver_after: data.ledgerB_after,
    //     });
    // });
    // it(`transferring tok - should allow one-sided transfer (B -> A) of 1.5 vSTs (CORSIA) across ledger entries`, async () => {
    //     await stm.fund        (CONST.ccyType.USD,    CONST.thousandCcy_cents, accounts[global.TaddrNdx + 0],         { from: accounts[0] });
    //     await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 2,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
    //     const data = await transferHelper.transferLedger({ stm, accounts, 
    //             ledger_A: accounts[global.TaddrNdx + 0],     ledger_B: accounts[global.TaddrNdx + 1],
    //                 qty_A: 0,                                  tokTypeId_A: 0,
    //                 qty_B: 750,                                tokTypeId_B: CONST.tokenType.TOK_T1,
    //         ccy_amount_A: 0,                                ccyTypeId_A: 0,
    //         ccy_amount_B: 0,                                ccyTypeId_B: 0,
    //     });
    //     transferHelper.assert_nFull_1Partial({
    //                    fullEvents: data.tokFullEvents,
    //                 partialEvents: data.tokPartialEvents,
    //   expectFullTransfer_eeuCount: 1,
    //           ledgerSender_before: data.ledgerB_before,   ledgerSender_after: data.ledgerB_after,
    //         ledgerReceiver_before: data.ledgerA_before, ledgerReceiver_after: data.ledgerA_after,
    //     });
    // });

    // one-sided kg transfer, no consideration, partial ST (split), receiver owns other type
    it(`transferring tok - should allow one-sided transfer (A -> B) of 0.5 vST (NATURE) across ledger entries, receiver owns other type`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 500,                                tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                  tokTypeId_B: 0,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
            transferType: CONST.transferType.DATA_FEE,
        });
        transferHelper.assert_nFull_1Partial({
                       fullEvents: data.tokFullEvents,
                    partialEvents: data.tokPartialEvents,
      expectFullTransfer_eeuCount: 0,
              ledgerSender_before: data.ledgerA_before,   ledgerSender_after: data.ledgerA_after,
            ledgerReceiver_before: data.ledgerB_before, ledgerReceiver_after: data.ledgerB_after,
        });
    });

    // one-sided kg transfer, no consideration, full + partial ST (split), receiver owns other type
    it(`transferring tok - should allow one-sided transfer (A -> B) of 1.5 vSTs (NATURE) across ledger entries, receiver owns other type`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 1500000,                            tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                  tokTypeId_B: 0,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
            transferType: CONST.transferType.OTHER_FEE1,
        });
        transferHelper.assert_nFull_1Partial({
                       fullEvents: data.tokFullEvents,
                    partialEvents: data.tokPartialEvents,
      expectFullTransfer_eeuCount: 1,
              ledgerSender_before: data.ledgerA_before,   ledgerSender_after: data.ledgerA_after,
            ledgerReceiver_before: data.ledgerB_before, ledgerReceiver_after: data.ledgerB_after,
        });
    });

    // one-sided kg transfer, no consideration, full + partial ST (split), receiver owns same type
    it(`transferring tok - should allow one-sided transfer (A -> B) of 1.5 vSTs (NATURE) across ledger entries, receiver owns same type`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 1500000,                            tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                  tokTypeId_B: 0,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
            transferType: CONST.transferType.OTHER_FEE2,
        });
        //console.log('data.tokFullEvents', data.tokFullEvents);
        //console.log('data.tokPartialEvents', data.tokPartialEvents);
        transferHelper.assert_nFull_1Partial({
                       fullEvents: data.tokFullEvents,
                    partialEvents: data.tokPartialEvents,
      expectFullTransfer_eeuCount: 1,
              ledgerSender_before: data.ledgerA_before,   ledgerSender_after: data.ledgerA_after,
            ledgerReceiver_before: data.ledgerB_before, ledgerReceiver_after: data.ledgerB_after,
        });
    });

    // two-sided kg transfer / kg consideration, 1 full + 1 partial ST (split), receiver owns and sends same type
    it(`transferring tok - should allow two-sided transfer (A <-> B) ~0.5 vSTs (NATURE) across ledger entries, receiver owns same type`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 750,                                tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 250,                                tokTypeId_B: CONST.tokenType.TOK_T2,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
            transferType: CONST.transferType.UNDEFINED,
        });
    });

    // two-sided kg transfer / kg consideration, 1 full + 1 partial ST (split), receiver owns and sends different type
    it(`transferring tok - should allow two-sided transfer (A <-> B) ~0.5 vSTs (swap ST types) across ledger entries`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 750,                                tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 250,                                tokTypeId_B: CONST.tokenType.TOK_T1,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
            transferType: CONST.transferType.UNDEFINED,
        });
    });

    // merge test
    // one-sided kg transfer, no consideration, partial ST (split), receiver owns same type, same batch (merge)
    it(`transferring tok - should allow one-sided transfer (A -> B) of 0.5 + 0.25 vSTs (NATURE) across ledger entries, receiver owns same type, same batch`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,        0,                             accounts[global.TaddrNdx + 1], 'TEST', );
        
        // setup: transfer 0.5, from batch 1 
        await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 500,                                tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                  tokTypeId_B: 0,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
            transferType: CONST.transferType.OTHER_FEE4,
        });

        // transfer 0.25, also from batch 1 -- expect merge on existing destination eeu of same batch
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 250,                                tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                  tokTypeId_B: 0,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
            transferType: CONST.transferType.OTHER_FEE5,
        });
        assert(data.ledgerB_after.tokens.length == 1, 'ledger B was not merged');
        assert(data.tokPartialEvents.some(p => p.mergedToSecTokenId == data.ledgerB_before.tokens[0].stId), 'unexpected merge event data');
    });

    // merge test
    // one-sided kg transfer, no consideration, partial ST (split), receiver owns same type, same and different batches (merge)
    it(`transferring tok - should allow one-sided transfer (A -> B) of 0.1 + 0.001, 0.001... vSTs (CORSIA) across ledger entries, receiver owns same type, same batch`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1,    CONST.KT_CARBON, 1,   accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1,    CONST.KT_CARBON, 1,   accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        
        // setup: transfer 0.1, split batch 1 to receiver
        await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 100,                                tokTypeId_A: CONST.tokenType.TOK_T1,
                   qty_B: 0,                                  tokTypeId_B: 0,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
            transferType: CONST.transferType.ADJUSTMENT,
        });

        // repeated transfers -- expect consistent merge of existing destination eeu of the same batch
        for (var i = 0; i < 3 ; i++) {
            const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],    ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 1,                             tokTypeId_A: CONST.tokenType.TOK_T1,
                   qty_B: 0,                             tokTypeId_B: 0,
            ccy_amount_A: 0,                             ccyTypeId_A: 0,
            ccy_amount_B: 0,                             ccyTypeId_B: 0,
            transferType: CONST.transferType.ADJUSTMENT,
            });
            assert(data.ledgerB_after.tokens.length == data.ledgerB_before.tokens.length, 'ledger B was not merged');
            assert(data.tokPartialEvents.some(p => data.ledgerB_before.tokens.some(p2 => p2.stId == p.mergedToSecTokenId)), 'unexpected merge event data');
        }
    });

    // merge test
    // two-sided kg / kg transfer, partial ST (split), receiver owns same type, same batch (merge)
    it(`transferring tok - should allow two-sided transfer (A <-> B) of 0.1 + 0.001, 0.001... vSTs (CORSIA) across ledger entries, receiver owns same type, same batch`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1,    CONST.KT_CARBON, 1,   accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,   accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        
        // setup A: transfer 0.1 from B, split batch 2 to A
        // setup B: transfer 0.1 from A, split batch 1 to B
        await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 100,                                tokTypeId_A: CONST.tokenType.TOK_T1,
                   qty_B: 100,                                tokTypeId_B: CONST.tokenType.TOK_T2,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
            transferType: CONST.transferType.UNDEFINED,
        });

        // repeated transfers -- expect consistent merge of existing destination eeu of the same batch
        for (var i = 0; i < 3 ; i++) {
            const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 1,                                  tokTypeId_A: CONST.tokenType.TOK_T1,
                   qty_B: 1,                                  tokTypeId_B: CONST.tokenType.TOK_T2,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
            transferType: CONST.transferType.UNDEFINED,
        });
            assert(data.ledgerB_after.tokens.length == data.ledgerB_before.tokens.length, 'ledger B was not merged');
            assert(data.tokPartialEvents.some(p => data.ledgerB_before.tokens.some(p2 => p2.stId == p.mergedToSecTokenId)), 'unexpected merge event data for ledger B');

            assert(data.ledgerA_after.tokens.length == data.ledgerA_before.tokens.length, 'ledger A was not merged');
            assert(data.tokPartialEvents.some(p => data.ledgerA_before.tokens.some(p2 => p2.stId == p.mergedToSecTokenId)), 'unexpected merge event data for ledger A');
        }
    });

    it(`transferring tok - should not allow one-sided transfer (A -> B) of an invalid (-1) token unit quantity`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts,
                accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1],
                -1,                          // qty_A
                CONST.tokenType.TOK_T2,      // tokTypeId_A
                0,                           // qty_B
                0,                           // tokTypeId_B
                0, 0, 0, 0, 
                false, CONST.transferType.ADJUSTMENT, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'value out-of-bounds', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring tok - should not allow one-sided transfer (B -> A) of an invalid (-1) token unit quantity`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts,
                accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1],
                0,                           // qty_A
                0,                           // tokTypeId_A
                -1,                          // qty_B 
                CONST.tokenType.TOK_T2,      // tokTypeId_B
                0, 0, 0, 0, 
                false, CONST.transferType.ADJUSTMENT, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'value out-of-bounds', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });    

    it(`transferring tok - should not allow one-sided transfer (A -> B) of tokens in excess of the amount held, correct type held`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.GT_CARBON,  1,     accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts,
                accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1],
                CONST.KT_CARBON + 1,         // qty_A
                CONST.tokenType.TOK_T2,      // tokTypeId_A
                0,                           // qty_B
                0,                           // tokTypeId_B
                0, 0, 0, 0, 
                false, CONST.transferType.ADJUSTMENT, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Insufficient tokens', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring tok - should not allow one-sided transfer (A -> B) of tokens in excess of the amount held, incorrect type held`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.GT_CARBON,  1,     accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts,
                accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1],
                CONST.KT_CARBON,             // qty_A
                CONST.tokenType.TOK_T1,      // tokTypeId_A
                0,                           // qty_B
                0,                           // tokTypeId_B
                0, 0, 0, 0, 
                false, CONST.transferType.ADJUSTMENT, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'No tokens', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });    

    it(`transferring tok - should not allow one-sided transfer (B -> A) of tokens in excess of the amount held, correct type held`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts,
                accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1],
                0,                           // qty_A
                0,                           // tokTypeId_A
                CONST.KT_CARBON + 1,         // qty_B
                CONST.tokenType.TOK_T2,      // tokTypeId_B
                0, 0, 0, 0, 
                false, CONST.transferType.ADJUSTMENT, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Insufficient tokens', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
    
    it(`transferring tok - should not allow one-sided transfer (B -> A) of tokens in excess of the amount held, incorrect type held`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts,
                accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1],
                0,                           // qty_A
                0,                           // tokTypeId_A
                CONST.KT_CARBON,             // qty_B
                CONST.tokenType.TOK_T1,      // tokTypeId_B
                0, 0, 0, 0, 
                false, CONST.transferType.ADJUSTMENT, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'No tokens', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
});