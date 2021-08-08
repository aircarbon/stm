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
    
    var ccyTypes, spotTypes;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        
        await setupHelper.whitelistAndSeal({ stm, accounts });
        await setupHelper.setDefaults({ stm, accounts });
        
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
               initMarginBips: 999,   // 9.9%
                varMarginBips: 50,    // 0.5%
         }, CONST.nullAddr);
        usdFT = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_USD)[0];
        usdFT_underlyer = spotTypes.filter(p => p.id == usdFT.ft.underlyerTypeId)[0];
        usdFT_refCcy = ccyTypes.filter(p => p.id == usdFT.refCcyId)[0];
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`FT init margin override - should be able to override initial margin for a ledger entry (A & B)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE_PER_CONTRACT = new BN(1), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(1);
        await stm.setFuture_FeePerContract(usdFT.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(usdFT.id, 50); // 0.5%

        const setInitMarginTx_A = await stm.setLedgerOverride(1, usdFT.id, A, 25); //await stm.initMarginOverride(usdFT.id, A, 25); // 0.25%
        const setInitMarginTx_B = await stm.setLedgerOverride(1, usdFT.id, B, 25); //await stm.initMarginOverride(usdFT.id, B, 25); // 0.25%

        const NOTIONAL = new BN(usdFT.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);

        const POS_MARGIN = (((new BN(75)              // total margin, bips - 0.75%
                              .mul(new BN(1000000)))  // increase precision
                             .div(new BN(10000)))     // bips
                            .mul(NOTIONAL))
                           .div(new BN(1000000));     // decrease precision
        const CHECK = Math.floor(Number(NOTIONAL) * 0.0075); // 0.75%
        assert(CHECK == POS_MARGIN);

        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN));
        //console.log('NOTIONAL $', Number(NOTIONAL.toString())/100);
        //console.log('POS_MARGIN $', Number(POS_MARGIN.toString())/100);
        //console.log('MIN_BALANCE $', Number(MIN_BALANCE.toString())/100);
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.toString(), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.toString(), B, 'TEST');
        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
        assert(new BN(x.ledger_A.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN), 'unexpected reserve ledger A');
        assert(new BN(x.ledger_B.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN), 'unexpected reserve ledger B');
        await CONST.logGas(web3, x.tx, `Open futures position (USD)`);
    });

    it(`FT init margin override - should be able to override initial margin for a ledger entry (A)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE_PER_CONTRACT = new BN(1), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(1);
        await stm.setFuture_FeePerContract(usdFT.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(usdFT.id, 50); // 0.5%

        const setInitMarginTx_A = await stm.setLedgerOverride(1, usdFT.id, A, 25); //await stm.initMarginOverride(usdFT.id, A, 25); // 0.25%

        const NOTIONAL = new BN(usdFT.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);

        const POS_MARGIN_A = (((new BN(75) // total margin, bips - 0.75%
                             .mul(new BN(1000000))).div(new BN(10000))).mul(NOTIONAL)).div(new BN(1000000));
        const CHECK_A = Math.floor(Number(NOTIONAL) * 0.0075);
        assert(CHECK_A == POS_MARGIN_A);

        const POS_MARGIN_B = (((new BN(1049) // total margin, bips - 10.49%
                             .mul(new BN(1000000))).div(new BN(10000))).mul(NOTIONAL)).div(new BN(1000000));
        const CHECK_B = Math.floor(Number(NOTIONAL) * 0.1049);
        assert(CHECK_B == POS_MARGIN_B);

        const MIN_BALANCE_A = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN_A));
        const MIN_BALANCE_B = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN_B));
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE_A.toString(), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE_B.toString(), B, 'TEST');
        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
        assert(new BN(x.ledger_A.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN_A), 'unexpected reserve ledger A');
        assert(new BN(x.ledger_B.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN_B), 'unexpected reserve ledger B');
        //await CONST.logGas(web3, x.tx, `Open futures position (USD)`);   
    });
    it(`FT init margin override - should be able to override initial margin for a ledger entry (B)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE_PER_CONTRACT = new BN(1), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(1);
        await stm.setFuture_FeePerContract(usdFT.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(usdFT.id, 50); // 0.5%

        const setInitMarginTx_B = await stm.setLedgerOverride(1, usdFT.id, B, 25); //await stm.initMarginOverride(usdFT.id, B, 25); // 0.25%

        const NOTIONAL = new BN(usdFT.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);

        const POS_MARGIN_A = (((new BN(1049) // total margin, bips - 10.49%
                             .mul(new BN(1000000))).div(new BN(10000))).mul(NOTIONAL)).div(new BN(1000000));
        const POS_MARGIN_B = (((new BN(75) // total margin, bips - 0.75%
                             .mul(new BN(1000000))).div(new BN(10000))).mul(NOTIONAL)).div(new BN(1000000));

        const CHECK_A = Math.floor(Number(NOTIONAL) * 0.1049);
        const CHECK_B = Math.floor(Number(NOTIONAL) * 0.0075);
        assert(CHECK_A == POS_MARGIN_A);
        assert(CHECK_B == POS_MARGIN_B);

        const MIN_BALANCE_A = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN_A));
        const MIN_BALANCE_B = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN_B));
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE_A.toString(), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE_B.toString(), B, 'TEST');
        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
        assert(new BN(x.ledger_A.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN_A), 'unexpected reserve ledger A');
        assert(new BN(x.ledger_B.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN_B), 'unexpected reserve ledger B');
        //await CONST.logGas(web3, x.tx, `Open futures position (USD)`);   
    });

    it(`FT init margin override - should not allow non-owner to override initial margin`, async () => {
        const A = accounts[global.TaddrNdx];
        try {
            const x = await stm.setLedgerOverride(1, usdFT.id, A, 1000, { from: accounts[10] });
        }
        catch (ex) { assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT init margin override - should not be able to override initial margin when read only`, async () => {
        const A = accounts[global.TaddrNdx];
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            const x = await stm.setLedgerOverride(1, usdFT.id, A, 1000); //await stm.initMarginOverride(usdFT.id, A, 1000);
            await stm.setReadOnly(false, { from: accounts[0] });
        }
        catch (ex) { 
            await stm.setReadOnly(false, { from: accounts[0] });
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`FT init margin override - should not be able to override initial margin for an invalid (non-existent) token type`, async () => {
        const A = accounts[global.TaddrNdx]; await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, 100, A, 'TEST');
        try {
            const x = await stm.setLedgerOverride(1, 0xdeaddead, A, 1001); //await stm.initMarginOverride(0xdeaddead, A, 1001);
        }
        catch (ex) { assert(ex.reason == 'Bad tokTypeId', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT init margin override - should not be able to override initial margin for an invalid (non-future) token type`, async () => {
        const A = accounts[global.TaddrNdx]; await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, 100, A, 'TEST');
        try {
            const x = await stm.setLedgerOverride(1, CONST.tokenType.TOK_T1, A, 1002); //await stm.initMarginOverride(CONST.tokenType.TOK_T1, A, 1002);
        }
        catch (ex) { assert(ex.reason == 'Bad token settlement type', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT init margin override - should not be able to set an invalid (> 10000) initial margin override for a futures token type`, async () => {
        const A = accounts[global.TaddrNdx]; await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, 100, A, 'TEST');
        try {
            const x = await stm.setLedgerOverride(1, usdFT.id, A, 10001); //await stm.initMarginOverride(usdFT.id, A, 10001);
        }
        catch (ex) { assert(ex.reason == 'Bad total margin', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT init margin override - should not be able to set an invalid (< 0) initial margin override on a futures token type`, async () => {
        const A = accounts[global.TaddrNdx]; await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, 100, A, 'TEST');
        try {
            const x = await stm.setLedgerOverride(1, usdFT.id, A, -1); //await stm.initMarginOverride(usdFT.id, A, -1);
            //console.log('test:', (await stm.getInitMarginOverride(usdFT.id, A)).toString());
        }
        catch (ex) { assert(ex.reason == 'value out-of-bounds', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
});
