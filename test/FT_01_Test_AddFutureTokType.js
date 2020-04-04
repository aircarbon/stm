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

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() == CONST.contractType.CASHFLOW) this.skip();
        await stm.sealContract();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
    });

    beforeEach(async () => {
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`FT types - should be able to add a future on a spot underlyer`, async () => {
        //var expiryUTC = DateTime.fromISO("2020-12-28T17:00:00", { zone: "utc" });
        var expirySG = DateTime.fromISO("2020-12-28T17:00:00", { zone: "Asia/Singapore" });
        //console.log('expiryUTC: ', expiryUTC.toString());
        //console.log('expirySG: ', expirySG.toString());
        //console.log('expiryUTC.toMillis(): ', expiryUTC.toMillis());
        //console.log('expirySG.toMillis(): ', expirySG.toMillis());
        const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        const addFtTx = await stm.addSecTokenType(`FT_TEST_${new Date().getTime()}`, CONST.settlementType.FUTURE, { 
            expiryTimestamp: expirySG.toMillis(), underlyerId: spotTypes[0].id, refCcyId: ccyTypes[0].id 
        });
        const ftTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.FUTURE);
        assert(ftTypes.length == 1, 'unexpected future tok type count');
    });

    it(`FT types - should not be able to add a future with an invalid expiry time`, async () => {
        const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        try {
            const addFtTx = await stm.addSecTokenType(`FT_TEST_${new Date().getTime()}`, CONST.settlementType.FUTURE, { 
                expiryTimestamp: 0, underlyerId: spotTypes[0].id, refCcyId: cyTypes[0].id
            });
        }
        catch (ex) { assert(ex.reason == 'Bad expiry', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT types - should not be able to add a future on invalid (non-existent) underlyer`, async () => {
        const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        try {
            const addFtTx = await stm.addSecTokenType(`FT_TEST_${new Date().getTime()}`, CONST.settlementType.FUTURE, { 
                expiryTimestamp: DateTime.local().toMillis(), underlyerId: 0, refCcyId: ccyTypes[0].id 
            });
        }
        catch (ex) { assert(ex.reason == 'Bad underylerTypeId', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT types - should not be able to add a future on invalid (non-spot) underlyer`, async () => {
        const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        const addFtTx_ok = await stm.addSecTokenType(`FT_TEST_${new Date().getTime()}`, CONST.settlementType.FUTURE, { 
            expiryTimestamp: DateTime.local().toMillis(), underlyerId: spotTypes[0].id, refCcyId: ccyTypes[0].id 
        });
        const ftTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.FUTURE);
        try {
            const addFtTx_err = await stm.addSecTokenType(`FT_TEST_${new Date().getTime()}`, CONST.settlementType.FUTURE, { 
                expiryTimestamp: DateTime.local().toMillis(), underlyerId: ftTypes[0].id, refCcyId: ccyTypes[0].id 
            });
        }
        catch (ex) { assert(ex.reason == 'Bad underyler settlement type', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT types - should not be able to add a future with an invalid (non-existent) reference currency`, async () => {
        const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        try {
            const addFtTx = await stm.addSecTokenType(`FT_TEST_${new Date().getTime()}`, CONST.settlementType.FUTURE, { 
                expiryTimestamp: DateTime.local().toMillis(), underlyerId: spotTypes[0].id, refCcyId: 0
            });
        }
        catch (ex) { assert(ex.reason == 'Bad refCcyId', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
});
