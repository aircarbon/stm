// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StFutures.sol => FuturesLib.sol
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
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;

    var usdFT, usdFT_underlyer, usdFT_refCcy; // usd FT
    var spotTypes, ccyTypes;

    var SHORT_STID, LONG_STID, SHORT, LONG;
    var LAST_PRICE = new BN(100);
    const POS_QTY = new BN(1);
    const FT_SIZE = new BN(1000);
    const FEE_PER_SIDE = new BN(1);

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        
        await setupHelper.whitelistAndSeal({ stm, accounts });
        await setupHelper.setDefaults({ stm, accounts });
        
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
        }, CONST.nullAddr);
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
        assert(x.ledger_A.tokens.filter(p => p.tokTypeId == usdFT.id)[0].stId == 
               x.ledger_B.tokens.filter(p => p.tokTypeId == usdFT.id)[0].stId - 1, 'unexpected StId sequence');
        SHORT_STID = x.ledger_A.tokens.filter(p => p.tokTypeId == usdFT.id)[0].stId;
        LONG_STID = Number(SHORT_STID) + 1;
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // null/zero balance cap on take
    it(`FT unilateral take/pay fees - should apply fees on null take/pay (markPrice == lastMarkPrice)`, async () => {
        const DELTA_P = new BN(0);
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, FEE_PER_SIDE, LONG, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, FEE_PER_SIDE, SHORT, 'TEST');

        const short = await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: SHORT_STID, markPrice: LAST_PRICE.add(DELTA_P), feePerSide: FEE_PER_SIDE });
        //truffleAssert.prettyPrintEmittedEvents(short.tx);
        truffleAssert.eventEmitted(short.tx, 'TakePay2', ev => ev.delta.isZero() && ev.done.isZero());
        await CONST.logGas(web3, short.tx, `unilateral NULL SHORT take/pay`);

        const long = await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: LONG_STID, markPrice: LAST_PRICE.add(DELTA_P), feePerSide: FEE_PER_SIDE });
        //truffleAssert.prettyPrintEmittedEvents(long.tx);
        truffleAssert.eventEmitted(long.tx, 'TakePay2', ev => ev.delta.isZero() && ev.done.isZero());
        await CONST.logGas(web3, long.tx, `unilateral NULL LONG take/pay`);
    });

    // ORDERED: partial-cap on take
    it(`FT unilateral take/pay w/ fees - should apply fees and cap OTM when insufficient available (short ITM, long OTM)`, async () => {
        const DELTA_P = new BN(-10);
        LAST_PRICE = LAST_PRICE.add(DELTA_P);
        const DELTA = DELTA_P.abs().mul(POS_QTY).mul(FT_SIZE);
        const PARTIAL = DELTA.div(new BN(2));
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, FEE_PER_SIDE, LONG, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, FEE_PER_SIDE, SHORT, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, PARTIAL, LONG, 'TEST');

        // LONG - OTM, capped
        const long = await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: LONG_STID, markPrice: LAST_PRICE, feePerSide: FEE_PER_SIDE });
        //truffleAssert.prettyPrintEmittedEvents(long.tx);
        truffleAssert.eventEmitted(long.tx, 'TakePay2', ev => ev.delta == DELTA.toString() && ev.done.eq(PARTIAL));
        //await CONST.logGas(web3, long.tx, `unilateral capped OTM LONG take`);

        // SHORT - ITM, uncapped
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, DELTA.sub(PARTIAL).sub(FEE_PER_SIDE), accounts[0], 'TEST'); // fund central owner minimum requred to supply ITM
        const short = await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: SHORT_STID, markPrice: LAST_PRICE, feePerSide: FEE_PER_SIDE });
        //truffleAssert.prettyPrintEmittedEvents(short.tx);
        truffleAssert.eventEmitted(short.tx, 'TakePay2', ev => ev.delta == DELTA.toString() && ev.done == DELTA.toString());
        //await CONST.logGas(web3, short.tx, `unilateral uncapped ITM SHORT pay`);
    });
    it(`FT unilateral take/pay w/ fees - should apply fees and cap OTM when insufficient available (short OTM, long ITM)`, async () => {
        const DELTA_P = new BN(+20);
        LAST_PRICE = LAST_PRICE.add(DELTA_P);
        const DELTA = DELTA_P.abs().mul(POS_QTY).mul(FT_SIZE);
        const PARTIAL = DELTA.div(new BN(2));
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, FEE_PER_SIDE, LONG, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, FEE_PER_SIDE, SHORT, 'TEST');
        //await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, PARTIAL, SHORT);

        // SHORT - OTM, capped
        const otm = await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: SHORT_STID, markPrice: LAST_PRICE, feePerSide: FEE_PER_SIDE });
        //truffleAssert.prettyPrintEmittedEvents(otm.tx);
        truffleAssert.eventEmitted(otm.tx, 'TakePay2', ev => ev.delta == DELTA.toString() && ev.done.eq(PARTIAL));
        //await CONST.logGas(web3, otm.tx, `unilateral capped OTM SHORT take`);

        // LONG - ITM, uncapped
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, DELTA.sub(PARTIAL).sub(FEE_PER_SIDE), accounts[0], 'TEST'); // fund central owner minimum requred to supply ITM
        const itm = await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: LONG_STID, markPrice: LAST_PRICE, feePerSide: FEE_PER_SIDE });
        //truffleAssert.prettyPrintEmittedEvents(itm.tx);
        truffleAssert.eventEmitted(itm.tx, 'TakePay2', ev => ev.delta == DELTA.toString() && ev.done == DELTA.toString());
        //await CONST.logGas(web3, itm.tx, `unilateral uncapped ITM LONG pay`);
    });    

    // ORDERED: no cap on take
    it(`FT unilateral take/pay w/ fees - should apply fees with no cap on OTM when sufficient available (short ITM, long OTM)`, async () => {
        const DELTA_P = new BN(-20);
        LAST_PRICE = LAST_PRICE.add(DELTA_P);

        const DELTA = DELTA_P.abs().mul(POS_QTY).mul(FT_SIZE);
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, FEE_PER_SIDE, LONG, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, FEE_PER_SIDE, SHORT, 'TEST');

        // LONG - OTM, no cap on take
        const long = await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: LONG_STID, markPrice: LAST_PRICE, feePerSide: FEE_PER_SIDE });
        //truffleAssert.prettyPrintEmittedEvents(long.tx);
        truffleAssert.eventEmitted(long.tx, 'TakePay2', ev => ev.delta == DELTA.toString() && ev.done == DELTA.toString());
        //await CONST.logGas(web3, long.tx, `unilateral no cap on OTM LONG take`);

        // SHORT - ITM, uncapped
        const short = await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: SHORT_STID, markPrice: LAST_PRICE, feePerSide: FEE_PER_SIDE });
        //truffleAssert.prettyPrintEmittedEvents(short.tx);
        truffleAssert.eventEmitted(short.tx, 'TakePay2', ev => ev.delta == DELTA.toString() && ev.done == DELTA.toString());
        //await CONST.logGas(web3, short.tx, `unilateral uncapped ITM SHORT pay`);
    });
    it(`FT unilateral take/pay w/ fees - should apply fees with no cap on OTM when sufficient available (short OTM, long ITM)`, async () => {
        const DELTA_P = new BN(+20);
        LAST_PRICE = LAST_PRICE.add(DELTA_P);

        const DELTA = DELTA_P.abs().mul(POS_QTY).mul(FT_SIZE);
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, FEE_PER_SIDE, LONG, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, FEE_PER_SIDE, SHORT, 'TEST');

        // SHORT - OTM, no cap on take
        const otm = await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: SHORT_STID, markPrice: LAST_PRICE, feePerSide: FEE_PER_SIDE });
        //truffleAssert.prettyPrintEmittedEvents(otm.tx);
        truffleAssert.eventEmitted(otm.tx, 'TakePay2', ev => ev.delta == DELTA.toString() && ev.done == DELTA.toString());
        await CONST.logGas(web3, otm.tx, `unilateral no cap on OTM SHORT take`);

        // LONG - ITM, uncapped
        const itm = await futuresHelper.takePay2({ stm, accounts, tokTypeId: usdFT.id, stId: LONG_STID, markPrice: LAST_PRICE, feePerSide: FEE_PER_SIDE });
        //truffleAssert.prettyPrintEmittedEvents(itm.tx);
        truffleAssert.eventEmitted(itm.tx, 'TakePay2', ev => ev.delta == DELTA.toString() && ev.done == DELTA.toString());
        await CONST.logGas(web3, itm.tx, `unilateral uncapped ITM LONG pay`);
    });
    //>>> gasUsed - unilateral no cap on OTM SHORT take: 59057 @0.000000005 ETH/gas = Ξ0.0003 ~= $0.0561
    //>>> gasUsed - unilateral uncapped ITM LONG pay: 75938 @0.000000005 ETH/gas = Ξ0.0004 ~= $0.0721
});
