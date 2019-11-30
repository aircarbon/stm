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

    // EEU FEES
    it('trading fees (fixed) - apply VCS carbon fee on a trade (fee on A)', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], CONST.nullOrigFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 1],         { from: accounts[0] });

        // set fee structure VCS: 2 KG carbon fixed
        const carbonKgFixedFee = 2;
        assert(await stm.globalFee_tokType_Fix(CONST.tokenType.VCS) == 0, 'unexpected VCS fixed KG fee before setting VCS fee structure');
        const setFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: carbonKgFixedFee, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == carbonKgFixedFee && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_tokType_Fix(CONST.tokenType.VCS) == carbonKgFixedFee, 'unexpected VCS fixed KG fee after setting VCS fee structure');
        assert(await stm.globalFee_tokType_Fix(CONST.tokenType.UNFCCC) == 0, 'unexpected UNFCCC fixed KG fee after setting VCS fee structure');

        // transfer, with fee structure applied
        const carbonKgTransferAmount = 750;
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: carbonKgTransferAmount,         tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // test contract owner has received expected carbon VCS fee
        const contractOwner_VcsKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwner_VcsKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`accountNdx=${global.accountNdx} contractOwner_VcsKgBefore`, contractOwner_VcsKgBefore);
        //console.log(`accountNdx=${global.accountNdx} contractOwner_VcsKgAfter`, contractOwner_VcsKgAfter);
        assert(contractOwner_VcsKgAfter == Number(contractOwner_VcsKgBefore) + Number(carbonKgFixedFee), 'unexpected contract owner (fee receiver) VCS EEU tonnage after transfer');
        
        // fees are *additional* to the supplied transfer KGs...
        const ledgerA_VcsKgBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const ledgerA_VcsKgAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`accountNdx=${global.accountNdx} ledgerA_VcsKgBefore`, ledgerA_VcsKgBefore);
        //console.log(`accountNdx=${global.accountNdx} ledgerA_VcsKgAfter`, ledgerA_VcsKgAfter);
        assert(ledgerA_VcsKgAfter == Number(ledgerA_VcsKgBefore) - Number(carbonKgFixedFee) - Number(carbonKgTransferAmount), 'unexpected ledger A (fee payer) VCS EEU tonnage after transfer');
    });

    it('trading fees (fixed) - apply UNFCCC carbon fee on a trade (fee on B)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullOrigFees, [], [], { from: accounts[0] });

        // set fee structure UNFCCC: 1 KG carbon fixed, VCS: no fee
        const unfccFixedFee = 2;
        //const setUnfccFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, unfccFixedFee);
        //const setVcsFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.VCS, 0);
        const setUnfccFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: unfccFixedFee, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        const setVcsFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr,      { fee_fixed: 0,             fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUnfccFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfccFixedFee && ev.ledgerOwner == CONST.nullAddr);

        assert(await stm.globalFee_tokType_Fix(CONST.tokenType.UNFCCC) == unfccFixedFee, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');
        assert(await stm.globalFee_tokType_Fix(CONST.tokenType.VCS) == 0, 'unexpected VCS fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                              tokenTypeId_A: 0,
                   qty_B: 750,                            tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerUnfcccKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerUnfcccKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerUnfcccKgAfter == Number(contractOwnerUnfcccKgBefore) + Number(unfccFixedFee), 'unexpected contract owner (fee receiver) UNFCCC EEU tonnage after transfer');

        // test contract owner has unchanged VCS balance (i.e. no VCS fees received)
        const contractOwnerVcsKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore), 'unexpected contract owner (fee receiver) VCS EEU tonnage after transfer');
    });

    it('trading fees (fixed) - apply large (>1 batch EEU size) carbon fee on a trade on a newly added EEU type', async () => {
        await stm.addSecTokenType('TEST_EEU_TYPE');
        const types = (await stm.getSecTokenTypes()).tokenTypes;
        const newTypeId = types.filter(p => p.name == 'TEST_EEU_TYPE')[0].id;

        await stm.mintSecTokenBatch(newTypeId, 1000, 1,                            accounts[global.accountNdx + 0], CONST.nullOrigFees, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(newTypeId, 1000, 1,                            accounts[global.accountNdx + 0], CONST.nullOrigFees, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(newTypeId, 1000, 1,                            accounts[global.accountNdx + 0], CONST.nullOrigFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,        accounts[global.accountNdx + 1],         { from: accounts[0] });

        // set fee structure new EEU type: 1500 KG carbon fixed (1.5 EEUs, 2 batches)
        const newSecTokenTypeFixedFee = 1500;
        const setFeeTx = await stm.setFee_TokType(newTypeId, CONST.nullAddr, { fee_fixed: newSecTokenTypeFixedFee, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == newTypeId && ev.fee_tokenQty_Fixed == newSecTokenTypeFixedFee && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_tokType_Fix(newTypeId) == newSecTokenTypeFixedFee, 'unexpected new EEU type fixed KG fee after setting fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 1,                              tokenTypeId_A: newTypeId,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // test contract owner has received expected new EEU type carbon fee
        const owner_balBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == newTypeId).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == newTypeId).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(newSecTokenTypeFixedFee), 'unexpected contract owner (fee receiver) new EEU type tonnage after transfer');
    });

    // CCY FEES
    it('trading fees (fixed) - apply ETH ccy fee on a max. trade (fee on A)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullOrigFees, [], [], { from: accounts[0] });

        // set fee structure ETH: 1000 Wei fixed
        const ethFeeFixed_Wei = 1000;
        assert(await stm.globalFee_ccyType_Fix(CONST.ccyType.ETH) == 0, 'unexpected ETH fixed Wei fee before setting ETH fee structure');
        //const setFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.ETH, ethFeeFixed_Wei);
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr, { fee_fixed: ethFeeFixed_Wei, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFixed_Wei && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Fix(CONST.ccyType.ETH) == ethFeeFixed_Wei, 'unexpected ETH fixed Wei fee after setting ETH fee structure');
        assert(await stm.globalFee_ccyType_Fix(CONST.ccyType.USD) == 0, 'unexpected USD fixed cents fee after setting ETH fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                          ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                   tokenTypeId_A: 0,
                   qty_B: 750,                                                 tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: new BN(CONST.oneEth_wei).sub(new BN(ethFeeFixed_Wei)), ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                     ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(ethFeeFixed_Wei), 'unexpected contract owner (fee receiver) ETH balance after transfer');
    });

    it('trading fees (fixed) - apply USD ccy fee on a max. trade (fee on B)', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], CONST.nullOrigFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 1],         { from: accounts[0] });

        // set fee structure USD: 1000 $ in cents
        const usdFeeFixed_cents = CONST.thousandUsd_cents;
        //const setFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_Fixed == usdFeeFixed_cents && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Fix(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 750,                                                           tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                                                             tokenTypeId_B: 0,
            ccy_amount_A: 0,                                                               ccyTypeId_A: 0,
            ccy_amount_B: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_B: CONST.ccyType.USD,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(usdFeeFixed_cents), 'unexpected contract owner (fee receiver) USD balance after transfer');
    });

    it('trading fees (fixed) - apply ccy fee on a max. trade on a newly added ccy', async () => {
        await stm.addCcyType('TEST_CCY_TYPE', 'TEST_UNIT');
        const types = (await stm.getCcyTypes()).ccyTypes;
        const newCcyTypeId = types.filter(p => p.name == 'TEST_CCY_TYPE')[0].id;

        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], CONST.nullOrigFees, [], [], { from: accounts[0] });
        await stm.fund(newCcyTypeId,                        1000,                    accounts[global.accountNdx + 1],         { from: accounts[0] });

        // set fee structure new ccy: 100 units
        const newCcyFeeFixed_units = 100;
        const setFeeTx = await stm.setFee_CcyType(newCcyTypeId, CONST.nullAddr, { fee_fixed: newCcyFeeFixed_units, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == newCcyTypeId && ev.fee_ccy_Fixed == newCcyFeeFixed_units && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Fix(newCcyTypeId) == newCcyFeeFixed_units, 'unexpected new currency fixed fee after setting fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 750,                                            tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                                ccyTypeId_A: 0,
            ccy_amount_B: new BN(1000).sub(new BN(newCcyFeeFixed_units)),   ccyTypeId_B: newCcyTypeId,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(newCcyFeeFixed_units), 'unexpected contract owner (fee receiver) new ccy balance after transfer');
    });

    // EEU + CCY FEES
    it('trading fees (fixed) - apply ETH ccy & VCS EEU fee on a max. trade (fees on both sides)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullOrigFees, [], [], { from: accounts[0] });

        // set fee structure ETH: 1000 Wei fixed
        const ethFeeFixed_Wei = 1000;
        //const setEthFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.ETH, ethFeeFixed_Wei);
        const setEthFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr, { fee_fixed: ethFeeFixed_Wei, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setEthFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFixed_Wei && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Fix(CONST.ccyType.ETH) == ethFeeFixed_Wei, 'unexpected ETH fixed Wei fee after setting ETH fee structure');

        // set fee structure VCS: 10 KG fixed
        const vcsKgFeeFixed = 10;
        assert(await stm.globalFee_tokType_Fix(CONST.tokenType.VCS) == 0, 'unexpected VCS fixed KG fee before setting VCS fee structure');
        //const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.VCS, vcsKgFeeFixed);
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: vcsKgFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == vcsKgFeeFixed && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_tokType_Fix(CONST.tokenType.VCS) == vcsKgFeeFixed, 'unexpected VCS fixed KG fee after setting VCS fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                            ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                     tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(vcsKgFeeFixed)),    tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: new BN(CONST.oneEth_wei).sub(new BN(ethFeeFixed_Wei)),   ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                       ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(ethFeeFixed_Wei), 'unexpected contract owner (fee receiver) ETH balance after transfer');
        
        // test contract owner has received expected carbon VCS fee
        const contractOwnerVcsKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore) + Number(vcsKgFeeFixed), 'unexpected contract owner (fee receiver) VCS EEU tonnage after transfer');
    });

    it('trading fees (fixed) - apply USD ccy & UNFCCC EEU fee on a max. trade (fees on both sides)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullOrigFees, [], [], { from: accounts[0] });

        // set fee structure USD: 100 cents
        const usdFeeFixed_cents = CONST.oneUsd_cents;
        //const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        const setUsdFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_Fixed == usdFeeFixed_cents && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Fix(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 42 KG fixed
        const unfcccKgFeeFixed = 42;
        //const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, unfcccKgFeeFixed);
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: unfcccKgFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfcccKgFeeFixed && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_tokType_Fix(CONST.tokenType.UNFCCC) == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected USD fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(usdFeeFixed_cents), 'unexpected contract owner (fee receiver) USD balance after transfer');
        
        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerVcsKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore) + Number(unfcccKgFeeFixed), 'unexpected contract owner (fee receiver) UNFCCC EEU tonnage after transfer');    
    });

    it('trading fees (fixed) - apply newly added ccy & newly added EEU type fee on a max. trade (fees on both sides)', async () => {
        await stm.addCcyType('TEST_CCY_TYPE_2', 'TEST_UNIT');
        const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        const newCcyTypeId = ccyTypes.filter(p => p.name == 'TEST_CCY_TYPE_2')[0].id;

        await stm.addSecTokenType('TEST_EEU_TYPE_2');
        const tokenTypes = (await stm.getSecTokenTypes()).tokenTypes;
        const newSecTokenTypeId = tokenTypes.filter(p => p.name == 'TEST_EEU_TYPE_2')[0].id;

        await stm.fund(newCcyTypeId,                           1000,                    accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(newSecTokenTypeId,         CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullOrigFees, [], [], { from: accounts[0] });

        // set fee structure new ccy
        const ccyFeeFixed_units = 10;
        const setCcyFeeTx = await stm.setFee_CcyType(newCcyTypeId, CONST.nullAddr, { fee_fixed: ccyFeeFixed_units, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == newCcyTypeId && ev.fee_ccy_Fixed == ccyFeeFixed_units && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Fix(newCcyTypeId) == ccyFeeFixed_units, 'unexpected new ccy fixed fee after setting ccy fee structure');

        // set fee structure new EEU type: 1 KG
        const newSecTokenTypeKgFeeFixed = 1;
        const setCarbonFeeTx = await stm.setFee_TokType(newSecTokenTypeId, CONST.nullAddr, { fee_fixed: newSecTokenTypeKgFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == newSecTokenTypeId && ev.fee_tokenQty_Fixed == newSecTokenTypeKgFeeFixed && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_tokType_Fix(newSecTokenTypeId) == newSecTokenTypeKgFeeFixed, 'unexpected new eeu type fixed KG fee after setting eeu fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                                         ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                                  tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(newSecTokenTypeKgFeeFixed)),     tokenTypeId_B: newSecTokenTypeId,
            ccy_amount_A: new BN(1000).sub(new BN(ccyFeeFixed_units)),                          ccyTypeId_A: newCcyTypeId,
            ccy_amount_B: 0,                                                                    ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected ccy fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(ccyFeeFixed_units), 'unexpected contract owner (fee receiver) newly added ccy balance after transfer');
        
        // test contract owner has received expected carbon fee
        const contractOwnerSecTokenKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == newSecTokenTypeId).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerSecTokenKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == newSecTokenTypeId).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerSecTokenKgAfter == Number(contractOwnerSecTokenKgBefore) + Number(newSecTokenTypeKgFeeFixed), 'unexpected contract owner (fee receiver) newly added EEU type tonnage after transfer');    
    });

    it('trading fees (fixed) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fees on both sides)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullOrigFees, [], [], { from: accounts[0] });

        // set fee structure USD: 100 cents
        const usdFeeFixed_cents = CONST.oneUsd_cents;
        //const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        const setUsdFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_Fixed == usdFeeFixed_cents && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Fix(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 10 KG fixed
        const unfcccKgFeeFixed = 10;
        //const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, unfcccKgFeeFixed);
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: unfcccKgFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfcccKgFeeFixed) && ev.ledgerOwner == CONST.nullAddr;
        assert(await stm.globalFee_tokType_Fix(CONST.tokenType.UNFCCC) == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const tradeTx = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        console.log(`\t>>> gasUsed - 1.0 vEEU trade eeu/ccy (A <-> B) w/ fees on both: ${tradeTx.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees (fixed) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on ccy)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullOrigFees, [], [], { from: accounts[0] });

        // set fee structure USD: 100 cents
        const usdFeeFixed_cents = CONST.oneUsd_cents;
        const setUsdFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_Fixed == usdFeeFixed_cents && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Fix(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 0 KG fixed
        const unfcccKgFeeFixed = 0;
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: unfcccKgFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        //truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfcccKgFeeFixed);
        assert(await stm.globalFee_tokType_Fix(CONST.tokenType.UNFCCC) == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const tradeTx = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });
        //truffleAssert.prettyPrintEmittedEvents(tradeTx.transferTx);

        console.log(`\t>>> gasUsed - 1.0 vEEU trade eeu/ccy (A <-> B) w/ fees on ccy: ${tradeTx.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees (fixed) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on eeu)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullOrigFees, [], [], { from: accounts[0] });

        // set fee structure USD: 0 cents
        const usdFeeFixed_cents = CONST.oneUsd_cents;
        //const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        const setUsdFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_Fixed == usdFeeFixed_cents) && ev.ledgerOwner == CONST.nullAddr;
        assert(await stm.globalFee_ccyType_Fix(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 10 KG fixed
        const unfcccKgFeeFixed = 10;
        //const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, unfcccKgFeeFixed);
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: unfcccKgFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfcccKgFeeFixed && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_tokType_Fix(CONST.tokenType.UNFCCC) == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const tradeTx = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        console.log(`\t>>> gasUsed - 1.0 vEEU trade eeu/ccy (A <-> B) w/ fees on eeu: ${tradeTx.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees (fixed) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (base gas cost: no fees)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullOrigFees, [], [], { from: accounts[0] });

        // set fee structure USD: 0 cents
        const usdFeeFixed_cents = CONST.oneUsd_cents;
        //const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        const setUsdFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_Fixed == usdFeeFixed_cents && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Fix(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 0 KG fixed
        const unfcccKgFeeFixed = 0;
        //const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, unfcccKgFeeFixed);
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: unfcccKgFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfcccKgFeeFixed && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_tokType_Fix(CONST.tokenType.UNFCCC) == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const tradeTx = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        console.log(`\t>>> gasUsed - 1.0 vEEU trade eeu/ccy (A <-> B) w/ no fees: ${tradeTx.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees (fixed) - should not allow non-owner to set global fee structure (ccy)', async () => {
        try {
            //const tx1 = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, 10, { from: accounts[1] });
            const tx1 = await setFee_CcyType(CONST.ccyType.USD, { fee_fixed: 10, fee_percBips: 0, fee_min: 0, fee_max: 0 }, { from: accounts[1] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('trading fees (fixed) - should not allow non-owner to set global fee structure (carbon)', async () => {
        try {
            //const tx1 = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, 10, { from: accounts[1] });
            const tx1 = await setFee_TokType(CONST.tokenType.UNFCCC, { fee_fixed: 10, fee_percBips: 0, fee_min: 0, fee_max: 0 }, { from: accounts[1] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('trading fees (fixed) - should not allow a transfer with insufficient ccy to cover fees', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullOrigFees, [], [], { from: accounts[0] });

        //await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, 1);
        //await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, 0);
        await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { fee_fixed: 1, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        try {
            await helper.transferLedger({ stm, accounts, 
                    ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                       qty_A: 0,                                                             tokenTypeId_A: 0,
                       qty_B: new BN(CONST.tonCarbon),                                       tokenTypeId_B: CONST.tokenType.UNFCCC,
                ccy_amount_A: new BN(CONST.millionUsd_cents),                                  ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
                   applyFees: true,
            });
        }
        catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('trading fees (fixed) - should not allow a transfer with insufficient carbon to cover fees', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullOrigFees, [], [], { from: accounts[0] });

        //await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, 0);
        //await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, 1);
        await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: 1, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        try {
            await helper.transferLedger({ stm, accounts, 
                    ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                       qty_A: 0,                                                             tokenTypeId_A: 0,
                       qty_B: new BN(CONST.tonCarbon),                                       tokenTypeId_B: CONST.tokenType.UNFCCC,
                ccy_amount_A: new BN(CONST.millionUsd_cents),                                  ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
                   applyFees: true,
            });
        }
        catch (ex) { return; }
        assert.fail('expected restriction exception');
    });
});