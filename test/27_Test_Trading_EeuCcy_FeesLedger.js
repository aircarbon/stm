const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');
const helper = require('../test/transferHelper.js');
const BN = require('bn.js');
const Big = require('big.js');

contract("StMaster", accounts => {
    var stm;

    beforeEach(async () => {
        stm = await st.deployed();
        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${stm.address} (owner: ${accounts[0]}) - getSecTokenBatchCount: ${(await stm.getSecTokenBatchCount.call()).toString()}`);
    });

    // EEU MULTI FEES: LEDGER OVERRIDE
    /*it('trading fees (ledger) - apply VCS carbon ledger override fee 1000 BP + 5 KG fixed (cap 10 KG) on a small trade (fee on A)', async () => {
        const A = accounts[global.accountNdx + 0];
        const B = accounts[global.accountNdx + 1];
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      A, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        B,         { from: accounts[0] });

        // set global fee structure (zero)
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        // set ledger fee structure VCS for A: 10% + 5 KG, CAP 10 KG
        const feeBps = 1000; 
        const feeFix = 5;
        const feeCap = 10;
        const setEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, A, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: 0, fee_max: feeCap } );
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_PercBips == feeBps && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == feeFix && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokMax', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_Max == feeCap && ev.ledgerOwner == A);
        assert(await stm.ledgerFee_tokType_Fix(CONST.tokenType.VCS, A) == feeFix, 'unexpected carbon fixed fee after setting ledger fee structure');
        assert(await stm.ledgerFee_tokType_Bps(CONST.tokenType.VCS, A) == feeBps, 'unexpected carbon bps fee after setting ledger fee structure');
        assert(await stm.ledgerFee_tokType_Max(CONST.tokenType.VCS, A) == feeCap, 'unexpected carbon max fee after setting ledger fee structure');

        // set different (irrelevant) ledger fee UNFCC for A
        await stm.setFee_TokType(CONST.tokenType.UNFCCC, A, { fee_fixed: feeFix+1, fee_percBips: feeBps+1, fee_min: 0, fee_max: feeCap+1 } );

        // transfer, with fee structure applied
        const transferAmountKg = new BN(100); // 100 kg
        const expectedFeeKg = Math.min(Math.floor(Number(transferAmountKg.toString()) * (feeBps/10000)) + feeFix, feeCap);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: transferAmountKg,               tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // contract owner has received expected carbon fees
        const owner_balBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeKg))), 'unexpected fee receiver currency balance after transfer');
        
        // sender has sent expected quantity and fees
        const A_balBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(expectedFeeKg)).minus(Big(transferAmountKg))), 'unexpected fee payer currency balance after transfer');
    });

    it('trading fees (ledger) - apply then clear VCS carbon ledger override fee 1000 BP + 5 KG fixed (cap 10 KG) on a small trade (fee on A)', async () => {
        const A = accounts[global.accountNdx + 0];
        const B = accounts[global.accountNdx + 1];
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      A, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        B,         { from: accounts[0] });

        // set global fee structure (non-zero)
        const globalFeeBps = 100, globalFeeFix = 1, globalFeeCap = 5;
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: globalFeeFix, fee_percBips: globalFeeBps, fee_min: 0, fee_max: globalFeeCap } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: 0,            fee_percBips: 0,            fee_min: 0, fee_max: 0 } );

        // set ledger fee structure VCS for A: 10% + 5 KG, CAP 10 KG
        var feeBps = 1000; 
        var feeFix = 5;
        var feeCap = 10;
        await stm.setFee_TokType(CONST.tokenType.VCS, A, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: 0, fee_max: feeCap } );

        // clear ledger fee VCS for A (zero)
        feeBps = 0;
        feeFix = 0;
        feeCap = 0;
        const clearEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, A, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: 0, fee_max: feeCap } );
        truffleAssert.eventEmitted(clearEeuFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_PercBips == feeBps && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(clearEeuFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == feeFix && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(clearEeuFeeTx, 'SetFeeTokMax', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_Max == feeCap && ev.ledgerOwner == A);
        assert(await stm.ledgerFee_tokType_Fix(CONST.tokenType.VCS, A) == feeFix, 'unexpected carbon fixed fee after clearing ledger fee structure');
        assert(await stm.ledgerFee_tokType_Bps(CONST.tokenType.VCS, A) == feeBps, 'unexpected carbon bps fee after clearing ledger fee structure');
        assert(await stm.ledgerFee_tokType_Max(CONST.tokenType.VCS, A) == feeCap, 'unexpected carbon max fee after clearing ledger fee structure');

        // set different (irrelevant) ledger fee UNFCC for A
        await stm.setFee_TokType(CONST.tokenType.UNFCCC, A, { fee_fixed: feeFix+1, fee_percBips: feeBps+1, fee_min: 0, fee_max: feeCap+1 } );

        // transfer, with fee structure applied - expect global fee structure
        const transferAmountKg = new BN(100); // 100 kg
        const expectedFeeKg = Math.min(Math.floor(Number(transferAmountKg.toString()) * (globalFeeBps/10000)) + globalFeeFix, globalFeeCap);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: transferAmountKg,               tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // contract owner has received expected carbon fees
        const owner_balBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeKg))), 'unexpected fee receiver currency balance after transfer');
        
        // sender has sent expected quantity and fees
        const A_balBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(expectedFeeKg)).minus(Big(transferAmountKg))), 'unexpected fee payer currency balance after transfer');
    });

    it('trading fees (ledger) - apply VCS carbon ledger override fee 1000 BP + 1000 KG fixed (collar 100m tons), on a large (0.5 GT) trade (fee on B)', async () => {
        const A = accounts[global.accountNdx + 0];
        const B = accounts[global.accountNdx + 1];

        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        A,         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.gtCarbon, 1,       B, [], [], { from: accounts[0] });

        // set global fee structure (zero)
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        // set ledger fee structure VCS on B: 10% + 1000 KG
        const feeBps = 1000; // 1000 bp
        const feeFix = 1000; // 1000 kg
        const feeMin = 100000000000; // 100m tons
        const setEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, B, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: feeMin, fee_max: 0 } );
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, B,   { fee_fixed: 0,      fee_percBips: 0,      fee_min: 0,      fee_max: 0 } );
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_PercBips == feeBps && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == feeFix && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokMin', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_Min == feeMin && ev.ledgerOwner == B);
        assert(await stm.ledgerFee_tokType_Fix(CONST.tokenType.VCS, B) == feeFix, 'unexpected carbon fixed fee after setting ledger fee structure');
        assert(await stm.ledgerFee_tokType_Bps(CONST.tokenType.VCS, B) == feeBps, 'unexpected carbon bps fee after setting ledger fee structure');
        assert(await stm.ledgerFee_tokType_Min(CONST.tokenType.VCS, B) == feeMin, 'unexpected carbon max fee after setting ledger fee structure');

        // set different (irrelevant) ledger fee UNFCC for B
        await stm.setFee_TokType(CONST.tokenType.UNFCCC, B, { fee_fixed: feeFix+1, fee_percBips: feeBps+1, fee_min: feeMin+1, fee_max: 0 } );

        // transfer, with fee structure applied
        const transferAmountKg = new BN(CONST.gtCarbon / 2); // 0.5 giga ton
        const expectedFeeKg = Math.max(Math.floor(Number(transferAmountKg.toString()) * (feeBps/10000)) + feeFix, feeMin);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: 0,                              tokenTypeId_A: 0,
                   qty_B: transferAmountKg,               tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });

        // contract owner has received expected carbon fees
        const owner_balBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeKg))), 'unexpected fee receiver currency balance after transfer');
        
        // sender has sent expected quantity and fees
        const B_balBefore = data.ledgerB_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const B_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(B_balAfter).eq(Big(B_balBefore).minus(Big(expectedFeeKg)).minus(Big(transferAmountKg))), 'unexpected fee payer currency balance after transfer');
    });

    it('trading fees (ledger) - apply then clear VCS carbon ledger override fee 1000 BP + 1000 KG fixed (collar 100m tons), on a large (0.5 GT) trade (fee on B)', async () => {
        const A = accounts[global.accountNdx + 0];
        const B = accounts[global.accountNdx + 1];

        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        A,         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.gtCarbon, 1,       B, [], [], { from: accounts[0] });

        // set global fee structure (non-zero)
        const globalFeeBps = 100, globalFeeFix = 100, globalFeeMin = 1000000000;
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: globalFeeFix, fee_percBips: globalFeeBps, fee_min: globalFeeMin, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: 0,            fee_percBips: 0,            fee_min: 0,            fee_max: 0 } );

        // set ledger fee structure VCS on B: 10% + 1000 KG
        var feeBps = 1000; // 1000 bp
        var feeFix = 1000; // 1000 kg
        var feeMin = 100000000000; // 100m tons
        await stm.setFee_TokType(CONST.tokenType.VCS, B, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: feeMin, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, B,   { fee_fixed: 0,      fee_percBips: 0,      fee_min: 0,      fee_max: 0 } );

        // clear ledger fee structure (zero) on B
        feeBps = 0;
        feeFix = 0;
        feeMin = 0;
        const clearEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, B, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: feeMin, fee_max: 0 } );
        truffleAssert.eventEmitted(clearEeuFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_PercBips == feeBps && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(clearEeuFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == feeFix && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(clearEeuFeeTx, 'SetFeeTokMin', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_Min == feeMin && ev.ledgerOwner == B);
        assert(await stm.ledgerFee_tokType_Fix(CONST.tokenType.VCS, B) == feeFix, 'unexpected carbon fixed fee after clearing ledger fee structure');
        assert(await stm.ledgerFee_tokType_Bps(CONST.tokenType.VCS, B) == feeBps, 'unexpected carbon bps fee after clearing ledger fee structure');
        assert(await stm.ledgerFee_tokType_Min(CONST.tokenType.VCS, B) == feeMin, 'unexpected carbon max fee after clearing ledger fee structure');

        // set different (irrelevant) ledger fee UNFCC for B
        await stm.setFee_TokType(CONST.tokenType.UNFCCC, B, { fee_fixed: feeFix+1, fee_percBips: feeBps+1, fee_min: feeMin+1, fee_max: 0 } );

        // transfer, with fee structure applied - expect global fee structure
        const transferAmountKg = new BN(CONST.gtCarbon / 2); // 0.5 giga ton
        const expectedFeeKg = Math.max(Math.floor(Number(transferAmountKg.toString()) * (globalFeeBps/10000)) + globalFeeFix, globalFeeMin);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: 0,                              tokenTypeId_A: 0,
                   qty_B: transferAmountKg,               tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });

        // contract owner has received expected carbon fees
        const owner_balBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeKg))), 'unexpected fee receiver currency balance after transfer');
        
        // sender has sent expected quantity and fees
        const B_balBefore = data.ledgerB_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const B_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(B_balAfter).eq(Big(B_balBefore).minus(Big(expectedFeeKg)).minus(Big(transferAmountKg))), 'unexpected fee payer currency balance after transfer');
    });

    // CCY MULTI FEES: LEDGER OVERRIDE
    it('trading fees (ledger) - apply ETH ccy override fee 2500 BP + 0.01 ETH fixed (collar 0.2 ETH), on a small trade (fee on A)', async () => {
        const A = accounts[global.accountNdx + 0];
        const B = accounts[global.accountNdx + 1];
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        A,         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      B, [], [], { from: accounts[0] });

        // set global fee structure (zero)
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        // set ledger fee structure ETH for A: 25% + 0.01 ETH, cap 0.02 ETH
        const ethFeeBps = 2500;
        const ethFeeFix = CONST.hundredthEth_wei;
        const ethFeeMin = (CONST.hundredthEth_wei * 20).toFixed();
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, A,   { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: ethFeeMin, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeeBps && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFix && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyMin', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Min == ethFeeMin && ev.ledgerOwner == A);
        assert(await stm.ledgerFee_ccyType_Bps(CONST.ccyType.ETH, A) == ethFeeBps, 'unexpected ETH percentage fee after setting ETH fee structure');
        assert(await stm.ledgerFee_ccyType_Fix(CONST.ccyType.ETH, A) == ethFeeFix, 'unexpected ETH fixed fee after setting ETH fee structure');
        assert(await stm.ledgerFee_ccyType_Min(CONST.ccyType.ETH, A) == ethFeeMin, 'unexpected ETH min fee after setting ETH fee structure');

        // set different (irrelevant) ledger fee USD for A
        await stm.setFee_CcyType(CONST.ccyType.USD, A, { fee_fixed: ethFeeFix+1, fee_percBips: ethFeeBps+1, fee_min: ethFeeMin+1, fee_max: 0 } );

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.tenthEth_wei);
        const expectedFeeCcy = Math.max(Math.floor(Number(transferAmountCcy.toString()) * (ethFeeBps/10000)) + Number(ethFeeFix), ethFeeMin);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                                        ledger_B: B,
                   qty_A: 0,                                                   tokenTypeId_A: 0,
                   qty_B: 750,                                                 tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: transferAmountCcy,                                     ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                     ccyTypeId_B: 0,
               applyFees: true,
        });

        // contract owner has received expected ccy fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeCcy))), 'unexpected fee receiver currency balance after transfer');

        // fee payer has paid expected ccy fee
        const A_balBefore = data.ledgerA_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(expectedFeeCcy)).minus(Big(transferAmountCcy))), 'unexpected fee payer currency balance after transfer');
    });

    it('trading fees (ledger) - apply then clear ETH ccy override fee 2500 BP + 0.01 ETH fixed (collar 0.2 ETH), on a small trade (fee on A)', async () => {
        const A = accounts[global.accountNdx + 0];
        const B = accounts[global.accountNdx + 1];
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        A,         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      B, [], [], { from: accounts[0] });

        // set global fee structure (non-zero)
        const globalFeeBps = 2500, globalFeeFix = CONST.thousandthEth_wei, globalFeeMin = (CONST.hundredthEth_wei * 10).toFixed();
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: globalFeeFix, fee_percBips: globalFeeBps, fee_min: globalFeeMin, fee_max: 0 } );
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: 0,            fee_percBips: 0,            fee_min: 0,            fee_max: 0 } );

        // set ledger fee structure ETH for A: 25% + 0.01 ETH, cap 0.02 ETH
        var ethFeeBps = 2500;
        var ethFeeFix = CONST.hundredthEth_wei;
        var ethFeeMin = (CONST.hundredthEth_wei * 20).toFixed();
        await stm.setFee_CcyType(CONST.ccyType.ETH, A,   { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: ethFeeMin, fee_max: 0 } );

        // clear ledger fee ETH for A (zero)
        ethFeeBps = 0;
        ethFeeFix = 0;
        ethFeeMin = 0;
        const clearFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, A, { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: ethFeeMin, fee_max: 0 } );
        truffleAssert.eventEmitted(clearFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeeBps && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(clearFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFix && ev.ledgerOwner == A);
        truffleAssert.eventEmitted(clearFeeTx, 'SetFeeCcyMin', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Min == ethFeeMin && ev.ledgerOwner == A);
        assert(await stm.ledgerFee_ccyType_Fix(CONST.ccyType.ETH, A) == ethFeeFix, 'unexpected ccy fixed fee after clearing ledger fee structure');
        assert(await stm.ledgerFee_ccyType_Bps(CONST.ccyType.ETH, A) == ethFeeBps, 'unexpected ccy bps fee after clearing ledger fee structure');
        assert(await stm.ledgerFee_ccyType_Min(CONST.ccyType.ETH, A) == ethFeeMin, 'unexpected ccy min fee after clearing ledger fee structure');

        // set different (irrelevant) ledger fee USD for A
        await stm.setFee_CcyType(CONST.ccyType.USD, A, { fee_fixed: ethFeeFix+1, fee_percBips: ethFeeBps+1, fee_min: ethFeeMin+1, fee_max: 0 } );

        // transfer, with fee structure applied - expect global fee structure
        const transferAmountCcy = new BN(CONST.tenthEth_wei);
        const expectedFeeCcy = Math.max(Math.floor(Number(transferAmountCcy.toString()) * (globalFeeBps/10000)) + Number(globalFeeFix), globalFeeMin);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                                        ledger_B: B,
                   qty_A: 0,                                                   tokenTypeId_A: 0,
                   qty_B: 750,                                                 tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: transferAmountCcy,                                     ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                     ccyTypeId_B: 0,
               applyFees: true,
        });

        // contract owner has received expected ccy fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeCcy))), 'unexpected fee receiver currency balance after transfer');

        // fee payer has paid expected ccy fee
        const A_balBefore = data.ledgerA_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(expectedFeeCcy)).minus(Big(transferAmountCcy))), 'unexpected fee payer currency balance after transfer');
    });

    it('trading fees (ledger) - apply ETH ccy ledger override fee 1000 BP + 1000 ETH fixed (cap 50000 ETH), on a large (500k ETH) trade (fee on B)', async () => {
        const A = accounts[global.accountNdx + 0];
        const B = accounts[global.accountNdx + 1];

        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      A, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.millionEth_wei,    B,         { from: accounts[0] });

        // set global fee structure (zero)
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        // set fee structure ETH on B: 10% + 1000 ETH fixed, cap 50000 ETH
        const ethFeeBps = 1000; // 1000 bp
        const ethFeeFix = CONST.thousandEth_wei; 
        const ethFeeMax = "50000000000000000000000"; // 50k eth
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, B,   { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: 0, fee_max: ethFeeMax } );
        const setEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, B, { fee_fixed: 0,         fee_percBips: 0,         fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeeBps && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFix && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyMax', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Max == ethFeeMax && ev.ledgerOwner == B);
        assert(await stm.ledgerFee_ccyType_Fix(CONST.ccyType.ETH, B) == ethFeeFix, 'unexpected ccy fixed fee after clearing ledger fee structure');
        assert(await stm.ledgerFee_ccyType_Bps(CONST.ccyType.ETH, B) == ethFeeBps, 'unexpected ccy bps fee after clearing ledger fee structure');
        assert(await stm.ledgerFee_ccyType_Max(CONST.ccyType.ETH, B) == ethFeeMax, 'unexpected ccy max fee after clearing ledger fee structure');

        // set different (irrelevant) ledger fee USD for B
        await stm.setFee_CcyType(CONST.ccyType.USD, B, { fee_fixed: ethFeeFix+1, fee_percBips: ethFeeBps+1, fee_min: 0, fee_max: 0 } );

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.millionEth_wei).div(new BN(2)); // 500k
        const expectedFeeCcy = Math.min(Math.floor(Number(transferAmountCcy.toString()) * (ethFeeBps/10000)) + Number(ethFeeFix), ethFeeMax);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                    ledger_B: B,
                   qty_A: 750,                             tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                               tokenTypeId_B: 0,
            ccy_amount_A: 0,                                 ccyTypeId_A: 0,
            ccy_amount_B: transferAmountCcy,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // contract owner has received expected ccy fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeCcy))), 'unexpected fee receiver currency balance after transfer');

        // fee payer has paid expected ccy fee
        const B_balBefore = data.ledgerB_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const B_balAfter  =  data.ledgerB_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(B_balAfter).eq(Big(B_balBefore).minus(Big(expectedFeeCcy)).minus(Big(transferAmountCcy))), 'unexpected fee payer currency balance after transfer');
    });

    it('trading fees (ledger) - apply then clear ETH ccy ledger override fee 1000 BP + 1000 ETH fixed (cap 50000 ETH), on a large (250k ETH) trade (fee on B)', async () => {
        const A = accounts[global.accountNdx + 0];
        const B = accounts[global.accountNdx + 1];

        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      A, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.millionEth_wei,    B,         { from: accounts[0] });

        // set global fee structure (non-zero)
        const globalFeeBps = 100, globalFeeFix = 100, globalFeeMax = 100;
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: globalFeeFix, fee_percBips: globalFeeBps, fee_min: 0, fee_max: globalFeeMax } );
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: 0,            fee_percBips: 0,            fee_min: 0, fee_max: 0 } );

        // set fee structure ETH on B: 10% + 1000 ETH fixed, cap 50000 ETH
        var ethFeeBps = 1000; // 1000 bp
        var ethFeeFix = CONST.thousandEth_wei; 
        var ethFeeMax = "50000000000000000000000"; // 50k eth
        await stm.setFee_CcyType(CONST.ccyType.ETH, B,   { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: 0, fee_max: ethFeeMax } );
        await stm.setFee_TokType(CONST.tokenType.VCS, B, { fee_fixed: 0,         fee_percBips: 0,         fee_min: 0, fee_max: 0 } );

        // clear ledger fee structure (zero) on B
        ethFeeBps = 0;
        ethFeeFix = 0;
        ethFeeMax = 0;
        const clearFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, B, { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: 0, fee_max: ethFeeMax } );
        truffleAssert.eventEmitted(clearFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeeBps && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(clearFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFix && ev.ledgerOwner == B);
        truffleAssert.eventEmitted(clearFeeTx, 'SetFeeCcyMax', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Max == ethFeeMax && ev.ledgerOwner == B);
        assert(await stm.ledgerFee_ccyType_Fix(CONST.ccyType.ETH, B) == ethFeeFix, 'unexpected ccy fixed fee after clearing ledger fee structure');
        assert(await stm.ledgerFee_ccyType_Bps(CONST.ccyType.ETH, B) == ethFeeBps, 'unexpected ccy bps fee after clearing ledger fee structure');
        assert(await stm.ledgerFee_ccyType_Max(CONST.ccyType.ETH, B) == ethFeeMax, 'unexpected ccy max fee after clearing ledger fee structure');

        // set different (irrelevant) ledger fee USD for B
        await stm.setFee_CcyType(CONST.ccyType.USD, B, { fee_fixed: ethFeeFix+1, fee_percBips: ethFeeBps+1, fee_min: 0, fee_max: 0 } );

        // transfer, with fee structure applied - expect global fee structure
        const transferAmountCcy = new BN(CONST.millionEth_wei).div(new BN(4)); // 250k
        const expectedFeeCcy = Math.min(Math.floor(Number(transferAmountCcy.toString()) * (globalFeeBps/10000)) + Number(globalFeeFix), globalFeeMax);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                    ledger_B: B,
                   qty_A: 750,                             tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                               tokenTypeId_B: 0,
            ccy_amount_A: 0,                                 ccyTypeId_A: 0,
            ccy_amount_B: transferAmountCcy,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // contract owner has received expected ccy fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(expectedFeeCcy))), 'unexpected fee receiver currency balance after transfer');

        // fee payer has paid expected ccy fee
        const B_balBefore = data.ledgerB_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const B_balAfter  =  data.ledgerB_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(B_balAfter).eq(Big(B_balBefore).minus(Big(expectedFeeCcy)).minus(Big(transferAmountCcy))), 'unexpected fee payer currency balance after transfer');
    });*/

    // TODO: two-sided: global fee on one side, ledger fee on other - roll these into:

    it('trading fees (ledger) - should allow a ledger fee-capped transfer from A with otherwise insufficient carbon to cover fees (ledger fee on A, global fee on B)', async () => {
        const A = accounts[global.accountNdx + 0];
        const B = accounts[global.accountNdx + 1];

        // 102,999,999 tons
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      A, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        B,         { from: accounts[0] });

        // set ledger fee structure VCS (A): 10% + 50kg, max 50kg
        const ledgerFeeBps = 1000;
        const ledgerFeeFix = 50;
        const ledgerFeeMax = 50; // cap fee: 50 kg
        await stm.setFee_TokType(CONST.tokenType.VCS, A, { fee_fixed: ledgerFeeFix, fee_percBips: ledgerFeeBps, fee_min: 0, fee_max: ledgerFeeMax } );

        // set global fee structure ETH (B): fixed 0.1 ETH
        const globalFeeFix = 0;
        const globalFeeBps = 142;
        const globalFeeMax = CONST.tenthEth_wei;
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr, { fee_fixed: globalFeeFix, fee_percBips: globalFeeBps, fee_min: 0, fee_max: globalFeeMax } );

        // A - carbon transfer amount & exepcted ledger fee
        const transferAmountKg = new BN(950); // not enough carbon for this trade, without the fee cap
        const expectedFeeKg = Math.min(Math.floor(Number(transferAmountKg.toString()) * (ledgerFeeBps/10000)) + Number(ledgerFeeFix), ledgerFeeMax);

        // B - ccy transfer amount & expected global fee
        const transferAmountEth = new BN(CONST.tenthEth_wei);
        const expectedFeeEth = Math.min(Math.floor(Number(transferAmountEth.toString()) * (globalFeeBps/10000)) + Number(globalFeeFix), globalFeeMax);

        const data = await helper.transferLedger({ stm, accounts, 
            ledger_A: A,                                   ledger_B: B,
               qty_A: transferAmountKg,               tokenTypeId_A: CONST.tokenType.VCS,
               qty_B: 0,                              tokenTypeId_B: 0,
        ccy_amount_A: 0,                                ccyTypeId_A: 0,
        ccy_amount_B: transferAmountEth,                ccyTypeId_B: CONST.ccyType.ETH,
           applyFees: true,
        });

        // contract owner has received expected carbon fee
        const owner_balBeforeKg = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfterKg  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfterKg).eq(Big(owner_balBeforeKg).plus(Big(expectedFeeKg))), 'unexpected fee receiver carbon balance after transfer');
        
        // carbon sender has sent expected carbon quantity and paid exepcted carbon fee
        const A_balBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(expectedFeeKg)).minus(Big(transferAmountKg))), 'unexpected fee payer carbon balance after transfer');

        // contract owner has received expected ccy fee
        const owner_balBeforeCcy = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfterCcy  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfterCcy).eq(Big(owner_balBeforeCcy).plus(Big(expectedFeeEth))), 'unexpected fee receiver currency balance after transfer');

        // ccy sender has send expected ccy amount and paid expected ccy fee
        const B_balBefore = data.ledgerB_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const B_balAfter  =  data.ledgerB_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(B_balAfter).eq(Big(B_balBefore).minus(Big(expectedFeeEth)).minus(Big(transferAmountEth))), 'unexpected fee payer currency balance after transfer');
    });

    /*it('trading fees (multi-capcol) - should not allow a transfer with insufficient carbon to cover collared fees (fee on B)', async () => {
        // 102,999,999 tons
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure VCS: 1% + 1kg, min 101kg
        const feeBps = 100; 
        const feeFix = 1;
        const feeMin = 101;
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: feeMin, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: 0,      fee_percBips: 0,      fee_min: 0,      fee_max: 0 } );

        try {
            const transferAmountKg = new BN(900);
            const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                              tokenTypeId_A: 0,
                   qty_B: transferAmountKg,               tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
            });
        }
        catch (ex) { return; }
        assert.fail('expected restriction exception');
    });*/
});