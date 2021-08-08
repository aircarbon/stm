// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StTransferable.sol => TransferLib.sol
const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');
const transferHelper = require('../test/transferHelper.js');
const BN = require('bn.js');
const Big = require('big.js');
const Web3 = require('web3');
const web3 = new Web3();
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
            console.log(`TaddrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // ST MULTI FEES: LEDGER OVERRIDE

    it(`fees (ledger) - apply NATURE token ledger override fee 1000 BP + 5 TONS fixed (cap 10 TONS) on a small trade (fee on A)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,        CONST.oneEth_wei,        B,   'TEST');

        // set global fee structure (zero)
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,      { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        // set ledger fee structure NATURE for A: 10% + 5 TONS, CAP 10 TONS
        const feeBps = 1000; 
        const feeFix = 5;
        const feeCap = 10;
        const setEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.TOK_T2, A, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: feeFix, fee_percBips: feeBps, fee_min: 0, fee_max: feeCap } );
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokBps', ev => ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.fee_token_PercBips == feeBps && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokFix', ev => ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.fee_tokenQty_Fixed == feeFix && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokMax', ev => ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.fee_token_Max == feeCap && ev.ledgerOwner == A);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.TOK_T2, A)).fee_fixed == feeFix, 'unexpected carbon fixed fee after setting ledger fee structure');
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.TOK_T2, A)).fee_percBips == feeBps, 'unexpected carbon bps fee after setting ledger fee structure');
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.TOK_T2, A)).fee_max == feeCap, 'unexpected carbon max fee after setting ledger fee structure');

        // set different (irrelevant) ledger fee UNFCC for A
        await stm.setFee_TokType(CONST.tokenType.TOK_T1, A, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: feeFix+1, fee_percBips: feeBps+1, fee_min: 0, fee_max: feeCap+1 } );

        // transfer, with fee structure applied
        const transferAmountTokQty = new BN(100); // 100 kg
        const expectedFeeTokQty = Math.min(Math.floor(Number(transferAmountTokQty.toString()) * (feeBps/10000)) + feeFix, feeCap);
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: transferAmountTokQty,             tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                tokTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // contract owner has received expected token fees
        const owner_balBefore = data.owner_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeTokQty))), 'unexpected fee receiver token balance after transfer');
        
        // sender has sent expected quantity and fees
        const A_balBefore = data.ledgerA_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(expectedFeeTokQty)).minus(Big(transferAmountTokQty))), 'unexpected fee payer token balance after transfer');
    });

    it(`fees (ledger) - apply then clear NATURE token ledger override fee 1000 BP + 5 TONS fixed (cap 10 TONS) on a small trade (fee on A)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,        CONST.oneEth_wei,  B, 'TEST');

        // set global fee structure (non-zero)
        const globalFeeBps = 100, globalFeeFix = 1, globalFeeCap = 5;
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: globalFeeFix, fee_percBips: globalFeeBps, fee_min: 0, fee_max: globalFeeCap } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,      { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0,            fee_percBips: 0,            fee_min: 0, fee_max: 0 } );

        // set ledger fee structure NATURE for A: 10% + 5 TONS, CAP 10 TONS
        var feeBps = 1000; 
        var feeFix = 5;
        var feeCap = 10;
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, A, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: feeFix, fee_percBips: feeBps, fee_min: 0, fee_max: feeCap } );

        // clear ledger fee NATURE for A (zero)
        feeBps = 0;
        feeFix = 0;
        feeCap = 0;
        const clearEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.TOK_T2, A, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: feeFix, fee_percBips: feeBps, fee_min: 0, fee_max: feeCap } );
        truffleAssert.eventEmitted(clearEeuFeeTx, 'SetFeeTokBps', ev => ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.fee_token_PercBips == feeBps && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(clearEeuFeeTx, 'SetFeeTokFix', ev => ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.fee_tokenQty_Fixed == feeFix && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(clearEeuFeeTx, 'SetFeeTokMax', ev => ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.fee_token_Max == feeCap && ev.ledgerOwner == A);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.TOK_T2, A)).fee_fixed == feeFix, 'unexpected carbon fixed fee after clearing ledger fee structure');
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.TOK_T2, A)).fee_percBips == feeBps, 'unexpected carbon bps fee after clearing ledger fee structure');
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.TOK_T2, A)).fee_max == feeCap, 'unexpected carbon max fee after clearing ledger fee structure');

        // set different (irrelevant) ledger fee UNFCC for A
        await stm.setFee_TokType(CONST.tokenType.TOK_T1, A, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: feeFix+1, fee_percBips: feeBps+1, fee_min: 0, fee_max: feeCap+1 } );

        // transfer, with fee structure applied - expect global fee structure
        const transferAmountTokQty = new BN(100); // 100 kg
        const expectedFeeTokQty = Math.min(Math.floor(Number(transferAmountTokQty.toString()) * (globalFeeBps/10000)) + globalFeeFix, globalFeeCap);
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: transferAmountTokQty,             tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                tokTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // contract owner has received expected token fees
        const owner_balBefore = data.owner_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeTokQty))), 'unexpected fee receiver token balance after transfer');
        
        // sender has sent expected quantity and fees
        const A_balBefore = data.ledgerA_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(expectedFeeTokQty)).minus(Big(transferAmountTokQty))), 'unexpected fee payer token balance after transfer');
    });

    it(`fees (ledger) - apply NATURE token ledger override fee 1000 BP + 1000 tons fixed (collar 100m tons), on a large (0.5 GT) trade (fee on B)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];

        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,        CONST.oneEth_wei,        A, 'TEST');
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,   CONST.GT_CARBON, 1,       B, CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set global fee structure (zero)
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,      { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        // set ledger fee structure NATURE on B: 10% + 1000 TONS
        const feeBps = 1000; // 1000 bp
        const feeFix = 1000; // 1000 tons fixed
        const feeMin = 100000000; // 100m tons min
        const setEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.TOK_T2, B, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: feeFix, fee_percBips: feeBps, fee_min: feeMin, fee_max: 0 } );
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, B,      { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0,      fee_percBips: 0,      fee_min: 0,      fee_max: 0 } );
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokBps', ev => ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.fee_token_PercBips == feeBps && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokFix', ev => ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.fee_tokenQty_Fixed == feeFix && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokMin', ev => ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.fee_token_Min == feeMin && ev.ledgerOwner == B);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.TOK_T2, B)).fee_fixed == feeFix, 'unexpected carbon fixed fee after setting ledger fee structure');
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.TOK_T2, B)).fee_percBips == feeBps, 'unexpected carbon bps fee after setting ledger fee structure');
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.TOK_T2, B)).fee_min == feeMin, 'unexpected carbon max fee after setting ledger fee structure');

        // set different (irrelevant) ledger fee UNFCC for B
        await stm.setFee_TokType(CONST.tokenType.TOK_T1, B, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: feeFix+1, fee_percBips: feeBps+1, fee_min: feeMin+1, fee_max: 0 } );

        // transfer, with fee structure applied
        const transferAmountTokQty = new BN(CONST.GT_CARBON / 2); // 0.5 giga ton
        const expectedFeeTokQty = Math.max(Math.floor(Number(transferAmountTokQty.toString()) * (feeBps/10000)) + feeFix, feeMin);
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: 0,                                tokTypeId_A: 0,
                   qty_B: transferAmountTokQty,             tokTypeId_B: CONST.tokenType.TOK_T2,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });

        // contract owner has received expected token fees
        const owner_balBefore = data.owner_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeTokQty))), 'unexpected fee receiver token balance after transfer');
        
        // sender has sent expected quantity and fees
        const B_balBefore = data.ledgerB_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const B_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(B_balAfter).eq(Big(B_balBefore).minus(Big(expectedFeeTokQty)).minus(Big(transferAmountTokQty))), 'unexpected fee payer token balance after transfer');
    });

    it(`fees (ledger) - apply then clear NATURE token ledger override fee 1000 BP + 1000 tons fixed (collar 100m tons), on a large (0.5 GT) trade (fee on B)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];

        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,         CONST.oneEth_wei,         A, 'TEST');
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.GT_CARBON, 1,       B, CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set global fee structure (non-zero)
        const globalFeeBps = 100, globalFeeFix = 100, globalFeeMin = 1000000;
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: globalFeeFix, fee_percBips: globalFeeBps, fee_min: globalFeeMin, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,      { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0,            fee_percBips: 0,            fee_min: 0,            fee_max: 0 } );

        // set ledger fee structure NATURE on B: 10% + 1000 TONS
        var feeBps = 1000; // 1000 bp
        var feeFix = 1000; // 1000 tons
        var feeMin = 100000000; // 100m tons min
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, B, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: feeFix, fee_percBips: feeBps, fee_min: feeMin, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, B,      { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0,      fee_percBips: 0,      fee_min: 0,      fee_max: 0 } );

        // clear ledger fee structure on B
        feeBps = 0;
        feeFix = 0;
        feeMin = 0;
        const clearEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.TOK_T2, B, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: feeFix, fee_percBips: feeBps, fee_min: feeMin, fee_max: 0 } );
        truffleAssert.eventEmitted(clearEeuFeeTx, 'SetFeeTokBps', ev => ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.fee_token_PercBips == feeBps && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(clearEeuFeeTx, 'SetFeeTokFix', ev => ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.fee_tokenQty_Fixed == feeFix && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(clearEeuFeeTx, 'SetFeeTokMin', ev => ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.fee_token_Min == feeMin && ev.ledgerOwner == B);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.TOK_T2, B)).fee_fixed == feeFix, 'unexpected carbon fixed fee after clearing ledger fee structure');
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.TOK_T2, B)).fee_percBips == feeBps, 'unexpected carbon bps fee after clearing ledger fee structure');
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.TOK_T2, B)).fee_min == feeMin, 'unexpected carbon max fee after clearing ledger fee structure');

        // set different (irrelevant) ledger fee UNFCC for B
        await stm.setFee_TokType(CONST.tokenType.TOK_T1, B, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: feeFix+1, fee_percBips: feeBps+1, fee_min: feeMin+1, fee_max: 0 } );

        // transfer, with fee structure applied - expect global fee structure
        const transferAmountTokQty = new BN(CONST.GT_CARBON / 2); // 0.5 giga ton
        const expectedFeeTokQty = Math.max(Math.floor(Number(transferAmountTokQty.toString()) * (globalFeeBps/10000)) + globalFeeFix, globalFeeMin);
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: 0,                                tokTypeId_A: 0,
                   qty_B: transferAmountTokQty,             tokTypeId_B: CONST.tokenType.TOK_T2,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });

        // contract owner has received expected token fees
        const owner_balBefore = data.owner_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeTokQty))), 'unexpected fee receiver token balance after transfer');
        
        // sender has sent expected quantity and fees
        const B_balBefore = data.ledgerB_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const B_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(B_balAfter).eq(Big(B_balBefore).minus(Big(expectedFeeTokQty)).minus(Big(transferAmountTokQty))), 'unexpected fee payer token balance after transfer');
    });

    // CCY MULTI FEES: LEDGER OVERRIDE

    it(`fees (ledger) - apply ETH ccy override fee 2500 BP + 0.01 ETH fixed (collar 0.2 ETH), on a small trade (fee on A)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,       CONST.oneEth_wei,        A, 'TEST');
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,   CONST.KT_CARBON, 1,      B, CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set global fee structure (zero)
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,      { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        // set ledger fee structure ETH for A: 25% + 0.01 ETH, cap 0.02 ETH
        const ethFeeBps = 2500;
        const ethFeeFix = CONST.hundredthEth_wei;
        const ethFeeMin = (CONST.hundredthEth_wei * 20).toFixed();
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, A,   { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: ethFeeMin, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeeBps && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFix && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyMin', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Min == ethFeeMin && ev.ledgerOwner == A);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.ETH, A)).fee_percBips == ethFeeBps, 'unexpected ETH percentage fee after setting ETH fee structure');
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.ETH, A)).fee_fixed == ethFeeFix, 'unexpected ETH fixed fee after setting ETH fee structure');
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.ETH, A)).fee_min == ethFeeMin, 'unexpected ETH min fee after setting ETH fee structure');

        // set different (irrelevant) ledger fee USD for A
        await stm.setFee_CcyType(CONST.ccyType.USD, A, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: ethFeeFix+1, fee_percBips: ethFeeBps+1, fee_min: ethFeeMin+1, fee_max: 0 } );

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.tenthEth_wei);
        const expectedFeeCcy = Math.max(Math.floor(Number(transferAmountCcy.toString()) * (ethFeeBps/10000)) + Number(ethFeeFix), ethFeeMin);
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                                        ledger_B: B,
                   qty_A: 0,                                                     tokTypeId_A: 0,
                   qty_B: 750,                                                   tokTypeId_B: CONST.tokenType.TOK_T2,
            ccy_amount_A: transferAmountCcy,                                     ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                     ccyTypeId_B: 0,
               applyFees: true,
        });

        // contract owner has received expected ccy fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeCcy))), 'unexpected fee receiver currency balance after transfer');

        // fee payer has paid expected ccy fee
        const A_balBefore = data.ledgerA_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(expectedFeeCcy)).minus(Big(transferAmountCcy))), 'unexpected fee payer currency balance after transfer');
    });

    it(`fees (ledger) - apply then clear ETH ccy override fee 2500 BP + 0.01 ETH fixed (collar 0.2 ETH), on a small trade (fee on A)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,       CONST.oneEth_wei,        A, 'TEST');
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,   CONST.KT_CARBON, 1,      B, CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set global fee structure (non-zero)
        const globalFeeBps = 2500, globalFeeFix = CONST.thousandthEth_wei, globalFeeMin = (CONST.hundredthEth_wei * 10).toFixed();
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,      { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: globalFeeFix, fee_percBips: globalFeeBps, fee_min: globalFeeMin, fee_max: 0 } );
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0,            fee_percBips: 0,            fee_min: 0,            fee_max: 0 } );

        // set ledger fee structure ETH for A: 25% + 0.01 ETH, cap 0.02 ETH
        var ethFeeBps = 2500;
        var ethFeeFix = CONST.hundredthEth_wei;
        var ethFeeMin = (CONST.hundredthEth_wei * 20).toFixed();
        await stm.setFee_CcyType(CONST.ccyType.ETH, A,   { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: ethFeeMin, fee_max: 0 } );

        // clear ledger fee ETH for A (zero)
        ethFeeBps = 0;
        ethFeeFix = 0;
        ethFeeMin = 0;
        const clearFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, A, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: ethFeeMin, fee_max: 0 } );
        truffleAssert.eventEmitted(clearFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeeBps && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(clearFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFix && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(clearFeeTx, 'SetFeeCcyMin', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Min == ethFeeMin && ev.ledgerOwner == A);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.ETH, A)).fee_fixed == ethFeeFix, 'unexpected ccy fixed fee after clearing ledger fee structure');
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.ETH, A)).fee_percBips == ethFeeBps, 'unexpected ccy bps fee after clearing ledger fee structure');
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.ETH, A)).fee_min == ethFeeMin, 'unexpected ccy min fee after clearing ledger fee structure');

        // set different (irrelevant) ledger fee USD for A
        await stm.setFee_CcyType(CONST.ccyType.USD, A, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: ethFeeFix+1, fee_percBips: ethFeeBps+1, fee_min: ethFeeMin+1, fee_max: 0 } );

        // transfer, with fee structure applied - expect global fee structure
        const transferAmountCcy = new BN(CONST.tenthEth_wei);
        const expectedFeeCcy = Math.max(Math.floor(Number(transferAmountCcy.toString()) * (globalFeeBps/10000)) + Number(globalFeeFix), globalFeeMin);
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                                        ledger_B: B,
                   qty_A: 0,                                                     tokTypeId_A: 0,
                   qty_B: 750,                                                   tokTypeId_B: CONST.tokenType.TOK_T2,
            ccy_amount_A: transferAmountCcy,                                     ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                     ccyTypeId_B: 0,
               applyFees: true,
        });

        // contract owner has received expected ccy fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeCcy))), 'unexpected fee receiver currency balance after transfer');

        // fee payer has paid expected ccy fee
        const A_balBefore = data.ledgerA_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(expectedFeeCcy)).minus(Big(transferAmountCcy))), 'unexpected fee payer currency balance after transfer');
    });

    it(`fees (ledger) - apply ETH ccy ledger override fee 1000 BP + 1000 ETH fixed (cap 50000 ETH), on a large (500k ETH) trade (fee on B)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];

        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,   CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,       CONST.millionEth_wei,    B, 'TEST');

        // set global fee structure (zero)
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,      { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        // set fee structure ETH on B: 10% + 1000 ETH fixed, cap 50000 ETH
        const ethFeeBps = 1000; // 1000 bp
        const ethFeeFix = CONST.thousandEth_wei; 
        const ethFeeMax = "50000000000000000000000"; // 50k eth
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, B,   { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: 0, fee_max: ethFeeMax } );
        const setEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.TOK_T2, B, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0,         fee_percBips: 0,         fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeeBps && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFix && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyMax', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Max == ethFeeMax && ev.ledgerOwner == B);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.ETH, B)).fee_fixed == ethFeeFix, 'unexpected ccy fixed fee after clearing ledger fee structure');
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.ETH, B)).fee_percBips == ethFeeBps, 'unexpected ccy bps fee after clearing ledger fee structure');
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.ETH, B)).fee_max == ethFeeMax, 'unexpected ccy max fee after clearing ledger fee structure');

        // set different (irrelevant) ledger fee USD for B
        await stm.setFee_CcyType(CONST.ccyType.USD, B, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: ethFeeFix+1, fee_percBips: ethFeeBps+1, fee_min: 0, fee_max: 0 } );

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.millionEth_wei).div(new BN(2)); // 500k
        const expectedFeeCcy = Math.min(Math.floor(Number(transferAmountCcy.toString()) * (ethFeeBps/10000)) + Number(ethFeeFix), ethFeeMax);
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                    ledger_B: B,
                   qty_A: 750,                               tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                 tokTypeId_B: 0,
            ccy_amount_A: 0,                                 ccyTypeId_A: 0,
            ccy_amount_B: transferAmountCcy,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // contract owner has received expected ccy fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeCcy))), 'unexpected fee receiver currency balance after transfer');

        // fee payer has paid expected ccy fee
        const B_balBefore = data.ledgerB_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const B_balAfter  =  data.ledgerB_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(B_balAfter).eq(Big(B_balBefore).minus(Big(expectedFeeCcy)).minus(Big(transferAmountCcy))), 'unexpected fee payer currency balance after transfer');
    });

    it(`fees (ledger) - apply then clear ETH ccy ledger override fee 1000 BP + 1000 ETH fixed (cap 50000 ETH), on a large (250k ETH) trade (fee on B)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];

        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,   CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,       CONST.millionEth_wei,    B, 'TEST');

        // set global fee structure (non-zero)
        const globalFeeBps = 100, globalFeeFix = 100, globalFeeMax = 100;
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,      { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: globalFeeFix, fee_percBips: globalFeeBps, fee_min: 0, fee_max: globalFeeMax } );
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0,            fee_percBips: 0,            fee_min: 0, fee_max: 0 } );

        // set fee structure ETH on B: 10% + 1000 ETH fixed, cap 50000 ETH
        var ethFeeBps = 1000; // 1000 bp
        var ethFeeFix = CONST.thousandEth_wei; 
        var ethFeeMax = "50000000000000000000000"; // 50k eth
        await stm.setFee_CcyType(CONST.ccyType.ETH, B,      { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: 0, fee_max: ethFeeMax } );
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, B, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0,         fee_percBips: 0,         fee_min: 0, fee_max: 0 } );

        // clear ledger fee structure (zero) on B
        ethFeeBps = 0;
        ethFeeFix = 0;
        ethFeeMax = 0;
        const clearFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, B, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: 0, fee_max: ethFeeMax } );
        truffleAssert.eventEmitted(clearFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeeBps && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(clearFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFix && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(clearFeeTx, 'SetFeeCcyMax', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Max == ethFeeMax && ev.ledgerOwner == B);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.ETH, B)).fee_fixed == ethFeeFix, 'unexpected ccy fixed fee after clearing ledger fee structure');
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.ETH, B)).fee_percBips == ethFeeBps, 'unexpected ccy bps fee after clearing ledger fee structure');
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.ETH, B)).fee_max == ethFeeMax, 'unexpected ccy max fee after clearing ledger fee structure');

        // set different (irrelevant) ledger fee USD for B
        await stm.setFee_CcyType(CONST.ccyType.USD, B, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: ethFeeFix+1, fee_percBips: ethFeeBps+1, fee_min: 0, fee_max: 0 } );

        // transfer, with fee structure applied - expect global fee structure
        const transferAmountCcy = new BN(CONST.millionEth_wei).div(new BN(4)); // 250k
        const expectedFeeCcy = Math.min(Math.floor(Number(transferAmountCcy.toString()) * (globalFeeBps/10000)) + Number(globalFeeFix), globalFeeMax);
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                    ledger_B: B,
                   qty_A: 750,                               tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                 tokTypeId_B: 0,
            ccy_amount_A: 0,                                 ccyTypeId_A: 0,
            ccy_amount_B: transferAmountCcy,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // contract owner has received expected ccy fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeCcy))), 'unexpected fee receiver currency balance after transfer');

        // fee payer has paid expected ccy fee
        const B_balBefore = data.ledgerB_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const B_balAfter  =  data.ledgerB_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(B_balAfter).eq(Big(B_balBefore).minus(Big(expectedFeeCcy)).minus(Big(transferAmountCcy))), 'unexpected fee payer currency balance after transfer');
    });

    // CCY & ST MULTI FEES + GLOBAL FEES: LEDGER OVERRIDE

    it(`fees (ledger) - should allow a ledger fee-capped transfer from A with otherwise insufficient carbon to cover fees (ledger fee on A, global fee on B)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];

        // 102,999,999 tons
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,   CONST.KT_CARBON,   1,                A, CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH, CONST.oneEth_wei, B, 'TEST');

        // set ledger fee structure NATURE (A): 10% + 50kg, max 50kg
        const ledgerFeeBps = 1000;
        const ledgerFeeFix = 50;
        const ledgerFeeMax = 50; // cap fee: 50 kg
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, A, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: ledgerFeeFix, fee_percBips: ledgerFeeBps, fee_min: 0, fee_max: ledgerFeeMax } );

        // set global fee structure ETH (B): fixed 0.1 ETH
        const globalFeeFix = 0;
        const globalFeeBps = 142;
        const globalFeeMax = CONST.tenthEth_wei;
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: globalFeeFix, fee_percBips: globalFeeBps, fee_min: 0, fee_max: globalFeeMax } );

        // A - carbon transfer amount & exepcted ledger fee
        const transferAmountTokQty = new BN(950); // not enough carbon for this trade, without the fee cap
        const expectedFeeTokQty = Math.min(Math.floor(Number(transferAmountTokQty.toString()) * (ledgerFeeBps/10000)) + Number(ledgerFeeFix), ledgerFeeMax);

        // B - ccy transfer amount & expected global fee
        const transferAmountEth = new BN(CONST.tenthEth_wei);
        const expectedFeeEth = Math.min(Math.floor(Number(transferAmountEth.toString()) * (globalFeeBps/10000)) + Number(globalFeeFix), globalFeeMax);

        const data = await transferHelper.transferLedger({ stm, accounts, 
            ledger_A: A,                                   ledger_B: B,
               qty_A: transferAmountTokQty,             tokTypeId_A: CONST.tokenType.TOK_T2,
               qty_B: 0,                                tokTypeId_B: 0,
        ccy_amount_A: 0,                                ccyTypeId_A: 0,
        ccy_amount_B: transferAmountEth,                ccyTypeId_B: CONST.ccyType.ETH,
           applyFees: true,
        });

        // contract owner has received expected token fee
        const owner_balBeforeTokQty = data.owner_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfterTokQty  =  data.owner_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfterTokQty).eq(Big(owner_balBeforeTokQty).plus(Big(expectedFeeTokQty))), 'unexpected fee receiver token balance after transfer');
        
        // carbon sender has sent expected carbon quantity and paid exepcted token fee
        const A_balBefore = data.ledgerA_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(expectedFeeTokQty)).minus(Big(transferAmountTokQty))), 'unexpected fee payer token balance after transfer');

        // contract owner has received expected ccy fee
        const owner_balBeforeCcy = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfterCcy  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfterCcy).eq(Big(owner_balBeforeCcy).plus(Big(expectedFeeEth))), 'unexpected fee receiver currency balance after transfer');

        // ccy sender has send expected ccy amount and paid expected ccy fee
        const B_balBefore = data.ledgerB_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const B_balAfter  =  data.ledgerB_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(B_balAfter).eq(Big(B_balBefore).minus(Big(expectedFeeEth)).minus(Big(transferAmountEth))), 'unexpected fee payer currency balance after transfer');
    });

    it(`fees (ledger) - should allow a ledger fee-capped transfer from B with otherwise insufficient ccy to cover fees (ledger fee on B, global fee on A)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];

        // 102,999,999 tons
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,        CONST.oneEth_wei,  B, 'TEST');

        // set global fee structure NATURE (A)
        const globalFeeFix = 0;
        const globalFeeBps = 1000; // 10%
        const globalFeeMax = 50; // cap 50 kg
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: globalFeeFix, fee_percBips: globalFeeBps, fee_min: 0, fee_max: globalFeeMax } );

        // set ledger fee structure ETH (B)
        const ledgerFeeFix = 0;
        const ledgerFeeBps = 2000; // 20%
        const ledgerFeeMax = CONST.tenthEth_wei;
        await stm.setFee_CcyType(CONST.ccyType.ETH, B, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: ledgerFeeFix, fee_percBips: ledgerFeeBps, fee_min: 0, fee_max: ledgerFeeMax } );

        // A - carbon transfer amount & expected global fee
        const transferAmountTokQty = new BN(950);
        const expectedFeeTokQty = Math.min(Math.floor(Number(transferAmountTokQty.toString()) * (globalFeeBps/10000)) + Number(globalFeeFix), globalFeeMax);

        // B - ccy transfer amount & exepcted ledger fee
        const transferAmountEth = web3.utils.toWei("0.9", "ether"); // not enough ETH for this trade, without the fee cap
        const expectedFeeEth = Math.min(Math.floor(Number(transferAmountEth.toString()) * (ledgerFeeBps/10000)) + Number(ledgerFeeFix), ledgerFeeMax);

        const data = await transferHelper.transferLedger({ stm, accounts, 
            ledger_A: A,                                   ledger_B: B,
               qty_A: transferAmountTokQty,             tokTypeId_A: CONST.tokenType.TOK_T2,
               qty_B: 0,                                tokTypeId_B: 0,
        ccy_amount_A: 0,                                ccyTypeId_A: 0,
        ccy_amount_B: transferAmountEth,                ccyTypeId_B: CONST.ccyType.ETH,
           applyFees: true,
        });

        // contract owner has received expected token fee
        const owner_balBeforeTokQty = data.owner_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfterTokQty  =  data.owner_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfterTokQty).eq(Big(owner_balBeforeTokQty).plus(Big(expectedFeeTokQty))), 'unexpected fee receiver token balance after transfer');
        
        // carbon sender has sent expected carbon quantity and paid exepcted token fee
        const A_balBefore = data.ledgerA_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(expectedFeeTokQty)).minus(Big(transferAmountTokQty))), 'unexpected fee payer token balance after transfer');

        // contract owner has received expected ccy fee
        const owner_balBeforeCcy = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfterCcy  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfterCcy).eq(Big(owner_balBeforeCcy).plus(Big(expectedFeeEth))), 'unexpected fee receiver currency balance after transfer');

        // ccy sender has send expected ccy amount and paid expected ccy fee
        const B_balBefore = data.ledgerB_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const B_balAfter  =  data.ledgerB_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(B_balAfter).eq(Big(B_balBefore).minus(Big(expectedFeeEth)).minus(Big(transferAmountEth))), 'unexpected fee payer currency balance after transfer');
    });

    it(`fees (ledger) - should not allow a transfer with insufficient carbon to cover collared ledger fee (fee on B)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];

        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,        CONST.oneEth_wei,        A, 'TEST');
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      B, CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set fee structure NATURE (B): 1% + 1kg, min 101kg
        const feeBps = 100; 
        const feeFix = 1000;
        const feeMin = 101000;
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, B, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: feeFix, fee_percBips: feeBps, fee_min: feeMin, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH,      A,              CONST.nullFees);
        await stm.setFee_CcyType(CONST.ccyType.ETH,      CONST.nullAddr, CONST.nullFees);

        try {
            const transferAmountTokQty = new BN(900000);
            const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: 0,                                tokTypeId_A: 0,
                   qty_B: transferAmountTokQty,             tokTypeId_B: CONST.tokenType.TOK_T2,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
            });
        }
        catch (ex) {
            assert(ex.reason == 'Insufficient tokens B', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`fees (ledger) - should not allow a transfer with insufficient carbon to cover collared ledger fee (fee on A)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 1];

        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH, CONST.oneEth_wei,        B, 'TEST');

        // set fee structure NATURE (A): 1% + 1kg, min 101kg
        const feeBps = 100; 
        const feeFix = 1000;
        const feeMin = 101000;
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, A, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: feeFix, fee_percBips: feeBps, fee_min: feeMin, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH,      B,              CONST.nullFees);
        await stm.setFee_CcyType(CONST.ccyType.ETH,      CONST.nullAddr, CONST.nullFees);

        try {
            const transferAmountTokQty = new BN(900000);
            const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: transferAmountTokQty,             tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                tokTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
            });
        }
        catch (ex) { 
            assert(ex.reason == 'Insufficient tokens A', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
});