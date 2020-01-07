const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');
const transferHelper = require('../test/transferHelper.js');
const BN = require('bn.js');

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() == CONST.contractType.CASHFLOW) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
        
        for (let i=0 ; i < 60 ; i++) { // whitelist enough accounts for the tests
            await stm.whitelist(accounts[global.TaddrNdx + i]);
        }
        await stm.sealContract();
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // ST FEES
    it(`fees (fixed) - apply VCS token fee on a trade (fee on A)`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.TaddrNdx + 1],                         { from: accounts[0] });

        // set fee structure VCS: 2 KG carbon fixed
        const carbonKgFixedFee = 2;
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.VCS, CONST.nullAddr)).fee_fixed == 0, 'unexpected VCS fixed KG fee before setting VCS fee structure');
        const setFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: carbonKgFixedFee, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == carbonKgFixedFee && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.VCS, CONST.nullAddr)).fee_fixed == carbonKgFixedFee, 'unexpected VCS fixed KG fee after setting VCS fee structure');
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.UNFCCC, CONST.nullAddr)).fee_fixed == 0, 'unexpected UNFCCC fixed KG fee after setting VCS fee structure');

        // transfer, with fee structure applied
        const carbonKgTransferAmount = 750;
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],     ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: carbonKgTransferAmount,         tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // test contract owner has received expected carbon VCS fee
        const contractOwner_VcsKgBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwner_VcsKgAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwner_VcsKgAfter == Number(contractOwner_VcsKgBefore) + Number(carbonKgFixedFee), 'unexpected contract owner (fee receiver) VCS ST quantity after transfer');
        
        // fees are *additional* to the supplied transfer KGs...
        const ledgerA_VcsKgBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const ledgerA_VcsKgAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(ledgerA_VcsKgAfter == Number(ledgerA_VcsKgBefore) - Number(carbonKgFixedFee) - Number(carbonKgTransferAmount), 'unexpected ledger A (fee payer) VCS ST quantity after transfer');
    });

    it(`fees (fixed) - apply UNFCCC token fee on a trade (fee on B)`, async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.TaddrNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure UNFCCC: 1 KG carbon fixed, VCS: no fee
        const unfccFixedFee = 2;
        //const setUnfccFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, unfccFixedFee);
        //const setVcsFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.VCS, 0);
        const setUnfccFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: unfccFixedFee, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        const setVcsFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr,      { fee_fixed: 0,             fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUnfccFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfccFixedFee && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.UNFCCC, CONST.nullAddr)).fee_fixed == unfccFixedFee, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.VCS, CONST.nullAddr)).fee_fixed == 0, 'unexpected VCS fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],     ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                              tokenTypeId_A: 0,
                   qty_B: 750,                            tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerUnfcccKgBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerUnfcccKgAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerUnfcccKgAfter == Number(contractOwnerUnfcccKgBefore) + Number(unfccFixedFee), 'unexpected contract owner (fee receiver) UNFCCC ST quantity after transfer');

        // test contract owner has unchanged VCS balance (i.e. no VCS fees received)
        const contractOwnerVcsKgBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore), 'unexpected contract owner (fee receiver) VCS ST quantity after transfer');
    });

    it(`fees (fixed) - apply large (>1 batch ST size) token fee on a trade on a newly added ST type`, async () => {
        await stm.addSecTokenType('TEST_EEU_TYPE');
        const types = (await stm.getSecTokenTypes()).tokenTypes;
        const newSecTokenTypeId = types.filter(p => p.name == 'TEST_EEU_TYPE')[0].id;

        await stm.mintSecTokenBatch(newSecTokenTypeId, 1000, 1,                            accounts[global.TaddrNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(newSecTokenTypeId, 1000, 1,                            accounts[global.TaddrNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(newSecTokenTypeId, 1000, 1,                            accounts[global.TaddrNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,        accounts[global.TaddrNdx + 1],                              { from: accounts[0] });

        // set fee structure new ST type: 1500 KG carbon fixed (1.5 STs, 2 batches)
        const newSecTokenTypeFixedFee = 1500;
        const setFeeTx = await stm.setFee_TokType(newSecTokenTypeId, CONST.nullAddr, { fee_fixed: newSecTokenTypeFixedFee, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == newSecTokenTypeId && ev.fee_tokenQty_Fixed == newSecTokenTypeFixedFee && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.TOK, newSecTokenTypeId, CONST.nullAddr)).fee_fixed == newSecTokenTypeFixedFee, 'unexpected new ST type fixed KG fee after setting fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],     ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 1,                              tokenTypeId_A: newSecTokenTypeId,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // test contract owner has received expected new ST type token fee
        const owner_balBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == newSecTokenTypeId).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == newSecTokenTypeId).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(newSecTokenTypeFixedFee), 'unexpected contract owner (fee receiver) new ST type quantity after transfer');
    });

    // CCY FEES
    it(`fees (fixed) - apply ETH ccy fee on a max. trade (fee on A)`, async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.TaddrNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure ETH: 1000 Wei fixed
        const ethFeeFixed_Wei = 1000;
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.ETH, CONST.nullAddr)).fee_fixed == 0, 'unexpected ETH fixed Wei fee before setting ETH fee structure');
        //const setFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.ETH, ethFeeFixed_Wei);
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr, { fee_fixed: ethFeeFixed_Wei, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFixed_Wei && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.ETH, CONST.nullAddr)).fee_fixed == ethFeeFixed_Wei, 'unexpected ETH fixed Wei fee after setting ETH fee structure');
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.SGD, CONST.nullAddr)).fee_fixed == 0, 'unexpected USD fixed cents fee after setting ETH fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                          ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                                   tokenTypeId_A: 0,
                   qty_B: 750,                                                 tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: new BN(CONST.oneEth_wei).sub(new BN(ethFeeFixed_Wei)), ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                     ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(ethFeeFixed_Wei), 'unexpected contract owner (fee receiver) ETH balance after transfer');
    });

    it(`fees (fixed) - apply USD ccy fee on a max. trade (fee on B)`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.SGD,                   CONST.millionCcy_cents,  accounts[global.TaddrNdx + 1],                         { from: accounts[0] });

        // set fee structure USD: 1000 $ in cents
        const usdFeeFixed_cents = CONST.thousandCcy_cents;
        //const setFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.SGD, CONST.nullAddr, { fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.SGD && ev.fee_ccy_Fixed == usdFeeFixed_cents && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.SGD, CONST.nullAddr)).fee_fixed == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                                    ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 750,                                                           tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                                                             tokenTypeId_B: 0,
            ccy_amount_A: 0,                                                               ccyTypeId_A: 0,
            ccy_amount_B: new BN(CONST.millionCcy_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_B: CONST.ccyType.SGD,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.SGD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.SGD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(usdFeeFixed_cents), 'unexpected contract owner (fee receiver) USD balance after transfer');
    });

    it(`fees (fixed) - apply ccy fee on a max. trade on a newly added ccy`, async () => {
        await stm.addCcyType('TEST_CCY_TYPE', 'TEST_UNIT', 2);
        const types = (await stm.getCcyTypes()).ccyTypes;
        const newCcyTypeId = types.filter(p => p.name == 'TEST_CCY_TYPE')[0].id;

        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(newCcyTypeId,                        1000,                    accounts[global.TaddrNdx + 1],                         { from: accounts[0] });

        // set fee structure new ccy: 100 units
        const newCcyFeeFixed_units = 100;
        const setFeeTx = await stm.setFee_CcyType(newCcyTypeId, CONST.nullAddr, { fee_fixed: newCcyFeeFixed_units, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == newCcyTypeId && ev.fee_ccy_Fixed == newCcyFeeFixed_units && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, newCcyTypeId, CONST.nullAddr)).fee_fixed == newCcyFeeFixed_units, 'unexpected new currency fixed fee after setting fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                     ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 750,                                            tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                                ccyTypeId_A: 0,
            ccy_amount_B: new BN(1000).sub(new BN(newCcyFeeFixed_units)),   ccyTypeId_B: newCcyTypeId,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(newCcyFeeFixed_units), 'unexpected contract owner (fee receiver) new ccy balance after transfer');
    });

    // ST + CCY FEES
    it(`fees (fixed) - apply ETH ccy & VCS ST fee on a max. trade (fees on both sides)`, async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.TaddrNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure ETH: 1000 Wei fixed
        const ethFeeFixed_Wei = 1000;
        //const setEthFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.ETH, ethFeeFixed_Wei);
        const setEthFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr, { fee_fixed: ethFeeFixed_Wei, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setEthFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFixed_Wei && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.ETH, CONST.nullAddr)).fee_fixed == ethFeeFixed_Wei, 'unexpected ETH fixed Wei fee after setting ETH fee structure');

        // set fee structure VCS: 10 KG fixed
        const vcsKgFeeFixed = 10;
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.VCS, CONST.nullAddr)).fee_fixed == 0, 'unexpected VCS fixed KG fee before setting VCS fee structure');
        //const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.VCS, vcsKgFeeFixed);
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: vcsKgFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == vcsKgFeeFixed && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.VCS, CONST.nullAddr)).fee_fixed == vcsKgFeeFixed, 'unexpected VCS fixed KG fee after setting VCS fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                            ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                                     tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(vcsKgFeeFixed)),    tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: new BN(CONST.oneEth_wei).sub(new BN(ethFeeFixed_Wei)),   ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                       ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(ethFeeFixed_Wei), 'unexpected contract owner (fee receiver) ETH balance after transfer');
        
        // test contract owner has received expected carbon VCS fee
        const contractOwnerVcsKgBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore) + Number(vcsKgFeeFixed), 'unexpected contract owner (fee receiver) VCS ST quantity after transfer');
    });

    it(`fees (fixed) - apply USD ccy & UNFCCC ST fee on a max. trade (fees on both sides)`, async () => {
        await stm.fund(CONST.ccyType.SGD,                   CONST.millionCcy_cents,  accounts[global.TaddrNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure USD: 100 cents
        const usdFeeFixed_cents = CONST.oneCcy_cents;
        //const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        const setUsdFeeTx = await stm.setFee_CcyType(CONST.ccyType.SGD, CONST.nullAddr, { fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.SGD && ev.fee_ccy_Fixed == usdFeeFixed_cents && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.SGD, CONST.nullAddr)).fee_fixed == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 42 KG fixed
        const unfcccKgFeeFixed = 42;
        //const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, unfcccKgFeeFixed);
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: unfcccKgFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfcccKgFeeFixed && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.UNFCCC, CONST.nullAddr)).fee_fixed == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                                    ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionCcy_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.SGD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected USD fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.SGD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.SGD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(usdFeeFixed_cents), 'unexpected contract owner (fee receiver) USD balance after transfer');
        
        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerVcsKgBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore) + Number(unfcccKgFeeFixed), 'unexpected contract owner (fee receiver) UNFCCC ST quantity after transfer');    
    });

    it(`fees (fixed) - apply newly added ccy & newly added ST type fee on a max. trade (fees on both sides)`, async () => {
        await stm.addCcyType('TEST_CCY_TYPE_2', 'TEST_UNIT', 2);
        const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        const newCcyTypeId = ccyTypes.filter(p => p.name == 'TEST_CCY_TYPE_2')[0].id;

        await stm.addSecTokenType('TEST_EEU_TYPE_2');
        const tokenTypes = (await stm.getSecTokenTypes()).tokenTypes;
        const newSecTokenTypeId = tokenTypes.filter(p => p.name == 'TEST_EEU_TYPE_2')[0].id;

        await stm.fund(newCcyTypeId,                           1000,                    accounts[global.TaddrNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(newSecTokenTypeId,         CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure new ccy
        const ccyFeeFixed_units = 10;
        const setCcyFeeTx = await stm.setFee_CcyType(newCcyTypeId, CONST.nullAddr, { fee_fixed: ccyFeeFixed_units, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == newCcyTypeId && ev.fee_ccy_Fixed == ccyFeeFixed_units && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, newCcyTypeId, CONST.nullAddr)).fee_fixed == ccyFeeFixed_units, 'unexpected new ccy fixed fee after setting ccy fee structure');

        // set fee structure new ST type: 1 KG
        const newSecTokenTypeKgFeeFixed = 1;
        const setCarbonFeeTx = await stm.setFee_TokType(newSecTokenTypeId, CONST.nullAddr, { fee_fixed: newSecTokenTypeKgFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == newSecTokenTypeId && ev.fee_tokenQty_Fixed == newSecTokenTypeKgFeeFixed && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.TOK, newSecTokenTypeId, CONST.nullAddr)).fee_fixed == newSecTokenTypeKgFeeFixed, 'unexpected new eeu type fixed KG fee after setting eeu fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                                         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                                                  tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(newSecTokenTypeKgFeeFixed)),     tokenTypeId_B: newSecTokenTypeId,
            ccy_amount_A: new BN(1000).sub(new BN(ccyFeeFixed_units)),                          ccyTypeId_A: newCcyTypeId,
            ccy_amount_B: 0,                                                                    ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected ccy fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(ccyFeeFixed_units), 'unexpected contract owner (fee receiver) newly added ccy balance after transfer');
        
        // test contract owner has received expected token fee
        const contractOwnerSecTokenKgBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == newSecTokenTypeId).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerSecTokenKgAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == newSecTokenTypeId).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerSecTokenKgAfter == Number(contractOwnerSecTokenKgBefore) + Number(newSecTokenTypeKgFeeFixed), 'unexpected contract owner (fee receiver) newly added ST type quantity after transfer');    
    });

    it(`fees (fixed) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fees on both sides)`, async () => {
        await stm.fund(CONST.ccyType.SGD,                   CONST.millionCcy_cents,  accounts[global.TaddrNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure USD: 100 cents
        const usdFeeFixed_cents = CONST.oneCcy_cents;
        //const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        const setUsdFeeTx = await stm.setFee_CcyType(CONST.ccyType.SGD, CONST.nullAddr, { fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.SGD && ev.fee_ccy_Fixed == usdFeeFixed_cents && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.SGD, CONST.nullAddr)).fee_fixed == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 10 KG fixed
        const unfcccKgFeeFixed = 10;
        //const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, unfcccKgFeeFixed);
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: unfcccKgFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfcccKgFeeFixed) && ev.ledgerOwner == CONST.nullAddr;
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.UNFCCC, CONST.nullAddr)).fee_fixed == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                                    ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionCcy_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.SGD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        await CONST.logGas(web3, data.transferTx, `1.0 vST trade eeu/ccy (A <-> B) w/ fees on both`);
    });

    it(`fees (fixed) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on ccy)`, async () => {
        await stm.fund(CONST.ccyType.SGD,                   CONST.millionCcy_cents,  accounts[global.TaddrNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure USD: 100 cents
        const usdFeeFixed_cents = CONST.oneCcy_cents;
        const setUsdFeeTx = await stm.setFee_CcyType(CONST.ccyType.SGD, CONST.nullAddr, { fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.SGD && ev.fee_ccy_Fixed == usdFeeFixed_cents && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.SGD, CONST.nullAddr)).fee_fixed == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 0 KG fixed
        const unfcccKgFeeFixed = 0;
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: unfcccKgFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        //truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfcccKgFeeFixed);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.UNFCCC, CONST.nullAddr)).fee_fixed == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                                    ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionCcy_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.SGD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });
        //truffleAssert.prettyPrintEmittedEvents(tradeTx.transferTx);
        await CONST.logGas(web3, data.transferTx, `1.0 vST trade eeu/ccy (A <-> B) w/ fees on ccy`);
    });

    it(`fees (fixed) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on eeu)`, async () => {
        await stm.fund(CONST.ccyType.SGD,                   CONST.millionCcy_cents,  accounts[global.TaddrNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure USD: 0 cents
        const usdFeeFixed_cents = CONST.oneCcy_cents;
        //const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        const setUsdFeeTx = await stm.setFee_CcyType(CONST.ccyType.SGD, CONST.nullAddr, { fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.SGD && ev.fee_ccy_Fixed == usdFeeFixed_cents) && ev.ledgerOwner == CONST.nullAddr;
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.SGD, CONST.nullAddr)).fee_fixed == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 10 KG fixed
        const unfcccKgFeeFixed = 10;
        //const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, unfcccKgFeeFixed);
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: unfcccKgFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfcccKgFeeFixed && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.UNFCCC, CONST.nullAddr)).fee_fixed == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                                    ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionCcy_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.SGD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        await CONST.logGas(web3, data.transferTx, `1.0 vST trade eeu/ccy (A <-> B) w/ fees on tok`);
    });

    it(`fees (fixed) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (base gas cost: no fees)`, async () => {
        await stm.fund(CONST.ccyType.SGD,                   CONST.millionCcy_cents,  accounts[global.TaddrNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure USD: 0 cents
        const usdFeeFixed_cents = CONST.oneCcy_cents;
        //const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        const setUsdFeeTx = await stm.setFee_CcyType(CONST.ccyType.SGD, CONST.nullAddr, { fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.SGD && ev.fee_ccy_Fixed == usdFeeFixed_cents && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.SGD, CONST.nullAddr)).fee_fixed == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 0 KG fixed
        const unfcccKgFeeFixed = 0;
        //const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, unfcccKgFeeFixed);
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: unfcccKgFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfcccKgFeeFixed && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.UNFCCC, CONST.nullAddr)).fee_fixed == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                                    ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionCcy_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.SGD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        await CONST.logGas(web3, data.transferTx, `1.0 vST trade eeu/ccy (A <-> B) w/ no fees`);
    });

    it(`fees (fixed) - should not allow non-owner to set global fee structure (ccy)`, async () => {
        try {
            const tx1 = await stm.setFee_CcyType(CONST.ccyType.SGD, CONST.nullAddr, { fee_fixed: 10, fee_percBips: 0, fee_min: 0, fee_max: 0 }, { from: accounts[1] });
        } catch (ex) { 
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`fees (fixed) - should not allow non-owner to set global fee structure (tokens)`, async () => {
        try {
            const tx1 = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: 10, fee_percBips: 0, fee_min: 0, fee_max: 0 }, { from: accounts[1] });
        } catch (ex) { 
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });

    it(`fees (fixed) - should not allow a transfer with insufficient ccy to cover fees (A)`, async () => {
        await stm.fund(CONST.ccyType.SGD,                   CONST.millionCcy_cents,  accounts[global.TaddrNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        await stm.setFee_CcyType(CONST.ccyType.SGD, CONST.nullAddr,      { fee_fixed: 1, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, CONST.nullFees );

        try {
            await transferHelper.transferLedger({ stm, accounts, 
                    ledger_A: accounts[global.TaddrNdx + 0],                                    ledger_B: accounts[global.TaddrNdx + 1],
                       qty_A: 0,                                                             tokenTypeId_A: 0,
                       qty_B: new BN(CONST.tonCarbon),                                       tokenTypeId_B: CONST.tokenType.UNFCCC,
                ccy_amount_A: new BN(CONST.millionCcy_cents),                                  ccyTypeId_A: CONST.ccyType.SGD,
                ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
                   applyFees: true,
            });
        }
        catch (ex) { 
            assert(ex.reason == 'Insufficient currency A', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`fees (fixed) - should not allow a transfer with insufficient tokens to cover fees (B)`, async () => {
        await stm.fund(CONST.ccyType.SGD,                   CONST.millionCcy_cents,  accounts[global.TaddrNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        await stm.setFee_CcyType(CONST.ccyType.SGD, CONST.nullAddr,      CONST.nullFees );
        await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: 1, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        try {
            await transferHelper.transferLedger({ stm, accounts, 
                    ledger_A: accounts[global.TaddrNdx + 0],                                    ledger_B: accounts[global.TaddrNdx + 1],
                       qty_A: 0,                                                             tokenTypeId_A: 0,
                       qty_B: new BN(CONST.tonCarbon),                                       tokenTypeId_B: CONST.tokenType.UNFCCC,
                ccy_amount_A: new BN(CONST.millionCcy_cents),                                  ccyTypeId_A: CONST.ccyType.SGD,
                ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
                   applyFees: true,
            });
        }
        catch (ex) { 
            assert(ex.reason == 'Insufficient tokens B', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    })
});