// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StFutures.sol => FuturesLib.sol
const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');

const { DateTime } = require('luxon');

const futuresHelper = require('../test/futuresHelper.js');
const CONST = require('../const.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;

    var usdFT, usdFT_underlyer, usdFT_refCcy; // usd FT
    var ethFT, ethFT_underlyer, ethFT_refCcy; // eth FT
    var spotTypes, ccyTypes;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        
        await setupHelper.whitelistAndSeal({ stm, accounts });
        await setupHelper.setDefaults({ stm, accounts });
        
        if (!global.TaddrNdx) global.TaddrNdx = 0;

        ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);

        // add test FT type - USD
        const ftTestName_USD = `FT_USD_${new Date().getTime()}`;
        const addFtTx_USD = await stm.addSecTokenType(ftTestName_USD, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
              expiryTimestamp: DateTime.local().plus({ days: 30 }).toMillis(),
              underlyerTypeId: spotTypes[0].id,
                     refCcyId: ccyTypes.find(p => p.name === 'USD').id,
                 contractSize: 1000,
        }, CONST.nullAddr);
        usdFT = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_USD)[0];
        usdFT_underlyer = spotTypes.filter(p => p.id == usdFT.ft.underlyerTypeId)[0];
        usdFT_refCcy = ccyTypes.filter(p => p.id == usdFT.refCcyId)[0];

        // add test FT type - ETH
        const ftTestName_ETH = `FT_ETH_${new Date().getTime()}`;
        const addFtTx_ETH = await stm.addSecTokenType(ftTestName_ETH, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
            expiryTimestamp: DateTime.local().plus({ days: 30 }).toMillis(),
            underlyerTypeId: spotTypes[0].id,
                    refCcyId: ccyTypes.find(p => p.name === 'ETH').id,
                contractSize: 1000,
        }, CONST.nullAddr);
        ethFT = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_ETH)[0];
        ethFT_underlyer = spotTypes.filter(p => p.id == ethFT.ft.underlyerTypeId)[0];
        ethFT_refCcy = ccyTypes.filter(p => p.id == ethFT.refCcyId)[0];
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`FT pos-combine - should combine 2 positions, same direction`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: +1, qty_B: -1, price: 100 });
        const posId_A = Number(await stm.getSecToken_MaxId()) - 0; // long, A
        const posId_B = Number(await stm.getSecToken_MaxId()) - 1; // short, B
        //await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, shortStId: posId_B, markPrice: 100, feePerSide: 0 });

        await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: +1, qty_B: -1, price: 100 });
        const childId_A = Number(await stm.getSecToken_MaxId()) - 0; // long, A
        const childId_B = Number(await stm.getSecToken_MaxId()) - 1; // short, B
        //await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, shortStId: childId_B, markPrice: 100, feePerSide: 0 });
        
        await  futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: posId_B, markPrice: 100, feePerSide: 0 });
        await  futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: posId_A, markPrice: 100, feePerSide: 0 });
        await  futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: childId_B, markPrice: 100, feePerSide: 0 });
        await  futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: childId_A, markPrice: 100, feePerSide: 0 });

        // combine A side pos's
        //const lA_before = await stm.getLedgerEntry(A);
        const txA = await stm.combineFtPos({ tokTypeId: usdFT.id, master_StId: posId_A, child_StIds: [childId_A] });
        const lA_after = await stm.getLedgerEntry(A);
        //console.log(`lA_before: ${lA_before.tokens.map(p2 => `{ TT: ${p2.tokTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
        //console.log(` lA_after: ${lA_after.tokens.map(p2 => `{ TT: ${p2.tokTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
        //truffleAssert.prettyPrintEmittedEvents(txA);
        assert(lA_after.tokens.length == 1 && lA_after.tokens[0].currentQty == +2, 'unexpected A side ledger after');
        truffleAssert.eventEmitted(txA, 'Combine', ev => ev.masterStId == posId_A && ev.countTokensCombined == 1);

        // combine B side pos's
        //const lB_before = await stm.getLedgerEntry(B);
        const txB = await stm.combineFtPos({ tokTypeId: usdFT.id, master_StId: posId_B, child_StIds: [childId_B] });
        const lB_after = await stm.getLedgerEntry(B);
        //console.log(`lB_before: ${lB_before.tokens.map(p2 => `{ TT: ${p2.tokTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
        //console.log(` lB_after: ${lB_after.tokens.map(p2 => `{ TT: ${p2.tokTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
        //truffleAssert.prettyPrintEmittedEvents(txB);
        assert(lB_after.tokens.length == 1 && lB_after.tokens[0].currentQty == -2, 'unexpected B side ledger after');
        truffleAssert.eventEmitted(txB, 'Combine', ev => ev.masterStId == posId_B && ev.countTokensCombined == 1);
    });

    it(`FT pos-combine - should combine 2 positions, opposite directions (closing)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: +1, qty_B: -1, price: 100 });
        const posId_A = Number(await stm.getSecToken_MaxId()) - 0; // long, A
        const posId_B = Number(await stm.getSecToken_MaxId()) - 1; // short, B
        //await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, shortStId: posId_B, markPrice: 100, feePerSide: 0 });
        await  futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: posId_B, markPrice: 100, feePerSide: 0 });
        await  futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: posId_A, markPrice: 100, feePerSide: 0 });

        await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: -1, qty_B: +1, price: 100 });
        const childId_1B = Number(await stm.getSecToken_MaxId()) - 0; // long, B
        const childId_1A = Number(await stm.getSecToken_MaxId()) - 1; // short, A
        //await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, shortStId: childId_1A, markPrice: 100, feePerSide: 0 });
        await  futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: childId_1A, markPrice: 100, feePerSide: 0 });
        await  futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: childId_1B, markPrice: 100, feePerSide: 0 });

        // combine A side pos's
        //const lA_before = await stm.getLedgerEntry(A);
        const txA = await stm.combineFtPos({ tokTypeId: usdFT.id, master_StId: posId_A, child_StIds: [childId_1A] });
        const lA_after = await stm.getLedgerEntry(A);
        //console.log(`lA_before: ${lA_before.tokens.map(p2 => `{ TT: ${p2.tokTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
        //console.log(` lA_after: ${lA_after.tokens.map(p2 => `{ TT: ${p2.tokTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
        //truffleAssert.prettyPrintEmittedEvents(txA);
        assert(lA_after.tokens.length == 1 && lA_after.tokens[0].currentQty == 0, 'unexpected A side ledger after');
        truffleAssert.eventEmitted(txA, 'Combine', ev => ev.masterStId == posId_A && ev.countTokensCombined == 1);

        // combine B side pos's
        //const lB_before = await stm.getLedgerEntry(B);
        const txB = await stm.combineFtPos({ tokTypeId: usdFT.id, master_StId: posId_B, child_StIds: [childId_1B] });
        const lB_after = await stm.getLedgerEntry(B);
        //console.log(`lB_before: ${lB_before.tokens.map(p2 => `{ TT: ${p2.tokTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
        //console.log(` lB_after: ${lB_after.tokens.map(p2 => `{ TT: ${p2.tokTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
        //truffleAssert.prettyPrintEmittedEvents(txB);
        assert(lB_after.tokens.length == 1 && lB_after.tokens[0].currentQty == 0, 'unexpected B side ledger after');
        truffleAssert.eventEmitted(txB, 'Combine', ev => ev.masterStId == posId_B && ev.countTokensCombined == 1);
    });

    it(`FT pos-combine - should combine 3 positions, opposite directions (closing)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: +2, qty_B: -2, price: 100 });
        const posId_A = Number(await stm.getSecToken_MaxId()) - 0; // long, A
        const posId_B = Number(await stm.getSecToken_MaxId()) - 1; // short, B
        //await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, shortStId: posId_B, markPrice: 100, feePerSide: 0 });
        await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: posId_B, markPrice: 100, feePerSide: 0 });
        await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: posId_A, markPrice: 100, feePerSide: 0 });

        await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: -1, qty_B: +1, price: 100 });
        const childId_1B = Number(await stm.getSecToken_MaxId()) - 0; // long, B
        const childId_1A = Number(await stm.getSecToken_MaxId()) - 1; // short, A
        //await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, shortStId: childId_1A, markPrice: 100, feePerSide: 0 });
        await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: childId_1A, markPrice: 100, feePerSide: 0 });
        await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: childId_1B, markPrice: 100, feePerSide: 0 });

        await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: -1, qty_B: +1, price: 100 });
        const childId_2B = Number(await stm.getSecToken_MaxId()) - 0; // long, B
        const childId_2A = Number(await stm.getSecToken_MaxId()) - 1; // short, A
        //await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, shortStId: childId_2A, markPrice: 100, feePerSide: 0 });
        await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: childId_2A, markPrice: 100, feePerSide: 0 });
        await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: childId_2B, markPrice: 100, feePerSide: 0 });

        // combine A side pos's
        //const lA_before = await stm.getLedgerEntry(A);
        const txA = await stm.combineFtPos({ tokTypeId: usdFT.id, master_StId: posId_A, child_StIds: [childId_1A, childId_2A] });
        const lA_after = await stm.getLedgerEntry(A);
        // console.log(`lA_before: ${lA_before.tokens.map(p2 => `{ TT: ${p2.tokTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
        // console.log(` lA_after: ${lA_after.tokens.map(p2 => `{ TT: ${p2.tokTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
        // truffleAssert.prettyPrintEmittedEvents(txA);
        assert(lA_after.tokens.length == 1 && lA_after.tokens[0].currentQty == 0, 'unexpected A side ledger after');
        truffleAssert.eventEmitted(txA, 'Combine', ev => ev.masterStId == posId_A && ev.countTokensCombined == 2);

        // combine B side pos's
        //const lB_before = await stm.getLedgerEntry(B);
        const txB = await stm.combineFtPos({ tokTypeId: usdFT.id, master_StId: posId_B, child_StIds: [childId_1B, childId_2B] });
        const lB_after = await stm.getLedgerEntry(B);
        // console.log(`lB_before: ${lB_before.tokens.map(p2 => `{ TT: ${p2.tokTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
        // console.log(` lB_after: ${lB_after.tokens.map(p2 => `{ TT: ${p2.tokTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
        // truffleAssert.prettyPrintEmittedEvents(txB);
        assert(lB_after.tokens.length == 1 && lB_after.tokens[0].currentQty == 0, 'unexpected B side ledger after');
        truffleAssert.eventEmitted(txB, 'Combine', ev => ev.masterStId == posId_B && ev.countTokensCombined == 2);
    });

    it(`FT pos-combine - should not allow non-owner to combine futures positions`, async () => {
        try { await stm.combineFtPos({ tokTypeId: usdFT.id, master_StId: 1, child_StIds: [2] }, { from: accounts[10] }); } catch (ex) {
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`); return;
        }
        assert.fail('expected contract exception');
    }); 

    it(`FT pos-combine - should not allow combine of futures positions for an invalid (non-future) token type`, async () => {
        try { await stm.combineFtPos({ tokTypeId: spotTypes[0].id, master_StId: 1, child_StIds: [2] }); }
        catch (ex) { assert(ex.reason == 'Bad token settlement type', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    }); 

    it(`FT pos-combine - should not allow combine of futures positions for an unmarked position (master)`, async () => {
        try { 
            const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
            
            await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A:  -1, qty_B:  +1, price: 100 });
            const posId = Number(await stm.getSecToken_MaxId()) - 1;
            
            await stm.combineFtPos({ tokTypeId: usdFT.id, master_StId: posId, child_StIds: [] });
        } catch (ex) { assert(ex.reason == 'Bad last mark price on master token', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    }); 
    it(`FT pos-combine - should not allow combine of futures positions for an unmarked position (child)`, async () => {
        try { 
            const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
            
            await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A:  -1, qty_B:  +1, price: 100 });
            const shortId = Number(await stm.getSecToken_MaxId()) - 1;
            //await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, shortStId: posId, markPrice: 100, feePerSide: 0 });
            await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: shortId,   markPrice: 100, feePerSide: 0 });
            await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: shortId+1, markPrice: 100, feePerSide: 0 });

            await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: -10, qty_B: +10, price: 100 });
            const childShortId = Number(await stm.getSecToken_MaxId()) - 1;

            await stm.combineFtPos({ tokTypeId: usdFT.id, master_StId: shortId, child_StIds: [childShortId] });
        } catch (ex) { assert(ex.reason == 'Bad last mark price on child token', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT pos-combine - should not allow combine of futures positions for a mark mismatch position (child vs. master)`, async () => {
        try { 
            const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
            await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, CONST.millionCcy_cents, A, 'TEST');
            await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, CONST.millionCcy_cents, B, 'TEST');

            await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A:  -1, qty_B:  +1, price: 100 });
            const posId = Number(await stm.getSecToken_MaxId()) - 1;
            //await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, shortStId: posId, markPrice: 100, feePerSide: 0 });
            await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: posId,   markPrice: 100, feePerSide: 0 });
            await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: posId+1, markPrice: 100, feePerSide: 0 });

            await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: -10, qty_B: +10, price: 102 });
            const childId = Number(await stm.getSecToken_MaxId()) - 1;
            //await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, shortStId: childId, markPrice: 999, feePerSide: 0 });
            await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: childId,   markPrice: 999, feePerSide: 0 });
            await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: childId+1, markPrice: 999, feePerSide: 0 });

            await stm.combineFtPos({ tokTypeId: usdFT.id, master_StId: posId, child_StIds: [childId] });
        } catch (ex) { assert(ex.reason == 'Last mark price mismatch', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    }); 

    it(`FT pos-combine - should not allow combine of futures positions for a position not on the supplied ledger (master)`, async () => {
        try { 
            const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
            
            await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A:  -1, qty_B:  +1, price: 100 });
            const posId = Number(await stm.getSecToken_MaxId()) - 1;
            //await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, shortStId: posId, markPrice: 100, feePerSide: 0 });
            await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: posId,   markPrice: 100, feePerSide: 0 });
            await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: posId+1, markPrice: 100, feePerSide: 0 });

            await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: -10, qty_B: +10, price: 100 });
            const childId = Number(await stm.getSecToken_MaxId()) - 1;

            await stm.combineFtPos({ tokTypeId: ethFT.id, master_StId: posId, child_StIds: [childId] });
        } catch (ex) { assert(ex.reason == 'Bad or missing ledger token type on master token', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    }); 
    it(`FT pos-combine - should not allow combine of futures positions for a position not on the supplied ledger (child)`, async () => {
        try { 
            const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
            
            await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A:  -1, qty_B:  +1, price: 100 });
            const posId = Number(await stm.getSecToken_MaxId()) - 1;
            //await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, shortStId: posId, markPrice: 100, feePerSide: 0 });
            await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: posId,   markPrice: 100, feePerSide: 0 });
            await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: posId+1, markPrice: 100, feePerSide: 0 });

            await futuresHelper.openFtPos({ stm, accounts, tokTypeId: ethFT.id, ledger_A: A, ledger_B: B, qty_A: -10, qty_B: +10, price: 100 });
            const childId = Number(await stm.getSecToken_MaxId()) - 1;
            //await futuresHelper.takePay({ stm, accounts, tokTypeId: ethFT.id, shortStId: childId, markPrice: 100, feePerSide: 0 });
            await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: childId,   markPrice: 100, feePerSide: 0 });
            await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: childId+1, markPrice: 100, feePerSide: 0 });

            await stm.combineFtPos({ tokTypeId: usdFT.id, master_StId: posId, child_StIds: [childId] });
        } catch (ex) { assert(ex.reason == 'Bad or missing ledger token type on child token', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    }); 

    it(`FT pos-combine - should not allow combine of futures positions for mismatched (different owner) master/child positons`, async () => {
        try { 
            const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
            
            await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A:  -1, qty_B:  +1, price: 100 });
            const posId = Number(await stm.getSecToken_MaxId()) - 1;
            //await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, shortStId: posId, markPrice: 100, feePerSide: 0 });
            await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: posId,   markPrice: 100, feePerSide: 0 });
            await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: posId+1, markPrice: 100, feePerSide: 0 });

            await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: accounts[0], ledger_B: B, qty_A: -10, qty_B: +10, price: 100 });
            const childId = Number(await stm.getSecToken_MaxId()) - 1;

            await stm.combineFtPos({ tokTypeId: usdFT.id, master_StId: posId, child_StIds: [childId] });
        } catch (ex) { assert(ex.reason == 'Token ledger owner mismatch', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    }); 
});
