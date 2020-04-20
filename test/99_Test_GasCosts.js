const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const { DateTime } = require('luxon');
const BN = require('bn.js');

const CONST = require('../const.js');
const transferHelper = require('../test/transferHelper.js');
const futuresHelper = require('../test/futuresHelper.js');

contract("StMaster", accounts => {
    var stm;
    var usdFT, usdFT_underlyer, usdFT_refCcy; // usd FT

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() == CONST.contractType.CASHFLOW) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
        
        await stm.whitelistMany(accounts.slice(0,60));
        await stm.sealContract();
        await require('../test/testSetup.js').setDefaults({ stm, accounts });

        // add test FT type - USD
        ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        const ftTestName_USD = `FT_USD_${new Date().getTime()}`;
        const addFtTx_USD = await stm.addSecTokenType(ftTestName_USD, CONST.settlementType.FUTURE, {...CONST.nullFutureArgs,
                  contractSize: 1000,
               expiryTimestamp: DateTime.local().plus({ days: 30 }).toMillis(),
               underlyerTypeId: spotTypes[0].id,
                      refCcyId: ccyTypes.find(p => p.name === 'USD').id,
        });
        usdFT = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_USD)[0];
        usdFT_underlyer = spotTypes.filter(p => p.id == usdFT.ft.underlyerTypeId)[0];
        usdFT_refCcy = ccyTypes.filter(p => p.id == usdFT.refCcyId)[0];
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`TaddrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`minting - should have reasonable gas cost for minting of multi-vST batches`, async () => {
        mintTx = await stm.mintSecTokenBatch(CONST.tokenType.CORSIA, CONST.GT_CARBON, 1, accounts[global.TaddrNdx], CONST.nullFees, 0, [], [], { from: accounts[0], });
        await CONST.logGas(web3, mintTx, `Mint  1 vST`);

        // mintTx = await stm.mintSecTokenBatch(CONST.tokenType.CORSIA, CONST.GT_CARBON, 5, accounts[global.TaddrNdx], { from: accounts[0], });
        //await CONST.logGas(web3, mintTx, `Mint  5 vST`);

        // var mintTx = await stm.mintSecTokenBatch(CONST.tokenType.CORSIA, CONST.GT_CARBON, 10, accounts[global.TaddrNdx], { from: accounts[0] });
        //await CONST.logGas(web3, mintTx, `Mint 10 vST`);
    });

    it(`funding - should have reasonable gas cost for funding`, async () => {
        const fundTx = await stm.fund(CONST.ccyType.USD, CONST.thousandCcy_cents, accounts[global.TaddrNdx], { from: accounts[0] });
        await CONST.logGas(web3, fundTx, `Funding`);
    });

    it(`withdrawing - should have reasonable gas cost for withdrawing`, async () => {
        await stm.fund(CONST.ccyType.USD, CONST.thousandCcy_cents, accounts[global.TaddrNdx], { from: accounts[0] });
        const withdrawTx = await stm.withdraw(CONST.ccyType.USD, CONST.thousandCcy_cents, accounts[global.TaddrNdx], { from: accounts[0] });
        await CONST.logGas(web3, withdrawTx, `Withdrawing`);
    });

    it(`transferring ccy - should have reasonable gas cost for one-sided currency transfer (A -> B), aka. fund movement`, async () => {
        await stm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.TaddrNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH, 0,                             accounts[global.TaddrNdx + 1], { from: accounts[0] });
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],        ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                               tokenTypeId_A: 0,
                   qty_B: 0,                               tokenTypeId_B: 0,
            ccy_amount_A: CONST.oneEth_wei,                  ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                 ccyTypeId_B: 0,
        });
        await CONST.logGas(web3, data.transferTx, `ccy one-way (A -> B)`);
    });

    it(`transferring tok - should have reasonable gas cost for one-sided 0.5 vST transfer (A -> B), aka. carbon movement`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                      0,                       accounts[global.TaddrNdx + 1],                            { from: accounts[0] });
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 750,                              tokenTypeId_A: CONST.tokenType.NATURE,
                   qty_B: 0,                                tokenTypeId_B: 0,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
        });
        await CONST.logGas(web3, data.transferTx, `0.5 vST one-way (A -> B)`);
    });

    it(`trading - should have reasonable gas cost for two-sided transfer`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                      CONST.oneEth_wei,        accounts[global.TaddrNdx + 1],                            { from: accounts[0] });
        const data = await transferHelper.transferLedger({ stm, accounts, 
                 ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                    qty_A: 500,                              tokenTypeId_A: CONST.tokenType.NATURE,
                    qty_B: 0,                                tokenTypeId_B: 0,
             ccy_amount_A: 0,                                  ccyTypeId_A: 0,
             ccy_amount_B: CONST.oneEth_wei,                   ccyTypeId_B: CONST.ccyType.ETH,
        });
        await CONST.logGas(web3, data.transferTx, `0.5 vST trade eeu/ccy (A <-> B)`);
    });

    it(`fees (fixed) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fees on both sides)`, async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionCcy_cents,  accounts[global.TaddrNdx + 0],                            { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.CORSIA, CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set fee structure USD: 100 cents
        const usdFeeFixed_cents = CONST.oneCcy_cents;
        //const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        const setUsdFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_Fixed == usdFeeFixed_cents && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).fee_fixed == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure CORSIA: 10 TONS fixed
        const corsiaTokQtyFeeFixed = 10;
        //const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.CORSIA, corsiaTokQtyFeeFixed);
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.CORSIA, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: corsiaTokQtyFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.CORSIA && ev.fee_tokenQty_Fixed == corsiaTokQtyFeeFixed) && ev.ledgerOwner == CONST.nullAddr;
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.CORSIA, CONST.nullAddr)).fee_fixed == corsiaTokQtyFeeFixed, 'unexpected CORSIA fixed TONS fee after setting CORSIA fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                                      ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.KT_CARBON).sub(new BN(corsiaTokQtyFeeFixed)),         tokenTypeId_B: CONST.tokenType.CORSIA,
            ccy_amount_A: new BN(CONST.millionCcy_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        await CONST.logGas(web3, data.transferTx, `1.0 vST trade eeu/ccy (A <-> B) w/ fees on both`);
    });

    it(`fees (fixed) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on ccy)`, async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionCcy_cents,  accounts[global.TaddrNdx + 0],                            { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.CORSIA, CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set fee structure USD: 100 cents
        const usdFeeFixed_cents = CONST.oneCcy_cents;
        const setUsdFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_Fixed == usdFeeFixed_cents && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).fee_fixed == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure CORSIA: 0 TONS fixed
        const corsiaTokQtyFeeFixed = 0;
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.CORSIA, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: corsiaTokQtyFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        //truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.CORSIA && ev.fee_tokenQty_Fixed == corsiaTokQtyFeeFixed);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.CORSIA, CONST.nullAddr)).fee_fixed == corsiaTokQtyFeeFixed, 'unexpected CORSIA fixed TONS fee after setting CORSIA fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                                      ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.KT_CARBON).sub(new BN(corsiaTokQtyFeeFixed)),         tokenTypeId_B: CONST.tokenType.CORSIA,
            ccy_amount_A: new BN(CONST.millionCcy_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });
        //truffleAssert.prettyPrintEmittedEvents(tradeTx.transferTx);
        await CONST.logGas(web3, data.transferTx, `1.0 vST trade eeu/ccy (A <-> B) w/ fees on ccy`);
    });

    it(`fees (fixed) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on eeu)`, async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionCcy_cents,  accounts[global.TaddrNdx + 0],                            { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.CORSIA, CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set fee structure USD: 0 cents
        const usdFeeFixed_cents = CONST.oneCcy_cents;
        //const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        const setUsdFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_Fixed == usdFeeFixed_cents) && ev.ledgerOwner == CONST.nullAddr;
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).fee_fixed == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure CORSIA: 10 TONS fixed
        const corsiaTokQtyFeeFixed = 10;
        //const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.CORSIA, corsiaTokQtyFeeFixed);
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.CORSIA, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: corsiaTokQtyFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.CORSIA && ev.fee_tokenQty_Fixed == corsiaTokQtyFeeFixed && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.CORSIA, CONST.nullAddr)).fee_fixed == corsiaTokQtyFeeFixed, 'unexpected CORSIA fixed TONS fee after setting CORSIA fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                                      ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.KT_CARBON).sub(new BN(corsiaTokQtyFeeFixed)),         tokenTypeId_B: CONST.tokenType.CORSIA,
            ccy_amount_A: new BN(CONST.millionCcy_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        await CONST.logGas(web3, data.transferTx, `1.0 vST trade eeu/ccy (A <-> B) w/ fees on tok`);
    });

    it(`fees (fixed) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (base gas cost: no fees)`, async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionCcy_cents,  accounts[global.TaddrNdx + 0],                            { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.CORSIA, CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set fee structure USD: 0 cents
        const usdFeeFixed_cents = CONST.oneCcy_cents;
        //const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        const setUsdFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: usdFeeFixed_cents, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyFix', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_Fixed == usdFeeFixed_cents && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).fee_fixed == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure CORSIA: 0 TONS fixed
        const corsiaTokQtyFeeFixed = 0;
        //const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.CORSIA, corsiaTokQtyFeeFixed);
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.CORSIA, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: corsiaTokQtyFeeFixed, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokFix', ev => ev.tokenTypeId == CONST.tokenType.CORSIA && ev.fee_tokenQty_Fixed == corsiaTokQtyFeeFixed && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.CORSIA, CONST.nullAddr)).fee_fixed == corsiaTokQtyFeeFixed, 'unexpected CORSIA fixed TONS fee after setting CORSIA fee structure');

        // transfer, with fee structure applied
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                                      ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.KT_CARBON).sub(new BN(corsiaTokQtyFeeFixed)),         tokenTypeId_B: CONST.tokenType.CORSIA,
            ccy_amount_A: new BN(CONST.millionCcy_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        await CONST.logGas(web3, data.transferTx, `1.0 vST trade eeu/ccy (A <-> B) w/ no fees`);
    });

    it(`fees (percentage) - should have reasonable gas cost for two-sided USD ccy & CORSIA ST transfer (fees on both sides)`, async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionCcy_cents,  accounts[global.TaddrNdx + 0],                            { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.CORSIA, CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set fee structure USD: 100 bp (1%)
        const ccyFeeBips = 100;
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0, fee_percBips: ccyFeeBips, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_PercBips == ccyFeeBips && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).fee_percBips == ccyFeeBips, 'unexpected USD basis points fee after setting USD fee structure');

        // set fee structure CORSIA: 100 bp (1%)
        const carbonFeeBps = 100;
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.CORSIA, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0, fee_percBips: carbonFeeBps, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.CORSIA && ev.fee_token_PercBips == carbonFeeBps);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.CORSIA, CONST.nullAddr)).fee_percBips == carbonFeeBps, 'unexpected CORSIA basis points fee after setting CORSIA fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.millionCcy_cents / 2);
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ccyFeeBips/10000));

        const transferAmountCarbon = new BN(CONST.KT_CARBON / 2);
        const expectedFeeCarbon = Math.floor(Number(transferAmountCarbon.toString()) * (carbonFeeBps/10000));

        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                              ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                                     tokenTypeId_A: 0,
                   qty_B: transferAmountCarbon,                                  tokenTypeId_B: CONST.tokenType.CORSIA,
            ccy_amount_A: transferAmountCcy,                                       ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                       ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected USD fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) USD balance after transfer');
        
        // test contract owner has received expected carbon CORSIA fee
        const contractOwnerCarbonTokQtyBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.CORSIA).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerCarbonTokQtyAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.CORSIA).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerCarbonTokQtyAfter == Number(contractOwnerCarbonTokQtyBefore) + Number(expectedFeeCarbon), 'unexpected contract owner (fee receiver) CORSIA ST quantity after transfer');

        await CONST.logGas(web3, data.transferTx, `0.5 vST trade eeu/ccy (A <-> B) w/ fees on both`);
    });

    it(`fees (percentage) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on ccy)`, async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionCcy_cents,  accounts[global.TaddrNdx + 0],                            { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.CORSIA, CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set fee structure USD: 100 bp (1%)
        const ccyFeeBips = 100;
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0, fee_percBips: ccyFeeBips, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_PercBips == ccyFeeBips && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).fee_percBips == ccyFeeBips, 'unexpected USD basis points fee after setting USD fee structure');

        // set fee structure CORSIA: 0 bp (0%)
        const carbonFeeBps = 0;
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.CORSIA, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0, fee_percBips: carbonFeeBps, fee_min: 0, fee_max: 0 } );
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.CORSIA, CONST.nullAddr)).fee_percBips == carbonFeeBps, 'unexpected CORSIA basis points fee after setting CORSIA fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.millionCcy_cents / 2);
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ccyFeeBips/10000));

        const transferAmountCarbon = new BN(CONST.KT_CARBON / 2);
        const expectedFeeCarbon = Math.floor(Number(transferAmountCarbon.toString()) * (carbonFeeBps/10000));

        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                              ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                                     tokenTypeId_A: 0,
                   qty_B: transferAmountCarbon,                                  tokenTypeId_B: CONST.tokenType.CORSIA,
            ccy_amount_A: transferAmountCcy,                                       ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                       ccyTypeId_B: 0,
               applyFees: true,
        });
        //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

        // test contract owner has received expected USD fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) USD balance after transfer');
        
        // test contract owner has received expected carbon CORSIA fee
        const contractOwnerCarbonTokQtyBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.CORSIA).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerCarbonTokQtyAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.CORSIA).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerCarbonTokQtyAfter == Number(contractOwnerCarbonTokQtyBefore) + Number(expectedFeeCarbon), 'unexpected contract owner (fee receiver) CORSIA ST quantity after transfer');

        await CONST.logGas(web3, data.transferTx, `0.5 vST trade eeu/ccy (A <-> B) w/ fees on ccy`);
    });

    it(`fees (percentage) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on eeu)`, async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionCcy_cents,  accounts[global.TaddrNdx + 0],                            { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.CORSIA, CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set fee structure USD: 0%
        const ccyFeeBips = 0;
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0, fee_percBips: ccyFeeBips, fee_min: 0, fee_max: 0 } );
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).fee_percBips == ccyFeeBips, 'unexpected USD basis points fee after setting USD fee structure');

        // set fee structure CORSIA: 10 bp (0.1%)
        const carbonFeeBps = 10;
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.CORSIA, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 0, fee_percBips: carbonFeeBps, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.CORSIA && ev.fee_token_PercBips == carbonFeeBps);
        assert((await stm.getFee(CONST.getFeeType.TOK, CONST.tokenType.CORSIA, CONST.nullAddr)).fee_percBips == carbonFeeBps, 'unexpected CORSIA basis points fee after setting CORSIA fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.millionCcy_cents / 2);
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ccyFeeBips/10000));

        const transferAmountCarbon = new BN(CONST.KT_CARBON / 2);
        const expectedFeeCarbon = Math.floor(Number(transferAmountCarbon.toString()) * (carbonFeeBps/10000));

        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],                              ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                                     tokenTypeId_A: 0,
                   qty_B: transferAmountCarbon,                                  tokenTypeId_B: CONST.tokenType.CORSIA,
            ccy_amount_A: transferAmountCcy,                                       ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                       ccyTypeId_B: 0,
               applyFees: true,
        });
        //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

        // test contract owner has received expected USD fee
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) USD balance after transfer');
        
        // test contract owner has received expected carbon CORSIA fee
        const contractOwnerCarbonTokQtyBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.CORSIA).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerCarbonTokQtyAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.CORSIA).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerCarbonTokQtyAfter == Number(contractOwnerCarbonTokQtyBefore) + Number(expectedFeeCarbon), 'unexpected contract owner (fee receiver) CORSIA ST quantity after transfer');

        await CONST.logGas(web3, data.transferTx, `0.5 vST trade eeu/ccy (A <-> B) w/ fees on eeu`);
    });

    it(`FT positions - should have reasonable gas cost to open a futures position`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: +1000, qty_B: -1000, price: 100 });
        await CONST.logGas(web3, x.tx, `Open futures position`);
    });
});