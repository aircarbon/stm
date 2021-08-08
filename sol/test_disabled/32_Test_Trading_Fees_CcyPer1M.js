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

    // CCY -- 3 USD per Million RECEIVED
    it(`fees (ccy per million received) - apply USD ccy fee 3 USD/1m tokens received on trades (0.1KT, 1KT, 1.5KT, 11KT) (global fee on A)`, async () => {
        const A = accounts[global.TaddrNdx + 0]
        const B = accounts[global.TaddrNdx + 1]
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,                      CONST.millionCcy_cents,  A, 'TEST');
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.MT_CARBON,  1,     B, CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set global fee: ccy 3.00 /per Million qty received
        const ccy_perMillion = 300; // $3
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        // truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyPerMillion', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_perMillion == ccy_perMillion && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).ccy_perMillion == ccy_perMillion, 'unexpected fee per Million received after setting ccy fee structure');

        const transferAmountsTok = [CONST.KT_CARBON * 0.1, CONST.KT_CARBON * 15, CONST.KT_CARBON * 1, CONST.KT_CARBON * 11];
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);
            const expectedFeeCcy = //Math.floor
                                    (Number(transferAmountTok.toString()) / 1000000) * ccy_perMillion;
            console.log('expectedFeeCcy', expectedFeeCcy);
            const data = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: 0,                                      tokTypeId_A: 0,
                       qty_B: transferAmountTok,                      tokTypeId_B: CONST.tokenType.TOK_T2,
                ccy_amount_A: transferAmountCcy,                      ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                      ccyTypeId_B: 0,
                   applyFees: true,
            });

            // test contract owner has received expected ccy fee
            const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) ccy balance after transfer');
        }
    });

    it(`fees (ccy per million received) - apply USD ccy fee 3 USD/1m tokens received on trades (0.1KT, 1KT, 1.5KT, 11KT) (global fee on B)`, async () => {
        const A = accounts[global.TaddrNdx + 0]
        const B = accounts[global.TaddrNdx + 1]
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.MT_CARBON,  1,     A, CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,                      CONST.millionCcy_cents,  B, 'TEST');

        // set global fee: ccy 3.00 /per Million qty received
        const ccy_perMillion = 300; // $3
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        // truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyPerMillion', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_perMillion == ccy_perMillion && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).ccy_perMillion == ccy_perMillion, 'unexpected fee per Million received after setting ccy fee structure');

        const transferAmountsTok = [CONST.KT_CARBON * 0.1, CONST.KT_CARBON * 15, CONST.KT_CARBON * 1, CONST.KT_CARBON * 11];
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);
            const expectedFeeCcy = //Math.floor
                                    (Number(transferAmountTok.toString()) / 1000000) * ccy_perMillion;
            //console.log('expectedFeeCcy', expectedFeeCcy);
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

    it(`fees (ccy per million received) - apply ledger override USD ccy fee 6 USD/1m tokens received, capped USD 60, on trades (0.1KT, 1KT, 1.5KT, 11KT) (ledger fee on A)`, async () => {
        const A = accounts[global.TaddrNdx + 0]
        const B = accounts[global.TaddrNdx + 1]
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,                      CONST.millionCcy_cents,  A, 'TEST');
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.MT_CARBON,  1,     B, CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set global fee: ccy 3.00 /per Million qty received
        const setExchangeFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 300, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        // set ledger override fee: ccy 6.00 /per Million qty received, cap 60.00
        const ccy_perMillion = 600, fee_max = 6000, fee_min = 100; // $6, $60, $1
        const setLedgerFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, A, { ccy_mirrorFee: false, ccy_perMillion, fee_fixed: 0, fee_percBips: 0, fee_min, fee_max } );

        const transferAmountsTok = [CONST.KT_CARBON * 0.1, CONST.KT_CARBON * 15, CONST.KT_CARBON * 1, CONST.KT_CARBON * 11];
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);
            const expectedFeeCcy = Math.max(Math.min(//Math.floor
                                                     (Number(transferAmountTok.toString()) / 1000000) * ccy_perMillion, fee_max), fee_min);
            //console.log('expectedFeeCcy', expectedFeeCcy);
            const data = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: 0,                                      tokTypeId_A: 0,
                       qty_B: transferAmountTok,                      tokTypeId_B: CONST.tokenType.TOK_T2,
                ccy_amount_A: transferAmountCcy,                      ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                      ccyTypeId_B: 0,
                   applyFees: true,
            });

            // test contract owner has received expected ccy fee
            const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
            assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) ccy balance after transfer');
        }
    });

    it(`fees (ccy per million received) - apply ledger override USD ccy fee 6 USD/1m tokens received, max USD 60, min USD 1, on trades (0.1KT, 1KT, 1.5KT, 11KT) (ledger fee on B)`, async () => {
        const A = accounts[global.TaddrNdx + 0]
        const B = accounts[global.TaddrNdx + 1]
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.MT_CARBON,  1,     A, CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,                      CONST.millionCcy_cents,  B, 'TEST');

        // set global fee: ccy 3.00 /per Million qty received
        const setExchangeFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 300, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        // set ledger override fee: ccy 6.00 /per Million qty received, cap 60.00, collar 1.00
        const ccy_perMillion = 600, fee_max = 6000, fee_min = 100; // $6, $60, $1
        const setLedgerFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, B, { ccy_mirrorFee: false, ccy_perMillion, fee_fixed: 0, fee_percBips: 0, fee_min, fee_max } );

        const transferAmountsTok = [CONST.KT_CARBON * 0.1, CONST.KT_CARBON * 15, CONST.KT_CARBON * 1, CONST.KT_CARBON * 11];
        for (var i = 0 ; i < transferAmountsTok.length ; i++) {
            // transfer, with fee structure applied
            const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
            const transferAmountTok = new BN(transferAmountsTok[i]);
            const expectedFeeCcy = Math.max(Math.min(//Math.floor
                                                     (Number(transferAmountTok.toString()) / 1000000) * ccy_perMillion, fee_max), fee_min);
            //console.log('expectedFeeCcy', expectedFeeCcy);
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
});