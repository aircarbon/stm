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

contract("StMaster", accounts => {
    var stm;
    var usdFT, usdFT_underlyer, usdFT_refCcy; // usd FT
    
    var ccyTypes, spotTypes;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() == CONST.contractType.CASHFLOW) this.skip();
        await stm.sealContract();
        if (!global.TaddrNdx) global.TaddrNdx = 0;

        // add test FT type - USD
        ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        const ftTestName_USD = `FT_USD_${new Date().getTime()}`;
        const addFtTx_USD = await stm.addSecTokenType(ftTestName_USD, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
              expiryTimestamp: DateTime.local().plus({ days: 30 }).toMillis(),
              underlyerTypeId: spotTypes[0].id,
                     refCcyId: ccyTypes.find(p => p.name === 'USD').id,
                 contractSize: 1000,
               initMarginBips: 999,   // 99.9%
                varMarginBips: 50,    // 0.5%
         });
        usdFT = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_USD)[0];
        usdFT_underlyer = spotTypes.filter(p => p.id == usdFT.ft.underlyerTypeId)[0];
        usdFT_refCcy = ccyTypes.filter(p => p.id == usdFT.refCcyId)[0];
    });

    beforeEach(async () => {
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // ## TODO - init + var > 10000 on addSecTokenType ... throw surely? (init+var=100% == no leverage, should support that)
    // ## todo - loadtest: spot *trade* op...

    it(`FT init margin override - should be able to override initial margin for a ledger entry (A & B)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE_PER_CONTRACT = new BN(1), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(1);
        await stm.setFuture_FeePerContract(usdFT.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(usdFT.id, 50); // 0.5%

        const setInitMarginTx_A = stm.setInitMargin_TokType(usdFT.id, A, 25); // 0.25%
        const setInitMarginTx_B = stm.setInitMargin_TokType(usdFT.id, B, 25); // 0.25%

        const NOTIONAL = new BN(usdFT.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);

        const POS_MARGIN = (((new BN(75)              // total margin, bips - 0.75%
                              .mul(new BN(1000000)))  // increase precision
                             .div(new BN(10000)))     // bips
                            .mul(NOTIONAL))
                           .div(new BN(1000000));     // decrease precision
        const CHECK = Math.floor(Number(NOTIONAL) * 0.0075); // 0.75%
        assert(CHECK == POS_MARGIN);

        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN));
        console.log('NOTIONAL $', Number(NOTIONAL.toString())/100);
        console.log('POS_MARGIN $', Number(POS_MARGIN.toString())/100);
        console.log('MIN_BALANCE $', Number(MIN_BALANCE.toString())/100);
        await stm.fund(usdFT.ft.refCcyId, MIN_BALANCE.toString(), A);
        await stm.fund(usdFT.ft.refCcyId, MIN_BALANCE.toString(), B);

        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
        await CONST.logGas(web3, x.tx, `Open futures position (USD)`);
    });

    // it(`FT init margin override - should not allow non-owner to override initial margin`, async () => {
    //     const A = accounts[global.TaddrNdx];
    //     try {
    //         const x = await stm.setInitMargin_TokType(usdFT.id, A, 1000, { from: accounts[1] });
    //     }
    //     catch (ex) { assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`); return; }
    //     assert.fail('expected contract exception');
    // });
    // it(`FT init margin override - should not be able to override initial margin when read only`, async () => {
    //     const A = accounts[global.TaddrNdx];
    //     try {
    //         await stm.setReadOnly(true, { from: accounts[0] });
    //         const x = await stm.setInitMargin_TokType(usdFT.id, A, 1000);
    //         await stm.setReadOnly(false, { from: accounts[0] });
    //     }
    //     catch (ex) { 
    //         await stm.setReadOnly(false, { from: accounts[0] });
    //         assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
    //         return;
    //     }
    //     assert.fail('expected contract exception');
    // });

    // //it(`FT init margin override - should not be able to override initial margin for an invalid (non-existent) ledger entry`, async () => {
    // //    const X = accounts[global.TaddrNdx];
    // //    try {
    // //        const x = await stm.setInitMargin_TokType(usdFT.id, X, 1000);
    // //    }
    // //    catch (ex) { assert(ex.reason == 'Bad ledgerOwner', `unexpected: ${ex.reason}`); return; }
    // //    assert.fail('expected contract exception');
    // //});

    // it(`FT init margin override - should not be able to override initial margin for an invalid (non-existent) token type`, async () => {
    //     const A = accounts[global.TaddrNdx]; await stm.fund(CONST.ccyType.USD, 100, A);
    //     try {
    //         const x = await stm.setInitMargin_TokType(0xdeaddead, A, 1001);
    //     }
    //     catch (ex) { assert(ex.reason == 'Bad tokTypeId', `unexpected: ${ex.reason}`); return; }
    //     assert.fail('expected contract exception');
    // });
    // it(`FT init margin override - should not be able to override initial margin for an invalid (non-future) token type`, async () => {
    //     const A = accounts[global.TaddrNdx]; await stm.fund(CONST.ccyType.USD, 100, A);
    //     try {
    //         const x = await stm.setInitMargin_TokType(CONST.tokenType.CORSIA, A, 1002);
    //     }
    //     catch (ex) { assert(ex.reason == 'Bad token settlement type', `unexpected: ${ex.reason}`); return; }
    //     assert.fail('expected contract exception');
    // });

    // it(`FT init margin override - should not be able to set an invalid (> 10000) initial margin override for a futures token type`, async () => {
    //     const A = accounts[global.TaddrNdx]; await stm.fund(CONST.ccyType.USD, 100, A);
    //     try {
    //         const x = await stm.setInitMargin_TokType(usdFT.id, A, 10001);
    //     }
    //     catch (ex) { assert(ex.reason == 'Bad initMarginBips', `unexpected: ${ex.reason}`); return; }
    //     assert.fail('expected contract exception');
    // });
    // it(`FT init margin override - should not be able to set an invalid (< 0) initial margin override on a futures token type`, async () => {
    //     const A = accounts[global.TaddrNdx]; await stm.fund(CONST.ccyType.USD, 100, A);
    //     try {
    //         const x = await stm.setInitMargin_TokType(usdFT.id, A, -1);
    //     }
    //     catch (ex) { assert(ex.reason == 'Bad initMarginBips', `unexpected: ${ex.reason}`); return; }
    //     assert.fail('expected contract exception');
    // });
});
