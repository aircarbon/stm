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

    // EEU MULTI FEES - CAP & COLLAR
    it('trading fees (multi-capcol) - apply VCS carbon fee 1000 BP + 5 KG fixed (cap 10 KG) on a small trade (fee on A)', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 1],                         { from: accounts[0] });

        // set fee structure VCS: 10% + 5 KG, CAP 10 KG
        const feeBps = 1000; 
        const feeFix = 5;
        const feeCap = 10;
        const setEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: 0, fee_max: feeCap } );
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   CONST.nullFees);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_PercBips == feeBps && ev.ledgerOwner == CONST.nullAddr);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == feeFix && ev.ledgerOwner == CONST.nullAddr);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokMax', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_Max == feeCap && ev.ledgerOwner == CONST.nullAddr);

        // transfer, with fee structure applied
        const transferAmountKg = new BN(100); // 100 kg
        const expectedFeeKg = Math.min(Math.floor(Number(transferAmountKg.toString()) * (feeBps/10000)) + feeFix, feeCap);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: transferAmountKg,               tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // test contract owner has received expected carbon fees
        const contractOwner_VcsKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwner_VcsKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwner_VcsKgAfter == Number(contractOwner_VcsKgBefore) + Number(expectedFeeKg), 'unexpected contract owner (fee receiver) VCS EEU tonnage after transfer');
        
        // test sender has sent expected quantity and fees
        const ledgerA_VcsKgBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const ledgerA_VcsKgAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(ledgerA_VcsKgAfter == Number(ledgerA_VcsKgBefore) - Number(expectedFeeKg) - Number(transferAmountKg), 'unexpected ledger A (fee payer) VCS EEU tonnage after transfer');
    });

    it('trading fees (multi-capcol) - apply VCS carbon fee 1000 BP + 1000 KG fixed (collar 100m tons), on a large (0.5 GT) trade (fee on B)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.gtCarbon, 1,       accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure VCS: 10% + 1000 KG
        const feeBps = 1000; // 1000 bp
        const feeFix = 1000; // 1000 kg
        const feeMin = 100000000000; // 100m tons
        const setEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: feeMin, fee_max: 0 } );
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   CONST.nullFees);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_PercBips == feeBps && ev.ledgerOwner == CONST.nullAddr);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == feeFix && ev.ledgerOwner == CONST.nullAddr);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokMin', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_Min == feeMin && ev.ledgerOwner == CONST.nullAddr);

        // transfer, with fee structure applied
        const transferAmountKg = new BN(CONST.gtCarbon / 2); // 0.5 giga ton
        const expectedFeeKg = Math.max(Math.floor(Number(transferAmountKg.toString()) * (feeBps/10000)) + feeFix, feeMin);
        //console.log('expectedFeeKg', expectedFeeKg.toFixed());
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                              tokenTypeId_A: 0,
                   qty_B: transferAmountKg,               tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected carbon fees
        const contractOwner_VcsKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwner_VcsKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwner_VcsKgAfter == Number(contractOwner_VcsKgBefore) + Number(expectedFeeKg), 'unexpected contract owner (fee receiver) VCS EEU tonnage after transfer');
        
        // test sender has sent expected quantity and fees
        const ledgerB_VcsKgBefore = data.ledgerB_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const ledgerB_VcsKgAfter  =  data.ledgerB_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(ledgerB_VcsKgAfter == Number(ledgerB_VcsKgBefore) - Number(expectedFeeKg) - Number(transferAmountKg), 'unexpected ledger A (fee payer) VCS EEU tonnage after transfer');
    });

    // CCY MULTI FEES - CAP & COLLAR
    it('trading fees (multi-capcol) - apply ETH ccy fee 2500 BP + 0.01 ETH fixed (collar 0.2 ETH), on a small trade (fee on A)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure: 25% + 0.01 ETH, collar 0.02 ETH
        const ethFeeBps = 2500;
        const ethFeeFix = CONST.hundredthEth_wei;
        const ethFeeMin = (CONST.hundredthEth_wei * 20).toFixed();
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: ethFeeMin, fee_max: 0 } );
        const setEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, CONST.nullFees);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeeBps && ev.ledgerOwner == CONST.nullAddr);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFix && ev.ledgerOwner == CONST.nullAddr);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyMin', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Min == ethFeeMin && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Bps(CONST.ccyType.ETH) == ethFeeBps, 'unexpected ETH percentage fee after setting ETH fee structure');
        assert(await stm.globalFee_ccyType_Fix(CONST.ccyType.ETH) == ethFeeFix, 'unexpected ETH fixed fee after setting ETH fee structure');
        assert(await stm.globalFee_ccyType_Min(CONST.ccyType.ETH) == ethFeeMin, 'unexpected ETH min fee after setting ETH fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.tenthEth_wei);
        const expectedFeeCcy = Math.max(Math.floor(Number(transferAmountCcy.toString()) * (ethFeeBps/10000)) + Number(ethFeeFix), ethFeeMin);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                          ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                   tokenTypeId_A: 0,
                   qty_B: 750,                                                 tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: transferAmountCcy,                                     ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                     ccyTypeId_B: 0,
               applyFees: true,
        });
    });

    it('trading fees (multi-capcol) - apply ETH ccy fee 1000 BP + 1000 ETH fixed (cap 50000 ETH), on a large (500k ETH) trade (fee on B)', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.millionEth_wei,    accounts[global.accountNdx + 1],                         { from: accounts[0] });

        // set fee structure ETH: 10% + 1000 ETH fixed, cap 50000 ETH
        const ethFeeBps = 1000; // 1000 bp
        const ethFeeFix = CONST.thousandEth_wei; 
        const ethFeeMax = "50000000000000000000000"; // 50k eth
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: 0, fee_max: ethFeeMax } );
        const setEeuFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, CONST.nullFees);

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.millionEth_wei).div(new BN(2)); // 500k
        const expectedFeeCcy = Math.min(Math.floor(Number(transferAmountCcy.toString()) * (ethFeeBps/10000)) + Number(ethFeeFix), ethFeeMax);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                          ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 750,                                                 tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                                                   tokenTypeId_B: 0,
            ccy_amount_A: 0,                                                     ccyTypeId_A: 0,
            ccy_amount_B: transferAmountCcy,                                     ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });
    });

    it('trading fees (multi-capcol) - should allow a capped transfer with otherwise insufficient carbon to cover fees (fee on A)', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 1],                         { from: accounts[0] });

        // set fee structure VCS: 10% + 50kg, cap 50kg
        const feeBps = 1000; 
        const feeFix = 50;
        const feeMax = 50; // cap fee: 50 kg
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: 0, fee_max: feeMax } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   CONST.nullFees);

        const transferAmountKg = new BN(950); // not enough carbon for this trade, without the fee cap
        const data = await helper.transferLedger({ stm, accounts, 
            ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
               qty_A: transferAmountKg,               tokenTypeId_A: CONST.tokenType.VCS,
               qty_B: 0,                              tokenTypeId_B: 0,
        ccy_amount_A: 0,                                ccyTypeId_A: 0,
        ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
           applyFees: true,
        });
    });

    it('trading fees (multi-capcol) - should not allow a transfer with insufficient currency to cover collared fees (fee on A)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   "1000",                  accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure: 1% + 1 Wei, min 101 Wei
        const ethFeeBps = 100;
        const ethFeeFix = 1;
        const ethFeeMin = 101;
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: ethFeeMin, fee_max: 0 } );
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, CONST.nullFees);

        // transfer, with fee structure applied
        try {
            const transferAmountCcy = new BN(900);
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

    it('trading fees (multi-capcol) - should not allow a transfer with insufficient carbon to cover collared fees (fee on B)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure VCS: 1% + 1kg, min 101kg
        const feeBps = 100; 
        const feeFix = 1;
        const feeMin = 101;
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: feeMin, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   CONST.nullFees);

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
        catch (ex) { 
            assert(ex.reason == 'Insufficient tokens B', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
});