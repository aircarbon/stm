const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');
const helper = require('../test/transferHelper.js');
const BN = require('bn.js');

contract("StMaster", accounts => {
    var stm;

    beforeEach(async () => {
        stm = await st.deployed();
        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${stm.address} (owner: ${accounts[0]}) - getSecTokenBatchCount: ${(await stm.getSecTokenBatchCount.call()).toString()}`);
    });

    // ST MULTI FEES
    it('fees (multi) - apply VCS token fee 100 BP + 1 KG fixed on a small trade (fee on A)', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 1],                         { from: accounts[0] });

        // set fee structure VCS: 1% + 1 KG
        const feeBps = 100; // 100 bp = 1%
        const feeFix = 1;   // 1 kg
        const setEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: 0, fee_max: 0 } );
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   CONST.nullFees);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_PercBips == feeBps && ev.ledgerOwner == CONST.nullAddr);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == feeFix && ev.ledgerOwner == CONST.nullAddr);

        // transfer, with fee structure applied
        const transferAmountKg = new BN(100); // 100 kg
        const expectedFeeKg = Math.floor(Number(transferAmountKg.toString()) * (feeBps/10000)) + feeFix;
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: transferAmountKg,               tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // test contract owner has received expected token fees
        const contractOwner_VcsKgBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwner_VcsKgAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwner_VcsKgAfter == Number(contractOwner_VcsKgBefore) + Number(expectedFeeKg), 'unexpected contract owner (fee receiver) VCS ST tonnage after transfer');
        
        // test sender has sent expected quantity and fees
        const ledgerA_VcsKgBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const ledgerA_VcsKgAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(ledgerA_VcsKgAfter == Number(ledgerA_VcsKgBefore) - Number(expectedFeeKg) - Number(transferAmountKg), 'unexpected ledger A (fee payer) VCS ST tonnage after transfer');
    });

    it('fees (multi) - apply VCS token fee 1000 BP + 1000 KG fixed on a large (0.5 GT) trade (fee on B)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.gtCarbon, 1,       accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });
        
        // set fee structure VCS: 10% + 1000 KG
        const feeBps = 1000; // 1000 bp = 10%
        const feeFix = 1000; // 1000 kg
        const setEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: 0, fee_max: 0 } );
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   CONST.nullFees);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_PercBips == feeBps && ev.ledgerOwner == CONST.nullAddr);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == feeFix && ev.ledgerOwner == CONST.nullAddr);

        // transfer, with fee structure applied
        const transferAmountKg = new BN(CONST.gtCarbon / 2); // 0.5 giga ton
        const expectedFeeKg = Math.floor(Number(transferAmountKg.toString()) * (feeBps/10000)) + feeFix;
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                              tokenTypeId_A: 0,
                   qty_B: transferAmountKg,               tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected token fees
        const contractOwner_VcsKgBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwner_VcsKgAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwner_VcsKgAfter == Number(contractOwner_VcsKgBefore) + Number(expectedFeeKg), 'unexpected contract owner (fee receiver) VCS ST tonnage after transfer');
        
        // test sender has sent expected quantity and fees
        const ledgerB_VcsKgBefore = data.ledgerB_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const ledgerB_VcsKgAfter  =  data.ledgerB_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(ledgerB_VcsKgAfter == Number(ledgerB_VcsKgBefore) - Number(expectedFeeKg) - Number(transferAmountKg), 'unexpected ledger A (fee payer) VCS ST tonnage after transfer');
    });

    // CCY MULTI FEES
    it('fees (multi) - apply ETH ccy fee 100 BP + 0.01 ETH fixed on a small trade (fee on A)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure ETH: 1% + 1 Wei fixed
        const ethFeeBps = 100; // 100 bp = 1%
        const ethFeeFix = CONST.hundredthEth_wei;
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: 0, fee_max: 0 } );
        const setEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, CONST.nullFees);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeeBps && ev.ledgerOwner == CONST.nullAddr);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFix && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Bps(CONST.ccyType.ETH) == ethFeeBps, 'unexpected ETH percentage fee after setting ETH fee structure');
        assert(await stm.globalFee_ccyType_Fix(CONST.ccyType.ETH) == ethFeeFix, 'unexpected ETH fixed fee after setting ETH fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.tenthEth_wei);
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ethFeeBps/10000)) + Number(ethFeeFix);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                          ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                   tokenTypeId_A: 0,
                   qty_B: 750,                                                 tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: transferAmountCcy,                                     ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                     ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) ETH balance after transfer');
    });

    it('fees (multi) - apply ETH ccy fee 1000 BP + 1000 ETH fixed on a large (500k ETH) trade (fee on B)', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.millionEth_wei,    accounts[global.accountNdx + 1],                         { from: accounts[0] });

        // set fee structure ETH: 10% + 1000 ETH fixed
        const ethFeeBps = 1000; // 1000 bp
        const ethFeeFix = CONST.thousandEth_wei;
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: 0, fee_max: 0 } );
        const setEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, CONST.nullFees);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeeBps && ev.ledgerOwner == CONST.nullAddr);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFix && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Bps(CONST.ccyType.ETH) == ethFeeBps, 'unexpected ETH percentage fee after setting ETH fee structure');
        assert(await stm.globalFee_ccyType_Fix(CONST.ccyType.ETH) == ethFeeFix, 'unexpected ETH fixed fee after setting ETH fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.millionEth_wei).div(new BN(2));
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ethFeeBps/10000)) + Number(ethFeeFix);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                          ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 750,                                                 tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                                                   tokenTypeId_B: 0,
            ccy_amount_A: 0,                                                     ccyTypeId_A: 0,
            ccy_amount_B: transferAmountCcy,                                     ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) ETH balance after transfer');
    });

    // CCY + ST MULTI FEES
    it('fees (multi) - apply ETH ccy fee 1000 BP + 1000 ETH fixed, VCS fee 1000 BP + 1000 KG on a large (500k ETH / 0.5GT) trade (fees on both sides)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.millionEth_wei,    accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.gtCarbon, 1,       accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure ETH: 10% + 1000 ETH fixed
        const ethFeeBps = 1000; // 1000 bp 
        const ethFeeFix = CONST.thousandEth_wei;
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeeBps && ev.ledgerOwner == CONST.nullAddr);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFix && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Bps(CONST.ccyType.ETH) == ethFeeBps, 'unexpected ETH percentage fee after setting ETH fee structure');
        assert(await stm.globalFee_ccyType_Fix(CONST.ccyType.ETH) == ethFeeFix, 'unexpected ETH fixed fee after setting ETH fee structure');

        // set fee structure VCS: 10% + 1000 KG fixed
        const eeuFeeBps = 1000; // 1000 bp
        const eeuFeeFix = CONST.tonCarbon;
        const setEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: eeuFeeFix, fee_percBips: eeuFeeBps, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_PercBips == eeuFeeBps);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == eeuFeeFix);

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.millionEth_wei).div(new BN(2));
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ethFeeBps/10000)) + Number(ethFeeFix);

        const transferAmountEeu = new BN(CONST.gtCarbon).div(new BN(2));
        const expectedFeeEeu = Math.floor(Number(transferAmountEeu.toString()) * (eeuFeeBps/10000)) + Number(eeuFeeFix);

        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                          ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                   tokenTypeId_A: 0,
                   qty_B: transferAmountEeu,                                   tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: transferAmountCcy,                                     ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                     ccyTypeId_B: 0,
                applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) ETH balance after transfer');

        // test contract owner has received expected token fees
        const contractOwner_VcsKgBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwner_VcsKgAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwner_VcsKgAfter == Number(contractOwner_VcsKgBefore) + Number(expectedFeeEeu), 'unexpected contract owner (fee receiver) VCS ST tonnage after transfer');
    });

    it('fees (multi) - should not allow a transfer with insufficient ccy (fixed + percentage) to cover fees (fee on A)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   101,                     accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure ETH: 1% + 1 Wei fixed
        const ethFeeBps = 100; // 100 bp = 1%
        const ethFeeFix = 1;
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: 0, fee_max: 0 } );
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, CONST.nullFees);

        try {
            const transferAmountCcy = new BN(100);
            const data = await helper.transferLedger({ stm, accounts, 
                    ledger_A: accounts[global.accountNdx + 0],                          ledger_B: accounts[global.accountNdx + 1],
                       qty_A: 0,                                                   tokenTypeId_A: 0,
                       qty_B: 750,                                                 tokenTypeId_B: CONST.tokenType.VCS,
                ccy_amount_A: transferAmountCcy,                                     ccyTypeId_A: CONST.ccyType.ETH,
                ccy_amount_B: 0,                                                     ccyTypeId_B: 0,
                   applyFees: true,
            });
        }
        catch (ex) { 
            assert(ex.reason == 'Insufficient currency A', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it('fees (multi) - should not allow a transfer with insufficient ccy (fixed + percentage) to cover fees (fee on B)', async () => {
        // 102,000 ETH minus 1 Wei
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,                 accounts[global.accountNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   new BN("101999999999999999999999"), accounts[global.accountNdx + 1],                         { from: accounts[0] });

        // set fee structure: 1% + 1,000 ETH
        const ethFeeBps = 100; 
        const ethFeeFix = "1000000000000000000000";
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: 0, fee_max: 0 } );
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, CONST.nullFees);

        try {
            const transferAmountCcy = new BN("100000000000000000000000"); // 100,000 ETH
            const data = await helper.transferLedger({ stm, accounts, 
                    ledger_A: accounts[global.accountNdx + 0],                          ledger_B: accounts[global.accountNdx + 1],
                       qty_A: 750,                                                 tokenTypeId_A: CONST.tokenType.VCS,
                       qty_B: 0,                                                   tokenTypeId_B: 0,
                ccy_amount_A: 0,                                                     ccyTypeId_A: 0,
                ccy_amount_B: transferAmountCcy,                                     ccyTypeId_B: CONST.ccyType.ETH,
                   applyFees: true,
            });
        }
        catch (ex) { 
            assert(ex.reason == 'Insufficient currency B', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it('fees (multi) - should not allow a transfer with insufficient carbon to cover fees (fee on A)', async () => {
        // 102,999,999 tons
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    102999999999, 1,         accounts[global.accountNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 1],                         { from: accounts[0] });

        // set fee structure VCS: 2% + 1m tons
        const feeBps = 200; 
        const feeFix = 1000000000;
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: 0, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   CONST.nullFees);

        try {
            const transferAmountKg = new BN(100000000000);
            const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: transferAmountKg,               tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
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

    it('fees (multi) - should not allow a transfer with insufficient carbon to cover fees (fee on B)', async () => {
        // 102,999,999 tons
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    102999999999, 1,         accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure VCS: 2% + 1m tons
        const feeBps = 200; 
        const feeFix = 1000000000;
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: 0, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   CONST.nullFees);

        try {
            const transferAmountKg = new BN(100000000000);
            const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                              tokenTypeId_A: 0,
                   qty_B: transferAmountKg,               tokenTypeId_B: CONST.tokenType.VCS,
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
});