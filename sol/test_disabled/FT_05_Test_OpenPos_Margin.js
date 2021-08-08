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
    var ethFT, ethFT_underlyer, ethFT_refCcy; // eth FT
    var spotTypes, ccyTypes;

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
                 contractSize: 1000,
               initMarginBips: 1000, // 10%
                varMarginBips: 0,
        }, CONST.nullAddr);
        usdFT = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_USD)[0];
        usdFT_underlyer = spotTypes.filter(p => p.id == usdFT.ft.underlyerTypeId)[0];
        usdFT_refCcy = ccyTypes.filter(p => p.id == usdFT.refCcyId)[0];

        // add test FT type - ETH
        const ftTestName_ETH = `FT_ETH_${new Date().getTime()}`;
        const addFtTx_ETH = await stm.addSecTokenType(ftTestName_ETH, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
            expiryTimestamp: DateTime.local().plus({ days: 30 }).toMillis(),
            underlyerTypeId: spotTypes[0].id,
                   refCcyId: ccyTypes.find(p => p.name === 'ETH').id,
               contractSize: 1000,
             initMarginBips: 100, // 1%
              varMarginBips: 0,
        }, CONST.nullAddr);
        ethFT = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_ETH)[0];
        ethFT_underlyer = spotTypes.filter(p => p.id == ethFT.ft.underlyerTypeId)[0];
        ethFT_refCcy = ccyTypes.filter(p => p.id == ethFT.refCcyId)[0];
    });


    // TODO: ...
        // test: one FT / pos: +1, +1, -3
        // + x3 inverses
        // + all x2 for >1 FTs same ref ccy 
        // + all x2 for >1 FTs different ref ccy

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`FT position fees & margin - should apply USD $3 per contract fee and 20% margin on a new futures position`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE_PER_CONTRACT = new BN(300), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(3000);
        await stm.setFuture_FeePerContract(usdFT.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(usdFT.id, 1000); // 10%

        const NOTIONAL = new BN(usdFT.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        const POS_MARGIN = NOTIONAL.div(new BN(5)); // 20%
        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN));
        //console.log('NOTIONAL $', Number(NOTIONAL.toString())/100);
        //console.log('POS_MARGIN $', Number(POS_MARGIN.toString())/100);
        //console.log('MIN_BALANCE $', Number(MIN_BALANCE.toString())/100);

        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.toString(), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.toString(), B, 'TEST');
        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
        //console.log('ledger_A', x.ledger_A.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId));
        //console.log('ledger_B', x.ledger_B.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId));
        assert(new BN(x.ledger_A.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN), 'unexpected reserve ledger A');
        assert(new BN(x.ledger_B.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN), 'unexpected reserve ledger B');
        await CONST.logGas(web3, x.tx, `Open futures position (USD)`);
        //truffleAssert.prettyPrintEmittedEvents(x.tx);
    });
    it(`FT positions fees & margin - should apply (large) ETH per contract fee and 1.55% margin on a new futures position`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE_PER_CONTRACT = new BN(CONST.tenthEth_wei), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(CONST.oneEth_wei).mul(new BN(10));
        await stm.setFuture_FeePerContract(ethFT.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(ethFT.id, 55); // 0.55%

        const NOTIONAL = new BN(ethFT.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        const POS_MARGIN = (((new BN(155)             // total margin, bips - 1.55%
                              .mul(new BN(1000000)))  // increase precision
                             .div(new BN(10000)))     // bips
                            .mul(NOTIONAL))
                           .div(new BN(1000000));     // decrease precision
        const CHECK = Number(NOTIONAL) * 0.0155; // 1.55%
        assert(CHECK == POS_MARGIN);
        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN));
        //console.log('NOTIONAL Ξ', web3.utils.fromWei(NOTIONAL).toString());
        //console.log('POS_MARGIN Ξ', web3.utils.fromWei(POS_MARGIN).toString());
        //console.log('MIN_BALANCE Ξ', web3.utils.fromWei(MIN_BALANCE).toString());

        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, ethFT.ft.refCcyId, MIN_BALANCE.toString(), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, ethFT.ft.refCcyId, MIN_BALANCE.toString(), B, 'TEST');

        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: ethFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
        //console.log('ledger_A', x.ledger_A.ccys.find(p => p.ccyTypeId == ethFT.ft.refCcyId));
        //console.log('ledger_B', x.ledger_B.ccys.find(p => p.ccyTypeId == ethFT.ft.refCcyId));
        assert(new BN(x.ledger_A.ccys.find(p => p.ccyTypeId == ethFT.ft.refCcyId).reserved).eq(POS_MARGIN), 'unexpected reserve ledger A');
        assert(new BN(x.ledger_B.ccys.find(p => p.ccyTypeId == ethFT.ft.refCcyId).reserved).eq(POS_MARGIN), 'unexpected reserve ledger B');
        await CONST.logGas(web3, x.tx, `Open futures position (ETH)`);
        //truffleAssert.prettyPrintEmittedEvents(x.tx);
    });

    it(`FT position fees & margin - should reduce margin reserve to zero on open-to-close (A/B*/A*)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];

        const FEE_PER_CONTRACT = new BN(0), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(1);
        await stm.setFuture_FeePerContract(usdFT.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(usdFT.id, 1000); // 10%

        const NOTIONAL = new BN(usdFT.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        const POS_MARGIN = NOTIONAL.div(new BN(5)); // 20%
        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN));

        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.toString(), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.toString(), B, 'TEST');

        // A: +1 / B: -1
        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(),
            price: CONTRACT_PRICE });
        assert(new BN(x.ledger_A.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN), 'unexpected reserve ledger A');
        assert(new BN(x.ledger_B.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN), 'unexpected reserve ledger B');

        // A: -1 / B: +1
        const y = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY.neg(), qty_B: POS_QTY,
            price: CONTRACT_PRICE.mul(new BN(3)) });
        //console.log(y.ledger_A.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId));
        //console.log(y.ledger_B.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId));
        //truffleAssert.prettyPrintEmittedEvents(y.tx);
        assert(new BN(y.ledger_A.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).isZero(), 'unexpected reserve ledger A (closed position)');
        assert(new BN(y.ledger_B.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).isZero(), 'unexpected reserve ledger B (new position)');
    });
    it(`FT position fees & margin - should reduce margin reserve to zero on open-to-close (A*/B/C)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1], C = accounts[global.TaddrNdx + 2]; global.TaddrNdx++;

        const FEE_PER_CONTRACT = new BN(0), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(1);
        await stm.setFuture_FeePerContract(usdFT.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(usdFT.id, 1000); // 10%

        const NOTIONAL = new BN(usdFT.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        const POS_MARGIN = NOTIONAL.div(new BN(5)); // 20%
        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN));

        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.toString(), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.toString(), B, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.mul(new BN(4)).toString(), C, 'TEST');

        // A: +1 / B: -1
        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(),
            price: CONTRACT_PRICE });
        assert(new BN(x.ledger_A.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN), 'unexpected reserve ledger A');
        assert(new BN(x.ledger_B.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN), 'unexpected reserve ledger B');

        // A: -1 / C: +1
        const y = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: C, qty_A: POS_QTY.neg(), qty_B: POS_QTY,
            price: CONTRACT_PRICE.mul(new BN(3)) });
        //console.log(y.ledger_A.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId));
        //console.log(y.ledger_B.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId));
        //truffleAssert.prettyPrintEmittedEvents(y.tx);
        assert(new BN(y.ledger_A.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).isZero(), 'unexpected reserve ledger A (closed position)');
        assert(new BN(y.ledger_B.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN.mul(new BN(3))), 'unexpected reserve ledger B (new position)');
    });
    it(`FT position fees & margin - should reduce margin reserve to zero on open-to-close (A/B*/C)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1], C = accounts[global.TaddrNdx + 2]; global.TaddrNdx++;

        const FEE_PER_CONTRACT = new BN(0), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(1);
        await stm.setFuture_FeePerContract(usdFT.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(usdFT.id, 1000); // 10%

        const NOTIONAL = new BN(usdFT.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        const POS_MARGIN = NOTIONAL.div(new BN(5)); // 20%
        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN));

        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.toString(), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.toString(), B, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.mul(new BN(4)).toString(), C, 'TEST');

        // A: +1 / B: -1
        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(),
            price: CONTRACT_PRICE });
        assert(new BN(x.ledger_A.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN), 'unexpected reserve ledger A');
        assert(new BN(x.ledger_B.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN), 'unexpected reserve ledger B');

        // B: +1 / C: -1
        const y = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: B, ledger_B: C, qty_A: POS_QTY, qty_B: POS_QTY.neg(),
            price: CONTRACT_PRICE.mul(new BN(3)) });
        //console.log(y.ledger_A.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId));
        //console.log(y.ledger_B.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId));
        truffleAssert.prettyPrintEmittedEvents(y.tx);
        assert(new BN(y.ledger_A.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).isZero(), 'unexpected reserve ledger A (closed position)');
        assert(new BN(y.ledger_B.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN.mul(new BN(3))), 'unexpected reserve ledger B (new position)');
    });

    it(`FT positions fees & margin - should not allow a futures position to be opened with insufficient balance USD to cover fees & margin (A)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE_PER_CONTRACT = new BN(300), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(3000);
        await stm.setFuture_FeePerContract(usdFT.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(usdFT.id, 1000); // 10%

        const NOTIONAL = new BN(usdFT.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        const POS_MARGIN = NOTIONAL.div(new BN(5)); // 20%
        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(POS_MARGIN);

        //await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.sub(POS_MARGIN).toString(), A); // sufficient for fees (applied first), insufficient for margin 
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.sub(new BN(1)), A, 'TEST'); // or, just this is enough to trigger

        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.toString(), B, 'TEST');
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
        }
        catch (ex) { assert(ex.reason == 'Reservation exceeds balance', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT positions fees & margin - should not allow a futures position to be opened with insufficient balance USD to cover fees & margin (B)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE_PER_CONTRACT = new BN(300), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(3000);
        await stm.setFuture_FeePerContract(usdFT.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(usdFT.id, 1000); // 10%

        const NOTIONAL = new BN(usdFT.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        const POS_MARGIN = NOTIONAL.div(new BN(5)); // 20%
        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(POS_MARGIN);

        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.toString(), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.sub(POS_MARGIN).toString(), B, 'TEST'); // sufficient for fees (applied first), insufficient for margin 
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
        }
        catch (ex) { assert(ex.reason == 'Reservation exceeds balance', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
});
