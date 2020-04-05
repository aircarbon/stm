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

    it(`FT var margin - should be able to set variation margin on a futures token type`, async () => {
        const tx = await stm.setFutureTokenVariationMargin(usdFT.id, 42);
        const tt = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.id == usdFT.id)[0];
        assert(tt.ft.varMarginBips = 42);
        truffleAssert.eventEmitted(tx, 'SetFutureTokenVariationMargin', ev => ev.tokenTypeId == usdFT.id && ev.varMarginBips == 42);
    });

    it(`FT var margin - should not allow non-owner to set variation margin on a futures token type`, async () => {
        try {
            const x = await stm.setFutureTokenVariationMargin(usdFT.id, 43, { from: accounts[1] });
        }
        catch (ex) { assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT var margin - should not be able to set variation margin on a futures token type when read only`, async () => {
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            const x = await stm.setFutureTokenVariationMargin(usdFT.id, 44);
            await stm.setReadOnly(false, { from: accounts[0] });
        }
        catch (ex) { 
            await stm.setReadOnly(false, { from: accounts[0] });
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`FT var margin - should not be able to set variation margin on an invalid (non-existent) token type`, async () => {
        try {
            const x = await stm.setFutureTokenVariationMargin(0xdeaddead, 45);
        }
        catch (ex) { assert(ex.reason == 'Bad tokenTypeId', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT var margin - should not be able to set variation margin on a spot token type`, async () => {
        try {
            const x = await stm.setFutureTokenVariationMargin(spotTypes[0].id, 46);
        }
        catch (ex) { assert(ex.reason == 'Bad token settlement type', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT var margin - should not be able to set an invalid (> 10000) variation margin on a futures token type`, async () => {
        try {
            const x = await stm.setFutureTokenVariationMargin(usdFT.id, 10001);
        }
        catch (ex) { assert(ex.reason == 'Bad varMarginBips', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT var margin - should not be able to set an invalid (< 0) variation margin on a futures token type`, async () => {
        try {
            const x = await stm.setFutureTokenVariationMargin(usdFT.id, -1);
        }
        catch (ex) { assert(ex.reason == 'Bad varMarginBips', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
});
