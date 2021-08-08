// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StMintable.sol => LedgerLib.sol, SpotFeeLib.sol
const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
//const _ = require('lodash');
const Big = require('big.js');
const BN = require('bn.js');
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

    it(`minting originator ccy fee - should allow minting with a batch originator currency fee on a batch`, async () => {
        const M = accounts[global.TaddrNdx];
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1, M, CONST.nullFees, 100, [], [], { from: accounts[0] });
        const batchId = await stm.getSecTokenBatch_MaxId.call();
        const batch = await stm.getSecTokenBatch(batchId);
        assert(batch.originator == M, 'unexpected originator on minted batch');
        assert(batch.origCcyFee_percBips_ExFee == 100, 'unexpected originator currency on minted batch');
    });

    it(`minting originator ccy fee - should allow decreasing of batch currency fee on a batch`, async () => {
        const M = accounts[global.TaddrNdx];
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, M, CONST.nullFees, 100, [], [], { from: accounts[0] });
        const batchId = await stm.getSecTokenBatch_MaxId.call();
        await stm.setOriginatorFeeCurrencyBatch(batchId, 50, { from: accounts[0] });
    });

    it(`minting originator ccy fee - should not allow increasing of batch currency fee after minting`, async () => {
        const M = accounts[global.TaddrNdx];
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, M, CONST.nullFees, 100, [], [], { from: accounts[0] });
        const batchId = await stm.getSecTokenBatch_MaxId.call();
        var origFee2;

        try { await stm.setOriginatorFeeCurrencyBatch(batchId, 101, { from: accounts[0] }); assert.fail('expected contract exception'); }
        catch (ex) { assert(ex.reason == 'Bad fee args', `unexpected: ${ex.reason}`); }
    });

    it(`minting originator ccy fee - should not allow non-owner to edit batch currency fee after minting`, async () => {
        const M = accounts[global.TaddrNdx];
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, M, CONST.nullFees, 100, [], [], { from: accounts[0] });
        const batchId = await stm.getSecTokenBatch_MaxId.call();
        try {
            await stm.setOriginatorFeeCurrencyBatch(batchId, 101, { from: accounts[10] })
        } catch (ex) { assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`minting originator ccy fee - should not allow minting batch currency fee basis points > 10000`, async () => {
        const M = accounts[global.TaddrNdx];
        try {
            await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, M, CONST.nullFees, 10001, [], [], { from: accounts[0] });
        } catch (ex) { assert(ex.reason == 'Bad fee args', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');        
    });
    it(`minting originator ccy fee - should not allow setting of batch currency fee basis points > 10000`, async () => {
        const M = accounts[global.TaddrNdx];
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, M, CONST.nullFees, 100, [], [], { from: accounts[0] });
        const batchId = await stm.getSecTokenBatch_MaxId.call();
        try {
            await stm.setOriginatorFeeCurrencyBatch(batchId, 10001, { from: accounts[0] });
        } catch (ex) { assert(ex.reason == 'Bad fee args', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');        
    });
});
