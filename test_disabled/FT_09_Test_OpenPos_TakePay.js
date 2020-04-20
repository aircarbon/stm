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
    var spotTypes, ccyTypes;

    var SHORT_STID, LONG_STID, SHORT, LONG;
    var LAST_PRICE = new BN(100);
    const POS_QTY = new BN(1);
    const FT_SIZE = new BN(1000);

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() == CONST.contractType.CASHFLOW) this.skip();
        await stm.sealContract();
        await require('../test/testSetup.js').setDefaults({ stm, accounts });
        if (!global.TaddrNdx) global.TaddrNdx = 0;

        ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);

        // add test FT type - USD
        const ftTestName_USD = `FT_USD_${new Date().getTime()}`;
        const addFtTx_USD = await stm.addSecTokenType(ftTestName_USD, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
              expiryTimestamp: DateTime.local().plus({ days: 30 }).toMillis(),
              underlyerTypeId: spotTypes[0].id,
                     refCcyId: ccyTypes.find(p => p.name === 'USD').id,
                 contractSize: FT_SIZE.toString(),
        });
        usdFT = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_USD)[0];
        usdFT_underlyer = spotTypes.filter(p => p.id == usdFT.ft.underlyerTypeId)[0];
        usdFT_refCcy = ccyTypes.filter(p => p.id == usdFT.refCcyId)[0];

        // add test FT position
        global.TaddrNdx += 2;
        SHORT = accounts[global.TaddrNdx];
        LONG = accounts[global.TaddrNdx + 1];
        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: SHORT, ledger_B: LONG,
            qty_A: POS_QTY.neg(),
            qty_B: POS_QTY,
            price: LAST_PRICE
        });
        assert(x.ledger_A.tokens.filter(p => p.tokenTypeId == usdFT.id)[0].stId == 
               x.ledger_B.tokens.filter(p => p.tokenTypeId == usdFT.id)[0].stId - 1, 'unexpected StId sequence');
        SHORT_STID = x.ledger_A.tokens.filter(p => p.tokenTypeId == usdFT.id)[0].stId;
        LONG_STID = SHORT_STID + 1;
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // null/zero balance cap on take
    it(`FT pos-pair take/pay - should handle null take/pay (markPrice == lastMarkPrice)`, async () => {
        const DELTA_P = new BN(0);
        LAST_PRICE = LAST_PRICE.add(DELTA_P);
        const data = await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, ftId: usdFT.id, shortStId: SHORT_STID, markPrice: LAST_PRICE, feePerSide: 0 });
        //truffleAssert.prettyPrintEmittedEvents(data.tx);
        truffleAssert.eventEmitted(data.tx, 'TakePay', ev => ev.delta.isZero() && ev.done.isZero());
        await CONST.logGas(web3, data.tx, `pos-pair null take/pay`);
    });
    it(`FT pos-pair take/pay - should cap take at 0 when no balance available (short ITM, long OTM)`, async () => {
        const DELTA_P = new BN(-10);
        LAST_PRICE = LAST_PRICE.add(DELTA_P);
        const data = await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, ftId: usdFT.id, shortStId: SHORT_STID, markPrice: LAST_PRICE, feePerSide: 0 });
        truffleAssert.eventEmitted(data.tx, 'TakePay', ev =>
            ev.from == LONG && ev.to == SHORT && ev.delta == DELTA_P.abs().mul(POS_QTY).mul(FT_SIZE).toString() && ev.done.isZero()
        );
    });
    it(`FT pos-pair take/pay - should cap take at 0 when no balance available (short OTM, long ITM)`, async () => {
        const DELTA_P = new BN(+10);
        LAST_PRICE = LAST_PRICE.add(DELTA_P);
        const data = await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, ftId: usdFT.id, shortStId: SHORT_STID, markPrice: LAST_PRICE, feePerSide: 0 });
        truffleAssert.eventEmitted(data.tx, 'TakePay', ev =>
            ev.from == SHORT && ev.to == LONG && ev.delta == DELTA_P.abs().mul(POS_QTY).mul(FT_SIZE).toString() && ev.done.isZero()
        );
    });

    // ORDERED: partial-cap on take
    it(`FT pos-pair take/pay - should partially cap when insufficient available (short ITM, long OTM)`, async () => {
        const DELTA_P = new BN(-10);
        LAST_PRICE = LAST_PRICE.add(DELTA_P);
        const DELTA = DELTA_P.abs().mul(POS_QTY).mul(FT_SIZE);
        await stm.fund(usdFT.ft.refCcyId, DELTA.div(new BN(2)), LONG);
        const data = await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, ftId: usdFT.id, shortStId: SHORT_STID, markPrice: LAST_PRICE, feePerSide: 0 });
        truffleAssert.eventEmitted(data.tx, 'TakePay', ev =>
            ev.from == LONG && ev.to == SHORT && ev.delta == DELTA.toString() && ev.done.eq(ev.delta.div(new BN(2)))
        );
    });
    it(`FT pos-pair take/pay - should partially cap when insufficient available (short OTM, long ITM)`, async () => {
        const DELTA_P = new BN(+10);
        LAST_PRICE = LAST_PRICE.add(DELTA_P);
        const DELTA = DELTA_P.abs().mul(POS_QTY).mul(FT_SIZE);
        const data = await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, ftId: usdFT.id, shortStId: SHORT_STID, markPrice: LAST_PRICE, feePerSide: 0 });
        truffleAssert.eventEmitted(data.tx, 'TakePay', ev =>
            ev.from == SHORT && ev.to == LONG && ev.delta == DELTA.toString() && ev.done.eq(ev.delta.div(new BN(2)))
        );
    });

    // ORDERED: no cap on take
    it(`FT pos-pair take/pay - should have no cap when sufficient available (short ITM, long OTM)`, async () => {
        const DELTA_P = new BN(-5); // assumes: = previous test's capped paid amount - can be fully covered
        LAST_PRICE = LAST_PRICE.add(DELTA_P);
        const DELTA = DELTA_P.abs().mul(POS_QTY).mul(FT_SIZE);
        const data = await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, ftId: usdFT.id, shortStId: SHORT_STID, markPrice: LAST_PRICE, feePerSide: 0 });
        truffleAssert.eventEmitted(data.tx, 'TakePay', ev =>
            ev.from == LONG && ev.to == SHORT && ev.delta == DELTA.toString() && ev.done.eq(ev.delta)
        );
        await CONST.logGas(web3, data.tx, `pos-pair take/pay no cap (short ITM)`);
    });
    it(`FT pos-pair take/pay - should have no cap when sufficient available (short OTM, long ITM)`, async () => {
        const DELTA_P = new BN(+5); // assumes: = previous test's uncapped paid amount - can be fully covered
        LAST_PRICE = LAST_PRICE.add(DELTA_P);
        const DELTA = DELTA_P.abs().mul(POS_QTY).mul(FT_SIZE);
        const data = await futuresHelper.takePay({ stm, accounts, tokTypeId: usdFT.id, ftId: usdFT.id, shortStId: SHORT_STID, markPrice: LAST_PRICE, feePerSide: 0 });
        truffleAssert.eventEmitted(data.tx, 'TakePay', ev =>
            ev.from == SHORT && ev.to == LONG && ev.delta == DELTA.toString() && ev.done.eq(ev.delta)
        );
        await CONST.logGas(web3, data.tx, `pos-pair take/pay no cap (long ITM)`);
    });
});
