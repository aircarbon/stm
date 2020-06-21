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

    // CCY FEE -- 3 USD per Million RECEIVED, MIRRORED
    it(`fees (ccy per million received, mirrored) - apply mirrored USD ccy fee 3 USD/1m tokens received on trades (0.1KT, 1KT, 11KT, 15KT) (global fee on A)`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];
        await stm.fund(CONST.ccyType.USD,                      CONST.millionCcy_cents,  A,                               { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.MT_CARBON,  1,     B, CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set global fee: ccy 3.00 /per Million qty received, MIRRORED
        const ccy_perMillion = 300; // $3
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: true, ccy_perMillion, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyPerMillion', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_perMillion == ccy_perMillion && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).ccy_perMillion == ccy_perMillion, 'unexpected fee per Million received after setting ccy fee structure');

        const transferAmountsTok = [CONST.KT_CARBON * 0.1, CONST.KT_CARBON * 1, CONST.KT_CARBON * 11, CONST.KT_CARBON * 15];
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);
            const expectedFeeCcy = /*Math.floor*/(Number(transferAmountTok.toString()) / 1000000) * ccy_perMillion
                                    * 2; // exchange ccy-fee mirror
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
            assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) ccy balance after transfer');
        }
    });

    it(`fees (ccy per million received, mirrored) - apply mirrored USD ccy fee 3 USD/1m tokens received on trades (0.1KT, 1KT, 11KT, 15KT) (global fee on B)`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.MT_CARBON,  1,     A, CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD,                      CONST.millionCcy_cents,  B,                               { from: accounts[0] });

        // set global fee: ccy 3.00 /per Million qty received, MIRRORED
        const ccy_perMillion = 300; // $3
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: true, ccy_perMillion, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyPerMillion', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_perMillion == ccy_perMillion && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).ccy_perMillion == ccy_perMillion, 'unexpected fee per Million received after setting ccy fee structure');

        const transferAmountsTok = [CONST.KT_CARBON * 0.1, CONST.KT_CARBON * 1, CONST.KT_CARBON * 11, CONST.KT_CARBON * 15];
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);
            const expectedFeeCcy = /*Math.floor*/(Number(transferAmountTok.toString()) / 1000000) * ccy_perMillion
                                    * 2; // exchange ccy-fee mirror
            //console.log('expectedFeeCcy', expectedFeeCcy);
            const data = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                          ledger_B: B,
                       qty_A: transferAmountTok,                       tokTypeId_A: CONST.tokenType.TOK_T2,
                       qty_B: 0,                                       tokTypeId_B: 0,
                ccy_amount_A: 0,                                       ccyTypeId_A: 0,
                ccy_amount_B: transferAmountCcy,                       ccyTypeId_B: CONST.ccyType.USD,
                   applyFees: true,
            });
            //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

            // test contract owner has received expected ccy fee
            const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) ccy balance after transfer');
        }
    });
    
    it(`fees (ccy per million received, mirrored) - apply asymmetrical mirrored ledger override USD ccy fee 6 USD/1m tokens received, capped USD 60, on trades (0.1KT, 1KT, 11KT, 15KT) (ledger fee on A)`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];
        await stm.fund(CONST.ccyType.USD,                      CONST.millionCcy_cents,  A,                               { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.MT_CARBON,  1,     B, CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set global fee: ccy 3.00 /per Million qty received, max ccy 15.00, min ccy 2.00, MIRRORED
        const exchange_feeperMillion = 300, exchange_feeMax = 1500, exchange_feeMin = 200; // $3, $15, $2
        const setExchangeFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: true, ccy_perMillion: exchange_feeperMillion, fee_fixed: 0, fee_percBips: 0, fee_min: exchange_feeMin, fee_max: exchange_feeMax } );

        // set ledger override fee on A: ccy 6.00 /per Million qty received, max ccy 60.00, min ccy 1.00, MIRRORED
        const ledger_feeperMillion = 600, ledger_feeMax = 6000, ledger_feeMin = 100; // $6, $60, $1
        const setLedgerFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, A, { ccy_mirrorFee: true, ccy_perMillion: ledger_feeperMillion, fee_fixed: 0, fee_percBips: 0, fee_min: ledger_feeMin, fee_max: ledger_feeMax } );

        const transferAmountsTok = [CONST.KT_CARBON * 0.1, CONST.KT_CARBON * 1, CONST.KT_CARBON * 11, CONST.KT_CARBON * 15];
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);

            // A - ledger fee (ccy sender)
            const expectedFeeCcy_A = Math.max(Math.min(/*Math.floor*/(Number(transferAmountTok.toString()) / 1000000) * ledger_feeperMillion, ledger_feeMax), ledger_feeMin);
            
            // B - global ccy fee (ccy mirrored - asymmetric)
            const expectedFeeCcy_B = Math.max(Math.min(/*Math.floor*/(Number(transferAmountTok.toString()) / 1000000) * exchange_feeperMillion, exchange_feeMax), exchange_feeMin);

            const expectedFeeCcy = expectedFeeCcy_A + expectedFeeCcy_B;

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
            assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) ccy balance after transfer');
        }
    });

    it(`fees (ccy per million received, mirrored) - apply asymmetrical mirrored ledger override USD ccy fee 6 USD/1m tokens received, capped USD 60, on trades (0.1KT, 1KT, 11KT, 15KT) (ledger fee on B)`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.MT_CARBON,  1,     A, CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD,                      CONST.millionCcy_cents,  B,                               { from: accounts[0] });

        // A - tok sender - ledger override fee on A: ccy 6.00 /per Million qty received, max ccy 60.00, min ccy 2.00, MIRRORED
        const ledger_feeperMillion = 600, ledger_feeMax = 6000, ledger_feeMin = 200; // $6, $60, $2
        const setLedgerFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, A, { ccy_mirrorFee: true, ccy_perMillion: ledger_feeperMillion, fee_fixed: 0, fee_percBips: 0, fee_min: ledger_feeMin, fee_max: ledger_feeMax } );

        // B - ccy sender - global fee: ccy 3.00 /per Million qty received, max ccy 6.00, min ccy 1.00, MIRRORED
        const exchange_feeperMillion = 300, exchange_feeMax = 601, exchange_feeMin = 100; // $3, $6, $1
        const setExchangeFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: true, ccy_perMillion: exchange_feeperMillion, fee_fixed: 0, fee_percBips: 0, fee_min: exchange_feeMin, fee_max: exchange_feeMax } );

        const transferAmountsTok = [CONST.KT_CARBON * 0.1, CONST.KT_CARBON * 1, CONST.KT_CARBON * 11, CONST.KT_CARBON * 15];
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);

            // A - ledger fee (ccy sender)
            const expectedFeeCcy_A = Math.max(Math.min(/*Math.floor*/(Number(transferAmountTok.toString()) / 1000000) * ledger_feeperMillion, ledger_feeMax), ledger_feeMin);
            
            // B - global ccy fee (ccy mirrored - asymmetric)
            const expectedFeeCcy_B = Math.max(Math.min(/*Math.floor*/(Number(transferAmountTok.toString()) / 1000000) * exchange_feeperMillion, exchange_feeMax), exchange_feeMin);

            const expectedFeeCcy = expectedFeeCcy_A + expectedFeeCcy_B;
            
            //console.log('expectedFeeCcy_A', expectedFeeCcy_A)
            //console.log('expectedFeeCcy_B', expectedFeeCcy_B)
            const data = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: transferAmountTok,                      tokTypeId_A: CONST.tokenType.TOK_T2,
                       qty_B: 0,                                      tokTypeId_B: 0,
                ccy_amount_A: 0,                                      ccyTypeId_A: 0,
                ccy_amount_B: transferAmountCcy,                      ccyTypeId_B: CONST.ccyType.USD,
                   applyFees: true,
            });

            // test contract owner has received expected ccy fee
            const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) ccy balance after transfer');
        }
    });

    it(`fees (ccy per million received, mirrored) - insufficent balance on mirror (B) - mirrored USD ccy fee 3 USD/1m tokens received on trades (1KT, 1.5KT, 2.0KT) (global fee on A)`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];
        await stm.fund(CONST.ccyType.USD,                      CONST.millionCcy_cents,  A,                               { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.MT_CARBON,  1,     B, CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set global fee: ccy 3.00 /per Million qty received, MIRRORED
        const ccy_perMillion = 300; // $3
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: true, ccy_perMillion, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyPerMillion', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_perMillion == ccy_perMillion && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).ccy_perMillion == ccy_perMillion, 'unexpected fee per Million received after setting ccy fee structure');

        const transferAmountsTok = [CONST.KT_CARBON * 1, CONST.KT_CARBON * 1.5, CONST.KT_CARBON * 2];
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(1); // 1 cent - insufficient
            const transferAmountTok = new BN(transferAmountsTok[i]);
            try {
                const data = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: 0,                                      tokTypeId_A: 0,
                       qty_B: transferAmountTok,                      tokTypeId_B: CONST.tokenType.TOK_T2,
                ccy_amount_A: transferAmountCcy,                      ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                      ccyTypeId_B: 0,
                   applyFees: true,
                });
            }
            catch (ex) { 
                assert(ex.reason == 'Insufficient currency B', `unexpected: ${ex.reason}`);
                continue;
            }
            assert.fail('expected contract exception');
        }
    });

    it(`fees (ccy per million received, mirrored) - insufficent balance on mirror (A) - mirrored USD ccy fee 3 USD/1m tokens received on trades (1KT, 1.5KT, 2.0KT) (global fee on B)`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.MT_CARBON,  1,     A, CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD,                      CONST.millionCcy_cents,  B,                               { from: accounts[0] });

        // set global fee: ccy 3.00 /per Million qty received, MIRRORED
        const ccy_perMillion = 300; // $3
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: true, ccy_perMillion, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyPerMillion', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_perMillion == ccy_perMillion && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).ccy_perMillion == ccy_perMillion, 'unexpected fee per Million received after setting ccy fee structure');

        const transferAmountsTok = [CONST.KT_CARBON * 1, CONST.KT_CARBON * 1.5, CONST.KT_CARBON * 2];
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(1); // 1 cent - insufficient
            const transferAmountTok = new BN(transferAmountsTok[i]);
            try {
                const data = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: transferAmountTok,                      tokTypeId_A: CONST.tokenType.TOK_T2,
                       qty_B: 0,                                      tokTypeId_B: 0,
                ccy_amount_A: 0,                                      ccyTypeId_A: 0,
                ccy_amount_B: transferAmountCcy,                      ccyTypeId_B: CONST.ccyType.USD,
                   applyFees: true,
                });
            }
            catch (ex) { 
                assert(ex.reason == 'Insufficient currency A', `unexpected: ${ex.reason}`);
                continue;
            }
            assert.fail('expected contract exception');
        }
    });
});