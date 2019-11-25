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

    // EEU MULTI FEES
    it('trading fees (multi) - apply VCS carbon fee 100 BP + 1 KG fixed on a small trade (fee on A)', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 1],         { from: accounts[0] });

        // set fee structure VCS: 1% + 1 KG
        const feeBps = 100; // 100 bp = 1%
        const feeFix = 1;   // 1 kg
        const setEeuFeeTx = await stm.setGlobalFee_TokType(CONST.tokenType.VCS, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: 0, fee_max: 0 } );
        const setCcyFeeTx = await stm.setGlobalFee_CcyType(CONST.ccyType.ETH,   { fee_fixed: 0,      fee_percBips: 0,      fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_PercBips == feeBps);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == feeFix);

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

        // test contract owner has received expected carbon fees
        const contractOwner_VcsKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwner_VcsKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwner_VcsKgAfter == Number(contractOwner_VcsKgBefore) + Number(expectedFeeKg), 'unexpected contract owner (fee receiver) VCS EEU tonnage after transfer');
        
        // test sender has sent expected quantity and fees
        const ledgerA_VcsKgBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const ledgerA_VcsKgAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(ledgerA_VcsKgAfter == Number(ledgerA_VcsKgBefore) - Number(expectedFeeKg) - Number(transferAmountKg), 'unexpected ledger A (fee payer) VCS EEU tonnage after transfer');
    });

    it('trading fees (multi) - apply VCS carbon fee 1000 BP + 1000 KG fixed on a large (0.5 GT) trade (fee on A)', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.gtCarbon, 1,       accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 1],         { from: accounts[0] });

        // set fee structure VCS: 10% + 1000 KG
        const feeBps = 1000; // 1000 bp = 10%
        const feeFix = 1000; // 1000 kg
        const setEeuFeeTx = await stm.setGlobalFee_TokType(CONST.tokenType.VCS, { fee_fixed: feeFix, fee_percBips: feeBps, fee_min: 0, fee_max: 0 } );
        const setCcyFeeTx = await stm.setGlobalFee_CcyType(CONST.ccyType.ETH,   { fee_fixed: 0,      fee_percBips: 0,      fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_PercBips == feeBps);
        truffleAssert.eventEmitted(setEeuFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == feeFix);

        // transfer, with fee structure applied
        const transferAmountKg = new BN(CONST.gtCarbon / 2); // 0.5 giga ton
        const expectedFeeKg = Math.floor(Number(transferAmountKg.toString()) * (feeBps/10000)) + feeFix;
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

    // CCY MULTI FEES
    it('trading fees (multi) - apply ETH ccy fee 100 BP + 0.01 ETH fixed on a small trade (fee on A)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure ETH: 1% + 1 Wei fixed
        const ethFeeBps = 100; // 100 bp = 1%
        const ethFeeFix = CONST.hundredthEth_wei;
        const setCcyFeeTx = await stm.setGlobalFee_CcyType(CONST.ccyType.ETH,   { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: 0, fee_max: 0 } );
        const setEeuFeeTx = await stm.setGlobalFee_TokType(CONST.tokenType.VCS, { fee_fixed: 0,         fee_percBips: 0,         fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeeBps);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFix);
        assert(await stm.fee_ccyType_Bps(CONST.ccyType.ETH) == ethFeeBps, 'unexpected ETH percentage fee after setting ETH fee structure');
        assert(await stm.fee_ccyType_Fix(CONST.ccyType.ETH) == ethFeeFix, 'unexpected ETH fixed fee after setting ETH fee structure');

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
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) ETH balance after transfer');
    });

    it('trading fees (multi) - apply ETH ccy fee 1000 BP + 1000 ETH fixed on a large (500m ETH) trade (fee on A)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.millionEth_wei,    accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure ETH: 10% + 1000 ETH fixed
        const ethFeeBps = 1000; // 100 bp = 1%
        const ethFeeFix = CONST.thousandEth_wei;
        const setCcyFeeTx = await stm.setGlobalFee_CcyType(CONST.ccyType.ETH,   { fee_fixed: ethFeeFix, fee_percBips: ethFeeBps, fee_min: 0, fee_max: 0 } );
        const setEeuFeeTx = await stm.setGlobalFee_TokType(CONST.tokenType.VCS, { fee_fixed: 0,         fee_percBips: 0,         fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeeBps);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFix);
        assert(await stm.fee_ccyType_Bps(CONST.ccyType.ETH) == ethFeeBps, 'unexpected ETH percentage fee after setting ETH fee structure');
        assert(await stm.fee_ccyType_Fix(CONST.ccyType.ETH) == ethFeeFix, 'unexpected ETH fixed fee after setting ETH fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.millionEth_wei).div(new BN(2));
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
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) ETH balance after transfer');
    });

    // CCY + EEU MULTI FEES
    // it('trading fees (multi) - apply ETH ccy fee 1000 BP + 1000 ETH fixed, VCS fee 1000 BP + 1000 KG on a large (500m ETH / 0.5GT) trade (fees on both sides)', async () => {
    //     // TODO ... - multi fees on both sides, ccy & carbon
    // });

    // TODO: CCY CAP & COLLARS
    // TODO: EEU CAP & COLLARS

    /*it('trading fees (percentage) - apply ccy fee 50 BP on a trade on a newly added ccy', async () => {
        await stm.addCcyType('TEST_CCY_TYPE', 'TEST_UNIT');
        const types = (await stm.getCcyTypes()).ccyTypes;
        const newCcyTypeId = types.filter(p => p.name == 'TEST_CCY_TYPE')[0].id;

        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await stm.fund(newCcyTypeId,                        1000,                    accounts[global.accountNdx + 1],         { from: accounts[0] });

        // set fee structure on new ccy: 0.5% 
        const feeBips = 50; // 50 bp = 0.5%
        //const setFeeTx = await stm.setFee_CcyType_PercBips(newCcyTypeId, feeBips);
        const setFeeTx = await stm.setGlobalFee_CcyType(newCcyTypeId, { fee_fixed: 0, fee_percBips: feeBips, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == newCcyTypeId && ev.fee_ccy_PercBips == feeBips);
        assert(await stm.fee_ccyType_Bps(newCcyTypeId) == feeBips, 'unexpected new ccy percentage fee after setting fee structure');
        
        // transfer, with fee structure applied
        const transferAmountCcy = new BN(500); // 500 new ccy units
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (feeBips/10000)); // 0.5% of 500 = 2.5 ccy units
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 750,                                            tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                                ccyTypeId_A: 0,
            ccy_amount_B: transferAmountCcy,                                ccyTypeId_B: newCcyTypeId,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log('contractOwnerFeeBalanceBefore', contractOwnerFeeBalanceBefore.toString());
        //console.log('contractOwnerFeeBalanceAfter', contractOwnerFeeBalanceAfter.toString());
        //console.log('expectedFeeCcy', expectedFeeCcy.toString());
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) new ccy balance after transfer');
    });

    // EEU + CCY FEES
    it('trading fees (percentage) - apply ETH ccy & VCS EEU fee on a 0.5 EEU trade (fees on both sides)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure ETH: 100 bp (1%)
        const ccyFeeBips = 100;
        const setCcyFeeTx = await stm.setGlobalFee_CcyType(CONST.ccyType.ETH, { fee_fixed: 0, fee_percBips: ccyFeeBips, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ccyFeeBips);
        assert(await stm.fee_ccyType_Bps(CONST.ccyType.ETH) == ccyFeeBips, 'unexpected ETH basis points fee after setting ETH fee structure');

        // set fee structure VCS: 100 bp (1%)
        const carbonFeeBps = 100;
        const setCarbonFeeTx = await stm.setGlobalFee_TokType(CONST.tokenType.VCS, { fee_fixed: 0, fee_percBips: carbonFeeBps, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_PercBips == carbonFeeBps);
        assert(await stm.fee_tokType_Bps(CONST.tokenType.VCS) == carbonFeeBps, 'unexpected VCS basis points fee after setting VCS fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.tenthEth_wei);
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ccyFeeBips/10000));

        const transferAmountCarbon = new BN(500);
        const expectedFeeCarbon = Math.floor(Number(transferAmountCarbon.toString()) * (carbonFeeBps/10000));

        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                            ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                     tokenTypeId_A: 0,
                   qty_B: transferAmountCarbon,                                  tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: transferAmountCcy,                                       ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                       ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCcy=${expectedFeeCcy}, ccyFeeBips=${ccyFeeBips}, transferAmountCcy=${transferAmountCcy}`);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) ETH balance after transfer');
        
        // test contract owner has received expected carbon VCS fee
        const contractOwnerVcsKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCarbon=${expectedFeeCarbon}, carbonFeeBps=${carbonFeeBps}, transferAmountCarbon=${transferAmountCarbon}`);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore) + Number(expectedFeeCarbon), 'unexpected contract owner (fee receiver) VCS EEU tonnage after transfer');
    });

    it('trading fees (percentage) - should have reasonable gas cost for two-sided USD ccy & UNFCCC EEU transfer (fees on both sides)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure USD: 100 bp (1%)
        const ccyFeeBips = 100;
        const setCcyFeeTx = await stm.setGlobalFee_CcyType(CONST.ccyType.USD, { fee_fixed: 0, fee_percBips: ccyFeeBips, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_PercBips == ccyFeeBips);
        assert(await stm.fee_ccyType_Bps(CONST.ccyType.USD) == ccyFeeBips, 'unexpected USD basis points fee after setting USD fee structure');

        // set fee structure UNFCCC: 100 bp (1%)
        const carbonFeeBps = 100;
        const setCarbonFeeTx = await stm.setGlobalFee_TokType(CONST.tokenType.UNFCCC, { fee_fixed: 0, fee_percBips: carbonFeeBps, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_token_PercBips == carbonFeeBps);
        assert(await stm.fee_tokType_Bps(CONST.tokenType.UNFCCC) == carbonFeeBps, 'unexpected UNFCCC basis points fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.millionUsd_cents / 2);
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ccyFeeBips/10000));

        const transferAmountCarbon = new BN(CONST.tonCarbon / 2);
        const expectedFeeCarbon = Math.floor(Number(transferAmountCarbon.toString()) * (carbonFeeBps/10000));

        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                            ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                     tokenTypeId_A: 0,
                   qty_B: transferAmountCarbon,                                  tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: transferAmountCcy,                                       ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                       ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected USD fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCcy=${expectedFeeCcy}, ccyFeeBips=${ccyFeeBips}, transferAmountCcy=${transferAmountCcy}`);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) USD balance after transfer');
        
        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerCarbonKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerCarbonKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCarbon=${expectedFeeCarbon}, carbonFeeBps=${carbonFeeBps}, transferAmountCarbon=${transferAmountCarbon}`);
        assert(contractOwnerCarbonKgAfter == Number(contractOwnerCarbonKgBefore) + Number(expectedFeeCarbon), 'unexpected contract owner (fee receiver) UNFCCC EEU tonnage after transfer');

        console.log(`\t>>> gasUsed - 0.5 vEEU trade eeu/ccy (A <-> B) w/ fees on both: ${data.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees (percentage) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on ccy)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure USD: 100 bp (1%)
        const ccyFeeBips = 100;
        const setCcyFeeTx = await stm.setGlobalFee_CcyType(CONST.ccyType.USD, { fee_fixed: 0, fee_percBips: ccyFeeBips, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_PercBips == ccyFeeBips);
        assert(await stm.fee_ccyType_Bps(CONST.ccyType.USD) == ccyFeeBips, 'unexpected USD basis points fee after setting USD fee structure');

        // set fee structure UNFCCC: 0 bp (0%)
        const carbonFeeBps = 0;
        const setCarbonFeeTx = await stm.setGlobalFee_TokType(CONST.tokenType.UNFCCC, { fee_fixed: 0, fee_percBips: carbonFeeBps, fee_min: 0, fee_max: 0 } );
        assert(await stm.fee_tokType_Bps(CONST.tokenType.UNFCCC) == carbonFeeBps, 'unexpected UNFCCC basis points fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.millionUsd_cents / 2);
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ccyFeeBips/10000));

        const transferAmountCarbon = new BN(CONST.tonCarbon / 2);
        const expectedFeeCarbon = Math.floor(Number(transferAmountCarbon.toString()) * (carbonFeeBps/10000));

        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                            ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                     tokenTypeId_A: 0,
                   qty_B: transferAmountCarbon,                                  tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: transferAmountCcy,                                       ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                       ccyTypeId_B: 0,
               applyFees: true,
        });
        //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

        // test contract owner has received expected USD fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCcy=${expectedFeeCcy}, ccyFeeBips=${ccyFeeBips}, transferAmountCcy=${transferAmountCcy}`);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) USD balance after transfer');
        
        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerCarbonKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerCarbonKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCarbon=${expectedFeeCarbon}, carbonFeeBps=${carbonFeeBps}, transferAmountCarbon=${transferAmountCarbon}`);
        assert(contractOwnerCarbonKgAfter == Number(contractOwnerCarbonKgBefore) + Number(expectedFeeCarbon), 'unexpected contract owner (fee receiver) UNFCCC EEU tonnage after transfer');

        console.log(`\t>>> gasUsed - 0.5 vEEU trade eeu/ccy (A <-> B) w/ fees on ccy: ${data.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees (percentage) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on eeu)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure USD: 0%
        const ccyFeeBips = 0;
        const setCcyFeeTx = await stm.setGlobalFee_CcyType(CONST.ccyType.USD, { fee_fixed: 0, fee_percBips: ccyFeeBips, fee_min: 0, fee_max: 0 } );
        //truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_PercBips == ccyFeeBips);
        assert(await stm.fee_ccyType_Bps(CONST.ccyType.USD) == ccyFeeBips, 'unexpected USD basis points fee after setting USD fee structure');

        // set fee structure UNFCCC: 10 bp (0.1%)
        const carbonFeeBps = 10;
        const setCarbonFeeTx = await stm.setGlobalFee_TokType(CONST.tokenType.UNFCCC, { fee_fixed: 0, fee_percBips: carbonFeeBps, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_token_PercBips == carbonFeeBps);
        assert(await stm.fee_tokType_Bps(CONST.tokenType.UNFCCC) == carbonFeeBps, 'unexpected UNFCCC basis points fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.millionUsd_cents / 2);
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ccyFeeBips/10000));

        const transferAmountCarbon = new BN(CONST.tonCarbon / 2);
        const expectedFeeCarbon = Math.floor(Number(transferAmountCarbon.toString()) * (carbonFeeBps/10000));

        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                            ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                     tokenTypeId_A: 0,
                   qty_B: transferAmountCarbon,                                  tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: transferAmountCcy,                                       ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                       ccyTypeId_B: 0,
               applyFees: true,
        });
        //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

        // test contract owner has received expected USD fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCcy=${expectedFeeCcy}, ccyFeeBips=${ccyFeeBips}, transferAmountCcy=${transferAmountCcy}`);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) USD balance after transfer');
        
        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerCarbonKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerCarbonKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCarbon=${expectedFeeCarbon}, carbonFeeBps=${carbonFeeBps}, transferAmountCarbon=${transferAmountCarbon}`);
        assert(contractOwnerCarbonKgAfter == Number(contractOwnerCarbonKgBefore) + Number(expectedFeeCarbon), 'unexpected contract owner (fee receiver) UNFCCC EEU tonnage after transfer');

        console.log(`\t>>> gasUsed - 0.5 vEEU trade eeu/ccy (A <-> B) w/ fees on eeu: ${data.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees (percentage) - should round fees to zero for minimal transfers (ccy & carbon)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set % fees to 1bp = 0.01%
        const ccyFeeBips = 1, carbonFeeBps = 1;
        await stm.setGlobalFee_CcyType(CONST.ccyType.USD,      { fee_fixed: 0, fee_percBips: ccyFeeBips,   fee_min: 0, fee_max: 0 } );
        await stm.setGlobalFee_TokType(CONST.tokenType.UNFCCC, { fee_fixed: 0, fee_percBips: carbonFeeBps, fee_min: 0, fee_max: 0 } );

        const transferAmountCcy = new BN(100); // 100 cents
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ccyFeeBips/10000)); // fee on 100 cents @ 0.01% ~= 0 cents

        const transferAmountCarbon = new BN(100); // 1kg
        const expectedFeeCarbon = Math.floor(Number(transferAmountCarbon.toString()) * (carbonFeeBps/10000)); // fee on 100kg @ 0.01% ~= 0 kg

        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                  ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                           tokenTypeId_A: 0,
                   qty_B: transferAmountCarbon,                        tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: transferAmountCcy,                             ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                             ccyTypeId_B: 0,
               applyFees: true,
        });

        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCcy=${expectedFeeCcy}, ccyFeeBips=${ccyFeeBips}, transferAmountCcy=${transferAmountCcy}`);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) USD balance after transfer');
        
        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerCarbonKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerCarbonKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCarbon=${expectedFeeCarbon}, carbonFeeBps=${carbonFeeBps}, transferAmountCarbon=${transferAmountCarbon}`);
        assert(contractOwnerCarbonKgAfter == Number(contractOwnerCarbonKgBefore) + Number(expectedFeeCarbon), 'unexpected contract owner (fee receiver) UNFCCC EEU tonnage after transfer');
    });
    
    it('trading fees (percentage) - should not allow a transfer with insufficient ccy to cover fees', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        await stm.setGlobalFee_CcyType(CONST.ccyType.USD,      { fee_fixed: 0, fee_percBips: 1, fee_min: 0, fee_max: 0 } );
        await stm.setGlobalFee_TokType(CONST.tokenType.UNFCCC, { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        try {
            const data = await helper.transferLedger({ stm, accounts, 
                    ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                       qty_A: 0,                                                             tokenTypeId_A: 0,
                       qty_B: new BN(CONST.tonCarbon),                                       tokenTypeId_B: CONST.tokenType.UNFCCC,
                ccy_amount_A: new BN(CONST.millionUsd_cents),                                  ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
                   applyFees: true,
            });
            //truffleAssert.prettyPrintEmittedEvents(data.transferTx);
        }
        catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('trading fees (percentage) - should not allow a transfer with insufficient carbon to cover fees', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 1,       accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        await stm.setGlobalFee_CcyType(CONST.ccyType.USD,      { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        await stm.setGlobalFee_TokType(CONST.tokenType.UNFCCC, { fee_fixed: 0, fee_percBips: 1, fee_min: 0, fee_max: 0 } );

        try {
            await helper.transferLedger({ stm, accounts, 
                    ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                       qty_A: 0,                                                             tokenTypeId_A: 0,
                       qty_B: new BN(CONST.ktCarbon),                                        tokenTypeId_B: CONST.tokenType.UNFCCC,
                ccy_amount_A: new BN(CONST.millionUsd_cents),                                  ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
                   applyFees: true,
            });
        }
        catch (ex) { return; }
        assert.fail('expected restriction exception');
    });*/
});