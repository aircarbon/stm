// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StTransferable.sol => TransferLib.sol
const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');
const transferHelper = require('../test/transferHelper.js');
const BN = require('bn.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
        
        await setupHelper.whitelistAndSeal({ stm, accounts });
        await setupHelper.setDefaults({ stm, accounts });
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // ORIG CCY FEE -- (SINGLE BATCH, SHARE OF 3 USD per Million RECEIVED, SYMMETRIC MIRRORED)
    it(`fees (orig ccy fee - from per million received, symmetric mirrored, single batch) - apply mirrored USD ccy fee 3 USD/1m tokens received on trade (global fee on A)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];

        const origCcyFee_bips = 100;
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,                      CONST.millionCcy_cents,  A, 'TEST');
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.MT_CARBON,  1,     B, CONST.nullFees, origCcyFee_bips, [], [], { from: accounts[0] });

        // set global fee: ccy 3.00 /per Million qty received, MIRRORED
        const ccy_perMillion = 300; // $3
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: true, ccy_perMillion, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        // truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyPerMillion', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_perMillion == ccy_perMillion && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).ccy_perMillion == ccy_perMillion, 'unexpected fee per Million received after setting ccy fee structure');

        const transferAmountsTok = [CONST.KT_CARBON * 1];
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);
            const expectedFeeCcy = Math.floor(Number(transferAmountTok.toString()) / 1000000) * ccy_perMillion
                                    * 2; // ex ccy-fee mirror - symmetric
            
            //console.log('expectedFeeCcy', expectedFeeCcy);
            const data = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: 0,                                      tokTypeId_A: 0,
                       qty_B: transferAmountTok,                      tokTypeId_B: CONST.tokenType.TOK_T2,
                ccy_amount_A: transferAmountCcy,                      ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                      ccyTypeId_B: 0,
                   applyFees: true,
            });
            //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

            // test contract owner has received expected ccy fee
            const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy) - Number(data.orig_ccyFee_toA.toString()) - Number(data.orig_ccyFee_toB.toString()),
                'unexpected contract owner (fee receiver) ccy balance after transfer');
        }
    });

    it(`fees (orig ccy fee - from per million received, symmetric mirrored, single batch) - apply mirrored USD ccy fee 3 USD/1m tokens received on trade (global fee on B)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];

        const origCcyFee_bips = 100;
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.MT_CARBON,  1,     A, CONST.nullFees, origCcyFee_bips, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,                      CONST.millionCcy_cents,  B, 'TEST');

        // set global fee: ccy 3.00 /per Million qty received, MIRRORED
        const ccy_perMillion = 300; // $3
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: true, ccy_perMillion, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        // truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyPerMillion', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_perMillion == ccy_perMillion && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).ccy_perMillion == ccy_perMillion, 'unexpected fee per Million received after setting ccy fee structure');

        const transferAmountsTok = [CONST.KT_CARBON * 1];
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);
            const expectedFeeCcy = Math.floor(Number(transferAmountTok.toString()) / 1000000) * ccy_perMillion
                                    * 2; // ex ccy-fee mirror - symmetric
            
            //console.log('expectedFeeCcy', expectedFeeCcy);
            const data = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: transferAmountTok,                      tokTypeId_A: CONST.tokenType.TOK_T2,
                       qty_B: 0,                                      tokTypeId_B: 0,
                ccy_amount_A: 0,                                      ccyTypeId_A: 0,
                ccy_amount_B: transferAmountCcy,                      ccyTypeId_B: CONST.ccyType.USD,
                   applyFees: true,
            });
            //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

            // test contract owner has received expected ccy fee
            const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy) - Number(data.orig_ccyFee_toA.toString()) - Number(data.orig_ccyFee_toB.toString()),
                'unexpected contract owner (fee receiver) ccy balance after transfer');
        }
    });

    // ORIG CCY FEE -- (MULTIPLE BALANCED BATCHES, SHARE OF 3 USD per Million RECEIVED, SYMMETRIC MIRRORED)
    it(`fees (orig ccy fee - from per million received, symmetric mirrored, on multi/balanced batches) - apply mirrored USD ccy fee 3 USD/1m tokens received on trade (global fee on A)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];

        const origCcyFee_bips_B1 = 3000; // 30%
        const origCcyFee_bips_B2 = 9000; // 90%
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,                      CONST.millionCcy_cents,  A, 'TEST');
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    500000, 1, B, CONST.nullFees, origCcyFee_bips_B1, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    500000, 1, B, CONST.nullFees, origCcyFee_bips_B2, [], [], { from: accounts[0] });

        // set global fee: ccy 3.00 /per Million qty received, MIRRORED
        const ccy_perMillion = 300, fee_min = 300; // $3
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: true, ccy_perMillion, fee_fixed: 0, fee_percBips: 0, fee_min, fee_max: 0 } );
        // truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyPerMillion', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_perMillion == ccy_perMillion && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).ccy_perMillion == ccy_perMillion, 'unexpected fee per Million received after setting ccy fee structure');

        const transferAmountsTok = [CONST.KT_CARBON * 1];
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);
            const expectedFeeCcy = Math.max(Math.floor(Number(transferAmountTok.toString()) / 1000000) * ccy_perMillion, fee_min)
                                    * 2; // ex ccy-fee mirror - symmetric
            
            //console.log('expectedFeeCcy', expectedFeeCcy);
            const data = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: 0,                                      tokTypeId_A: 0,
                       qty_B: transferAmountTok,                      tokTypeId_B: CONST.tokenType.TOK_T2,
                ccy_amount_A: transferAmountCcy,                      ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                      ccyTypeId_B: 0,
                   applyFees: true,
            });
            //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

            // test contract owner has received expected ccy fee
            const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy) - Number(data.orig_ccyFee_toA.toString()) - Number(data.orig_ccyFee_toB.toString()),
                'unexpected contract owner (fee receiver) ccy balance after transfer');
        }
    });

    it(`fees (orig ccy fee - from per million received, symmetric mirrored, on multi/balanced batches) - apply mirrored USD ccy fee 3 USD/1m tokens received on trade (global fee on B)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];

        const origCcyFee_bips_B1 = 3000; // 30%
        const origCcyFee_bips_B2 = 9000; // 90%
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    500000, 1, A, CONST.nullFees, origCcyFee_bips_B1, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    500000, 1, A, CONST.nullFees, origCcyFee_bips_B2, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND,  CONST.ccyType.USD, CONST.millionCcy_cents,  B, 'TEST');

        // set global fee: ccy 3.00 /per Million qty received, MIRRORED
        const ccy_perMillion = 300, fee_min = 300; // $3
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: true, ccy_perMillion, fee_fixed: 0, fee_percBips: 0, fee_min, fee_max: 0 } );
        // truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyPerMillion', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_perMillion == ccy_perMillion && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).ccy_perMillion == ccy_perMillion, 'unexpected fee per Million received after setting ccy fee structure');

        const transferAmountsTok = [CONST.KT_CARBON * 1];
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);
            const expectedFeeCcy = Math.max(Math.floor(Number(transferAmountTok.toString()) / 1000000) * ccy_perMillion, fee_min)
                                    * 2; // ex ccy-fee mirror - symmetric
            
            //console.log('expectedFeeCcy', expectedFeeCcy);
            const data = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: transferAmountTok,                      tokTypeId_A: CONST.tokenType.TOK_T2,
                       qty_B: 0,                                      tokTypeId_B: 0,
                ccy_amount_A: 0,                                      ccyTypeId_A: 0,
                ccy_amount_B: transferAmountCcy,                      ccyTypeId_B: CONST.ccyType.USD,
                   applyFees: true,
            });
            //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

            // test contract owner has received expected ccy fee
            const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy) - Number(data.orig_ccyFee_toA.toString()) - Number(data.orig_ccyFee_toB.toString()),
                'unexpected contract owner (fee receiver) ccy balance after transfer');
        }
    });

    // ORIG CCY FEE -- (MULTIPLE UNBALANCED BATCHES, SHARE OF 3 USD per Million RECEIVED, SYMMETRIC MIRRORED)
    it(`fees (orig ccy fee - from per million received, symmetric mirrored, on multi/unbalanced batches) - apply mirrored USD ccy fee 3 USD/1m tokens received on trade (global fee on A)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];

        const origCcyFee_bips_B1 = 3000; // 30%
        const origCcyFee_bips_B2 = 9000; // 90%
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,                      CONST.millionCcy_cents,  A, 'TEST');
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    500000, 1, B, CONST.nullFees, origCcyFee_bips_B1, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    500000, 1, B, CONST.nullFees, origCcyFee_bips_B2, [], [], { from: accounts[0] });

        // set global fee: ccy 3.00 /per Million qty received, MIRRORED
        const ccy_perMillion = 300, fee_min = 300; // $3
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: true, ccy_perMillion, fee_fixed: 0, fee_percBips: 0, fee_min, fee_max: 0 } );
        // truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyPerMillion', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_perMillion == ccy_perMillion && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).ccy_perMillion == ccy_perMillion, 'unexpected fee per Million received after setting ccy fee structure');

        const transferAmountsTok = [510000]; // *** unbalanced - B1 supplies most
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);
            const expectedFeeCcy = Math.max(Math.floor(Number(transferAmountTok.toString()) / 1000000) * ccy_perMillion, fee_min)
                                    * 2; // ex ccy-fee mirror - symmetric
            
            //console.log('expectedFeeCcy', expectedFeeCcy);
            const data = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: 0,                                      tokTypeId_A: 0,
                       qty_B: transferAmountTok,                      tokTypeId_B: CONST.tokenType.TOK_T2,
                ccy_amount_A: transferAmountCcy,                      ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                      ccyTypeId_B: 0,
                   applyFees: true,
            });
            //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

            // test contract owner has received expected ccy fee
            const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy) - Number(data.orig_ccyFee_toA.toString()) - Number(data.orig_ccyFee_toB.toString()),
                'unexpected contract owner (fee receiver) ccy balance after transfer');
        }
    });

    it(`fees (orig ccy fee - from per million received, symmetric mirrored, on multi/unbalanced batches) - apply mirrored USD ccy fee 3 USD/1m tokens received on trade (global fee on B)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];

        const origCcyFee_bips_B1 = 3000; // 30%
        const origCcyFee_bips_B2 = 9000; // 90%
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    500000, 1, A, CONST.nullFees, origCcyFee_bips_B1, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    500000, 1, A, CONST.nullFees, origCcyFee_bips_B2, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,                      CONST.millionCcy_cents,  B, 'TEST');

        // set global fee: ccy 3.00 /per Million qty received, MIRRORED
        const ccy_perMillion = 300, fee_min = 300; // $3
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: true, ccy_perMillion, fee_fixed: 0, fee_percBips: 0, fee_min, fee_max: 0 } );
        // truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyPerMillion', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_perMillion == ccy_perMillion && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).ccy_perMillion == ccy_perMillion, 'unexpected fee per Million received after setting ccy fee structure');

        const transferAmountsTok = [510000]; // *** unbalanced - B1 supplies most
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);
            const expectedFeeCcy = Math.max(Math.floor(Number(transferAmountTok.toString()) / 1000000) * ccy_perMillion, fee_min)
                                    * 2; // ex ccy-fee mirror - symmetric
            
            //console.log('expectedFeeCcy', expectedFeeCcy);
            const data = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: transferAmountTok,                      tokTypeId_A: CONST.tokenType.TOK_T2,
                       qty_B: 0,                                      tokTypeId_B: 0,
                ccy_amount_A: 0,                                      ccyTypeId_A: 0,
                ccy_amount_B: transferAmountCcy,                      ccyTypeId_B: CONST.ccyType.USD,
                   applyFees: true,
            });
            //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

            // test contract owner has received expected ccy fee
            const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy) - Number(data.orig_ccyFee_toA.toString()) - Number(data.orig_ccyFee_toB.toString()),
                'unexpected contract owner (fee receiver) ccy balance after transfer');
        }
    });

    // ORIG CCY FEE -- (MULTIPLE UNBALANCED BATCHES, SHARE OF 3 USD per Million RECEIVED, ASYMMETRIC MIRRORED)
    it(`fees (orig ccy fee - per million received, asymmetric mirrored, on multi/unbalanced batches) - apply asymmetrical mirrored ledger override USD ccy fee 6 USD/1m tokens received, capped USD 60, on trade (ledger fee on A)`, async () => {
        const A = accounts[global.TaddrNdx + 0]
        const B = accounts[global.TaddrNdx + 1]

        const origCcyFee_bips_B1 = 3000; // 30%
        const origCcyFee_bips_B2 = 9000; // 90%
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,                      CONST.millionCcy_cents,  A, 'TEST');
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    500000, 1, B, CONST.nullFees, origCcyFee_bips_B1, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    500000, 1, B, CONST.nullFees, origCcyFee_bips_B2, [], [], { from: accounts[0] });

        // set global fee: ccy 3.00 /per Million qty received, max ccy 15.00, min ccy 3.00, MIRRORED
        const exchange_feeperMillion = 300, exchange_feeMax = 1500, exchange_feeMin = 300; // $3, $15, $3
        const setExchangeFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: true, ccy_perMillion: exchange_feeperMillion, fee_fixed: 0, fee_percBips: 0, fee_min: exchange_feeMin, fee_max: exchange_feeMax } );

        // set ledger override fee on A: ccy 6.00 /per Million qty received, max ccy 60.00, min ccy 6.00, MIRRORED
        const ledger_feeperMillion = 600, ledger_feeMax = 6000, ledger_feeMin = 600; // $6, $60, $6
        const setLedgerFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, A, { ccy_mirrorFee: true, ccy_perMillion: ledger_feeperMillion, fee_fixed: 0, fee_percBips: 0, fee_min: ledger_feeMin, fee_max: ledger_feeMax } );

        const transferAmountsTok = [750000]; // *** unbalanced - B1 supplies most
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);

            // A - ledger fee (ccy sender)
            const expectedFeeCcy_A = Math.max(Math.min(Math.floor(Number(transferAmountTok.toString()) / 1000000) * ledger_feeperMillion, ledger_feeMax), ledger_feeMin);
            
            // B - global ccy fee (ccy mirrored - asymmetric)
            const expectedFeeCcy_B = Math.max(Math.min(Math.floor(Number(transferAmountTok.toString()) / 1000000) * exchange_feeperMillion, exchange_feeMax), exchange_feeMin);

            const expectedFeeCcy = expectedFeeCcy_A + expectedFeeCcy_B;
            
            // console.log('expectedFeeCcy_A', expectedFeeCcy_A);
            // console.log('expectedFeeCcy_B', expectedFeeCcy_B);
            // console.log('expectedFeeCcy', expectedFeeCcy);
            const data = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: 0,                                      tokTypeId_A: 0,
                       qty_B: transferAmountTok,                      tokTypeId_B: CONST.tokenType.TOK_T2,
                ccy_amount_A: transferAmountCcy,                      ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                      ccyTypeId_B: 0,
                   applyFees: true,
            });
            //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

            // test contract owner has received expected ccy fee
            const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy) - Number(data.orig_ccyFee_toA.toString()) - Number(data.orig_ccyFee_toB.toString()),
                'unexpected contract owner (fee receiver) ccy balance after transfer');
        }
    });

    it(`fees (orig ccy fee - per million received, asymmetric mirrored, on multi/unbalanced batches) - apply asymmetrical mirrored ledger override USD ccy fee 6 USD/1m tokens received, capped USD 60, on trade (ledger fee on B)`, async () => {
        const A = accounts[global.TaddrNdx + 0]
        const B = accounts[global.TaddrNdx + 1]

        const origCcyFee_bips_B1 = 3000; // 30%
        const origCcyFee_bips_B2 = 9000; // 90%
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    500000, 1, A, CONST.nullFees, origCcyFee_bips_B1, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    500000, 1, A, CONST.nullFees, origCcyFee_bips_B2, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,                      CONST.millionCcy_cents,  B, 'TEST');

        // set global fee: ccy 3.00 /per Million qty received, max ccy 15.00, min ccy 3.00, MIRRORED
        const exchange_feeperMillion = 300, exchange_feeMax = 1500, exchange_feeMin = 300; // $3, $15, $3
        const setExchangeFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: true, ccy_perMillion: exchange_feeperMillion, fee_fixed: 0, fee_percBips: 0, fee_min: exchange_feeMin, fee_max: exchange_feeMax } );

        // set ledger override fee on A: ccy 6.00 /per Million qty received, max ccy 60.00, min ccy 6.00, MIRRORED
        const ledger_feeperMillion = 600, ledger_feeMax = 6000, ledger_feeMin = 600; // $6, $60, $6
        const setLedgerFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, A, { ccy_mirrorFee: true, ccy_perMillion: ledger_feeperMillion, fee_fixed: 0, fee_percBips: 0, fee_min: ledger_feeMin, fee_max: ledger_feeMax } );

        const transferAmountsTok = [750000]; // *** unbalanced - B1 supplies most
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);

            // A - ledger fee (tok sender - mirrored ccy fee payer - asymmetric)
            const expectedFeeCcy_A = Math.max(Math.min(Math.floor(Number(transferAmountTok.toString()) / 1000000) * ledger_feeperMillion, ledger_feeMax), ledger_feeMin);
            
            // B - global ccy fee (ccy sender - main ccy fee payer)
            const expectedFeeCcy_B = Math.max(Math.min(Math.floor(Number(transferAmountTok.toString()) / 1000000) * exchange_feeperMillion, exchange_feeMax), exchange_feeMin);

            const expectedFeeCcy = expectedFeeCcy_A + expectedFeeCcy_B;
            
            // console.log('expectedFeeCcy_A', expectedFeeCcy_A);
            // console.log('expectedFeeCcy_B', expectedFeeCcy_B);
            // console.log('expectedFeeCcy', expectedFeeCcy);
            const data = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: transferAmountTok,                      tokTypeId_A: CONST.tokenType.TOK_T2,
                       qty_B: 0,                                      tokTypeId_B: 0,
                ccy_amount_A: 0,                                      ccyTypeId_A: 0,
                ccy_amount_B: transferAmountCcy,                      ccyTypeId_B: CONST.ccyType.USD,
                   applyFees: true,
            });
            //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

            // test contract owner has received expected ccy fee
            const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy) - Number(data.orig_ccyFee_toA.toString()) - Number(data.orig_ccyFee_toB.toString()),
                'unexpected contract owner (fee receiver) ccy balance after transfer');
        }
    });
});