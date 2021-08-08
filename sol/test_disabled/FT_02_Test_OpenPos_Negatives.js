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
        }, CONST.nullAddr);
        ethFT = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_ETH)[0];
        ethFT_underlyer = spotTypes.filter(p => p.id == ethFT.ft.underlyerTypeId)[0];
        ethFT_refCcy = ccyTypes.filter(p => p.id == ethFT.refCcyId)[0];
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`FT positions - should be able to open a futures position with USD ref currency`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: +1000, qty_B: -1000, price: 100 });
        //truffleAssert.prettyPrintEmittedEvents(x.tx);
    });

    it(`FT positions - should be able to open a (large qty * price) futures position with ETH ref currency`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: ethFT.id, ledger_A: A, ledger_B: B,
            qty_A: +1000000000,
            qty_B: -1000000000,
            price: CONST.millionEth_wei
        });
        //truffleAssert.prettyPrintEmittedEvents(x.tx);
    });

    it(`FT positions - should not allow a futures position on a non-whitelisted ledger entry (A)`, async () => {
        const A = accounts[888], B = accounts[global.TaddrNdx + 1];
        try {
            const x = await stm.openFtPos({ tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: +10, qty_B: -10, price: 100 }, { from: accounts[0] });
        }
        catch (ex) { assert(ex.reason == 'Not whitelisted (A)', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT positions - should not allow a futures position on a non-whitelisted ledger entry (B)`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[888];
        try {
            const x = await stm.openFtPos({ tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: +10, qty_B: -10, price: 100 }, { from: accounts[0] });
        }
        catch (ex) { assert(ex.reason == 'Not whitelisted (B)', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT positions - should not allow non-owner to open a futures position`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        try {
            const x = await stm.openFtPos({ tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: +10, qty_B: -10, price: 100 }, { from: accounts[10] });
        }
        catch (ex) { assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT positions - should not be able to open a futures position when read only`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: +10, qty_B: -10, price: 100 });
            await stm.setReadOnly(false, { from: accounts[0] });
        }
        catch (ex) { 
            await stm.setReadOnly(false, { from: accounts[0] });
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`FT positions - should not be able to open a futures position without two distinct parties`, async () => {
        const A = accounts[global.TaddrNdx];
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: A, qty_A: +10, qty_B: -10, price: 100 });
        }
        catch (ex) { assert(ex.reason == 'Bad transfer', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT positions - should not be able to open a futures position with mismatched quantities`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: +10, qty_B: -11, price: 100 });
        }
        catch (ex) { assert(ex.reason == 'Quantity mismatch', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT positions - should not be able to open a futures position with invalid (0) quantities`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: 0, qty_B: 0, price: 100 });
        }
        catch (ex) { assert(ex.reason == 'Bad quantity', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT positions - should not be able to open a futures position with invalid (too large/small for signed int64) quantities`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        try {
            const bn = new BN(2).pow(new BN(64)).div(new BN(2));//.sub(new BN(1));
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, 
                qty_A: bn.neg().toString(), qty_B: bn.toString(), 
                price: 100 });
        }
        catch (ex) { assert(ex.reason == 'Bad quantity', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT positions - should not be able to open a futures position with invalid (0) price`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: -1, qty_B: +1, price: 0 });
        }
        catch (ex) { assert(ex.reason == 'Bad price', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT positions - should not be able to open a futures position with invalid (<0) price`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: +1, qty_B: -1, price: -1 });
        }
        catch (ex) { assert(ex.reason == 'Bad price', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT positions - should not be able to open a futures position with invalid (too large for signed int128) price`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        try {
            const bn = new BN(2).pow(new BN(128)).div(new BN(2));//.sub(new BN(1));
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: +1, qty_B: -1, price: bn.toString() });
        }
        catch (ex) { assert(ex.reason == 'Bad price', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT positions - should not be able to open a futures position for an invalid (non-existent) token type`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: 0xdead, ledger_A: A, ledger_B: B, qty_A: +1, qty_B: -1, price: +1 });
        }
        catch (ex) { assert(ex.reason == 'Bad tokTypeId', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT positions - should not be able to open a futures position for an invalid (non-future) token type`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: CONST.tokenType.TOK_T1, ledger_A: A, ledger_B: B, qty_A: +1, qty_B: -1, price: +1 });
        }
        catch (ex) { assert(ex.reason == 'Bad token settlement type', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
});
