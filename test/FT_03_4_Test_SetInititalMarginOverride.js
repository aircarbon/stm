const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');

const { DateTime } = require('luxon');

const transferHelper = require('../test/transferHelper.js');
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

    it(`FT init margin override - should be able to override initial margin by ledger entry, for a futures token type`, async () => {
        // TODO: margin calc needs to USE the override!
        //...
    });

    it(`FT init margin override - should not allow non-owner to override initial margin`, async () => {
        const A = accounts[global.TaddrNdx];
        try {
            const x = await stm.setInitMargin(A , usdFT.id, 1000, { from: accounts[1] });
        }
        catch (ex) { assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT init margin override - should not be able to override initial margin when read only`, async () => {
        const A = accounts[global.TaddrNdx];
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            const x = await stm.setInitMargin(A , usdFT.id, 1000);
            await stm.setReadOnly(false, { from: accounts[0] });
        }
        catch (ex) { 
            await stm.setReadOnly(false, { from: accounts[0] });
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`FT init margin override - should not be able to override initial margin for an invalid (non-existent) ledger entry`, async () => {
        const X = accounts[global.TaddrNdx];
        try {
            const x = await stm.setInitMargin(X, usdFT.id, 1000);
        }
        catch (ex) { assert(ex.reason == 'Bad ledgerOwner', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT init margin override - should not be able to override initial margin for an invalid (non-existent) token type`, async () => {
        const A = accounts[global.TaddrNdx]; await stm.fund(CONST.ccyType.USD, 100, A);
        try {
            const x = await stm.setInitMargin(A, 0xdeaddead, 1001);
        }
        catch (ex) { assert(ex.reason == 'Bad tokTypeId', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT init margin override - should not be able to override initial margin for an invalid (non-future) token type`, async () => {
        const A = accounts[global.TaddrNdx]; await stm.fund(CONST.ccyType.USD, 100, A);
        try {
            const x = await stm.setInitMargin(A, CONST.tokenType.CORSIA, 1002);
        }
        catch (ex) { assert(ex.reason == 'Bad token settlement type', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT init margin override - should not be able to set an invalid (> 10000) initial margin override for a futures token type`, async () => {
        const A = accounts[global.TaddrNdx]; await stm.fund(CONST.ccyType.USD, 100, A);
        try {
            const x = await stm.setInitMargin(A, usdFT.id, 10001);
        }
        catch (ex) { assert(ex.reason == 'Bad initMarginBips', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT init margin override - should not be able to set an invalid (< 0) initial margin override on a futures token type`, async () => {
        const A = accounts[global.TaddrNdx]; await stm.fund(CONST.ccyType.USD, 100, A);
        try {
            const x = await stm.setInitMargin(A, usdFT.id, -1);
        }
        catch (ex) { assert(ex.reason == 'Bad initMarginBips', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
});
