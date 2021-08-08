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

const transferHelper = require('../test/transferHelper.js');
const CONST = require('../const.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        await stm.sealContract();
        await setupHelper.setDefaults({ stm, accounts });
        if (!global.TaddrNdx) global.TaddrNdx = 0;
    });

    beforeEach(async () => {
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // ## TODO - init + var > 10000 on addSecTokenType ... throw surely? (init+var=100% == no leverage, should support that)
    // ## todo - loadtest: spot *trade* op...

    it(`FT types - should be able to add a future on a spot underlyer`, async () => {
        //var expiryUTC = DateTime.fromISO("2020-12-28T17:00:00", { zone: "utc" });
        var expirySG = DateTime.fromISO("2020-12-28T17:00:00", { zone: "Asia/Singapore" });
        //console.log('expiryUTC: ', expiryUTC.toString());
        //console.log('expirySG: ', expirySG.toString());
        //console.log('expiryUTC.toMillis(): ', expiryUTC.toMillis());
        //console.log('expirySG.toMillis(): ', expirySG.toMillis());
        const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        const ftName = `FT_TEST1_${new Date().getTime()}`;
        const addFtTx = await stm.addSecTokenType(ftName, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
            expiryTimestamp: expirySG.toMillis(), 
            underlyerTypeId: spotTypes[0].id,
                   refCcyId: ccyTypes[0].id,
             initMarginBips: 1000,
              varMarginBips: 1500,
               contractSize: 1000,
        }, CONST.nullAddr);
        const ftType = (await stm.getSecTokenTypes()).tokenTypes.find(p => p.name == ftName);
        assert(ftType !== undefined);
        assert(ftType.settlementType == CONST.settlementType.FUTURE);
        assert(ftType.ft.expiryTimestamp == expirySG.toMillis());
        assert(ftType.ft.underlyerTypeId == spotTypes[0].id);
        assert(ftType.ft.refCcyId == ccyTypes[0].id);
        assert(ftType.ft.initMarginBips == 1000);
        assert(ftType.ft.varMarginBips == 1500);
    });

    // Note: Invalid test | Expiry check require statement is removed from Futures.
    // it(`FT types - should not be able to add a future with an invalid (unset) expiry time`, async () => {
    //     const allTypes = (await stm.getSecTokenTypes()).tokenTypes;
    //     const spotTypes = allTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
    //     const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
    //     try {
    //         const addFtTx = await stm.addSecTokenType(`FT_TEST2_${new Date().getTime()}`, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
    //             underlyerTypeId: spotTypes[0].id, 
    //                    refCcyId: ccyTypes[0].id,
    //                contractSize: 1000,
    //         }, CONST.nullAddr);
    //     }
    //     catch (ex) { assert(ex.reason == 'Bad expiry', `unexpected: ${ex.reason}`); return; }
    //     assert.fail('expected contract exception');
    // });

    it(`FT types - should not be able to add a future on invalid (non-existent) underlyer`, async () => {
        const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        try {
            const addFtTx = await stm.addSecTokenType(`FT_TEST3_${new Date().getTime()}`, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
                expiryTimestamp: DateTime.local().toMillis(), 
                       refCcyId: ccyTypes[0].id,
                   contractSize: 1000,
            }, CONST.nullAddr);
        }
        catch (ex) { assert(ex.reason == 'Bad underlyerTypeId', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT types - should not be able to add a future on invalid (non-spot) underlyer`, async () => {
        const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        const addFtTx_ok = await stm.addSecTokenType(`FT_TEST4_${new Date().getTime()}`, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
            expiryTimestamp: DateTime.local().toMillis(), underlyerTypeId: spotTypes[0].id, refCcyId: ccyTypes[0].id, contractSize: 1000,
        }, CONST.nullAddr);
        const ftTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.FUTURE);
        try {
            const addFtTx_err = await stm.addSecTokenType(`FT_TEST5_${new Date().getTime()}`, CONST.settlementType.FUTURE, {  ...CONST.nullFutureArgs,
                expiryTimestamp: DateTime.local().toMillis(), underlyerTypeId: ftTypes[0].id, refCcyId: ccyTypes[0].id, contractSize: 1000,
            }, CONST.nullAddr);
        }
        catch (ex) { assert(ex.reason == 'Bad underyler settlement type', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT types - should not be able to add a future with an invalid (non-existent) reference currency`, async () => {
        const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        try {
            const addFtTx = await stm.addSecTokenType(`FT_TEST6_${new Date().getTime()}`, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
                expiryTimestamp: DateTime.local().toMillis(), underlyerTypeId: spotTypes[0].id, refCcyId: 0, contractSize: 1000,
            }, CONST.nullAddr);
        }
    catch (ex) { assert(ex.reason == 'Bad refCcyId', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT types - should not be able to add a future with an invalid (> 10000) initial margin`, async () => {
        const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        try {
            const addFtTx = await stm.addSecTokenType(`FT_TEST6_${new Date().getTime()}`, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
                expiryTimestamp: DateTime.local().toMillis(), underlyerTypeId: spotTypes[0].id, refCcyId: ccyTypes[0].id, initMarginBips: 10001, contractSize: 1000,
            }, CONST.nullAddr);
        }
        catch (ex) { assert(ex.reason == 'Bad total margin', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT types - should not be able to add a future with an invalid (< 0) initial margin`, async () => {
        const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        try {
            const addFtTx = await stm.addSecTokenType(`FT_TEST6_${new Date().getTime()}`, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
                expiryTimestamp: DateTime.local().toMillis(), underlyerTypeId: spotTypes[0].id, refCcyId: ccyTypes[0].id, initMarginBips: -1, contractSize: 1000,
            }, CONST.nullAddr);
        }
        catch (ex) { assert(ex.reason == 'value out-of-bounds', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT types - should not be able to add a future with an invalid (> 10000) variation margin`, async () => {
        const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        try {
            const addFtTx = await stm.addSecTokenType(`FT_TEST6_${new Date().getTime()}`, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
                expiryTimestamp: DateTime.local().toMillis(), underlyerTypeId: spotTypes[0].id, refCcyId: ccyTypes[0].id, varMarginBips: 10001, contractSize: 1000,
            }, CONST.nullAddr);
        }
        catch (ex) { assert(ex.reason == 'Bad total margin', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT types - should not be able to add a future with an invalid (< 0) variation margin`, async () => {
        const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        try {
            const addFtTx = await stm.addSecTokenType(`FT_TEST6_${new Date().getTime()}`, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
                expiryTimestamp: DateTime.local().toMillis(), underlyerTypeId: spotTypes[0].id, refCcyId: ccyTypes[0].id, varMarginBips: -1, contractSize: 1000,
            }, CONST.nullAddr);
        }
        catch (ex) { assert(ex.reason == 'value out-of-bounds', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT types - should not be able to add a future with an invalid (0) contract size`, async () => {
        const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        try {
            const addFtTx = await stm.addSecTokenType(`FT_TEST6_${new Date().getTime()}`, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
                expiryTimestamp: DateTime.local().toMillis(), underlyerTypeId: spotTypes[0].id, refCcyId: ccyTypes[0].id, contractSize: 0,
            }, CONST.nullAddr);
        }
        catch (ex) { assert(ex.reason == 'Bad contractSize', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
});
