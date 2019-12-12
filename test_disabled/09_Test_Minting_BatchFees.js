const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
//const _ = require('lodash');
const Big = require('big.js');
const BN = require('bn.js');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;

    beforeEach(async () => {
        stm = await st.deployed();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it('minting originator fee - should allow minting of originator fee on a batch', async () => {
        const M = accounts[global.TaddrNdx];
        const origFee = { fee_fixed: 1, fee_percBips: 10, fee_min: 1, fee_max: 10 }
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1, M, origFee, [], [], { from: accounts[0] });
        const batchId = await stm.getSecTokenBatchCount.call();
        const batch = await stm.getSecTokenBatch(batchId);
        assert(batch.originator == M, 'unexpected originator on minted batch');
        assert(batch.origTokFee.fee_fixed    == origFee.fee_fixed,     'unexpected originator fee_fixed on minted batch');
        assert(batch.origTokFee.fee_percBips == origFee.fee_percBips,  'unexpected originator fee_percBips on minted batch');
        assert(batch.origTokFee.fee_min      == origFee.fee_min,       'unexpected originator fee_min on minted batch');
        assert(batch.origTokFee.fee_max      == origFee.fee_max,       'unexpected originator fee_min on minted batch');
    });

    it('minting originator fee - should allow minting of collared, uncapped batch fee', async () => {
        const M = accounts[global.TaddrNdx];
        const origFee = { fee_fixed: 10, fee_percBips: 10, fee_min: 10, fee_max: 0 }
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1, M, origFee, [], [], { from: accounts[0] });
    });
    it('minting originator fee - should allow minting of uncollared, capped batch fee', async () => {
        const M = accounts[global.TaddrNdx];
        const origFee = { fee_fixed: 10, fee_percBips: 10, fee_min: 0, fee_max: 10 }
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1, M, origFee, [], [], { from: accounts[0] });
    });

    it('minting originator fee - should allow decreasing of collared, uncapped batch fee', async () => {
        const M = accounts[global.TaddrNdx];
        const origFee1 = { fee_fixed: 100, fee_percBips: 10, fee_min: 10, fee_max: 0 }
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.tonCarbon, 1, M, origFee1, [], [],   { from: accounts[0] });
        const batchId = await stm.getSecTokenBatchCount.call();

        var origFee2 = { fee_fixed: 100, fee_percBips: 10, fee_min: 9, fee_max: 0 }
        await stm.setOriginatorFeeTokenBatch(batchId, origFee2, { from: accounts[0] });
    });

    it('minting originator fee - should allow decreasing of batch fee after minting', async () => {
        const M = accounts[global.TaddrNdx];
        const origFee1 = { fee_fixed: 10, fee_percBips: 10, fee_min: 10, fee_max: 10 }
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.tonCarbon, 1, M, origFee1, [], [],   { from: accounts[0] });
        const batchId = await stm.getSecTokenBatchCount.call();
        var origFee2;

        origFee2 = { fee_fixed: 9, fee_percBips: 9, fee_min: 9, fee_max: 9 }; // set all fields down
        await stm.setOriginatorFeeTokenBatch(batchId, origFee2, { from: accounts[0] });
        const batch = await stm.getSecTokenBatch(batchId);
        assert(batch.originator == M, 'unexpected originator on minted batch');
        assert(batch.origTokFee.fee_fixed    == origFee2.fee_fixed,    'unexpected originator fee_fixed on minted batch');
        assert(batch.origTokFee.fee_percBips == origFee2.fee_percBips, 'unexpected originator fee_percBips on minted batch');
        assert(batch.origTokFee.fee_min      == origFee2.fee_min,      'unexpected originator fee_min on minted batch');
        assert(batch.origTokFee.fee_max      == origFee2.fee_max,      'unexpected originator fee_min on minted batch');

        origFee2 = { fee_fixed: 8, fee_percBips: 9,  fee_min: 9, fee_max: 9 }; // set one field down - fee_fixed
        await stm.setOriginatorFeeTokenBatch(batchId, origFee2, { from: accounts[0] });
        
        origFee2 = { fee_fixed: 8, fee_percBips: 8,  fee_min: 9, fee_max: 9 }; // set one field down - fee_percBips
        await stm.setOriginatorFeeTokenBatch(batchId, origFee2, { from: accounts[0] });

        origFee2 = { fee_fixed: 8, fee_percBips: 8,  fee_min: 8, fee_max: 9 }; // set one field down - fee_min
        await stm.setOriginatorFeeTokenBatch(batchId, origFee2, { from: accounts[0] });
        
        origFee2 = { fee_fixed: 8, fee_percBips: 8,  fee_min: 8, fee_max: 8 }; // set one field down - fee_max
        await stm.setOriginatorFeeTokenBatch(batchId, origFee2, { from: accounts[0] });

        origFee2 = { fee_fixed: 8, fee_percBips: 8,  fee_min: 8, fee_max: 8 }; // all fields unchanged
        await stm.setOriginatorFeeTokenBatch(batchId, origFee2, { from: accounts[0] });
    });

    it('minting originator fee - should not allow increasing of batch fees after minting (fee_fixed)', async () => {
        const M = accounts[global.TaddrNdx];
        const origFee1 = { fee_fixed: 1, fee_percBips: 10, fee_min: 1, fee_max: 10 }
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.tonCarbon, 1, M, origFee1, [], [],   { from: accounts[0] });
        const batchId = await stm.getSecTokenBatchCount.call();
        var origFee2;

        origFee2 = { fee_fixed: 2, fee_percBips: 10, fee_min: 1, fee_max: 10 };
        try { await stm.setOriginatorFeeTokenBatch(batchId, origFee2, { from: accounts[0] }); assert.fail('expected contract exception'); }
        catch (ex) { assert(ex.reason == 'Bad fee args', `unexpected: ${ex.reason}`); }

        origFee2 = { fee_fixed: 1, fee_percBips: 11, fee_min: 1, fee_max: 10 };
        try { await stm.setOriginatorFeeTokenBatch(batchId, origFee2, { from: accounts[0] }); assert.fail('expected contract exception'); }
        catch (ex) { assert(ex.reason == 'Bad fee args', `unexpected: ${ex.reason}`); }

        origFee2 = { fee_fixed: 1, fee_percBips: 10, fee_min: 2, fee_max: 10 };
        try { await stm.setOriginatorFeeTokenBatch(batchId, origFee2, { from: accounts[0] }); assert.fail('expected contract exception'); }
        catch (ex) { assert(ex.reason == 'Bad fee args', `unexpected: ${ex.reason}`); }

        origFee2 = { fee_fixed: 1, fee_percBips: 10, fee_min: 2, fee_max: 11 };
        try { await stm.setOriginatorFeeTokenBatch(batchId, origFee2, { from: accounts[0] }); assert.fail('expected contract exception'); }
        catch (ex) { assert(ex.reason == 'Bad fee args', `unexpected: ${ex.reason}`); }
    });

    it('minting originator fee - should not allow non-owner to edit batch fee after minting', async () => {
        const M = accounts[global.TaddrNdx];
        const origFee1 = { fee_fixed: 1, fee_percBips: 10, fee_min: 1, fee_max: 10 };
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.tonCarbon, 1, M, origFee1, [], [],   { from: accounts[0] });
        const batchId = await stm.getSecTokenBatchCount.call();
        
        const origFee2 = { fee_fixed: 0, fee_percBips: 10, fee_min: 1, fee_max: 10 };
        try {
            await stm.setOriginatorFeeTokenBatch(batchId, origFee2, { from: accounts[1] })
        } catch (ex) { assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it('minting originator fee - should not allow minting batch fee cap < collar', async () => {
        const M = accounts[global.TaddrNdx];
        var origFee;
        origFee = { fee_fixed: 1, fee_percBips: 10, fee_min: 10, fee_max: 0 }; // no cap
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.tonCarbon, 1, M, origFee, [], [],       { from: accounts[0] });
        try {
            origFee = { fee_fixed: 1, fee_percBips: 10, fee_min: 10, fee_max: 5 }; // bad cap < collar
            await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.tonCarbon, 1, M, origFee, [], [],   { from: accounts[0] });
        } catch (ex) { assert(ex.reason == 'Bad fee args', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it('minting originator fee - should not allow setting of batch fee cap < collar', async () => {
        const M = accounts[global.TaddrNdx];
        var origFee;

        origFee = { fee_fixed: 1, fee_percBips: 10, fee_min: 10, fee_max: 0 }; // no cap
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.tonCarbon, 1, M, origFee, [], [],       { from: accounts[0] });
        const batchId = await stm.getSecTokenBatchCount.call();
        origFee = { fee_fixed: 1, fee_percBips: 10, fee_min: 9, fee_max: 0 }; // edit down - no cap
        await stm.setOriginatorFeeTokenBatch(batchId, origFee,                                         { from: accounts[0] });
        
        try {
            origFee = { fee_fixed: 1, fee_percBips: 10, fee_min: 9, fee_max: 8 }; // bad cap < collar
            await stm.setOriginatorFeeTokenBatch(batchId, origFee,                                     { from: accounts[0] });
        } catch (ex) { assert(ex.reason == 'Bad fee args', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');        
    });

    it('minting originator fee - should not allow minting batch fee basis points > 10000', async () => {
        const M = accounts[global.TaddrNdx];
        try {
            const origFee = { fee_fixed: 1, fee_percBips: 10001, fee_min: 10, fee_max: 0 }; // bad basis points
            await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.tonCarbon, 1, M, origFee, [], [],   { from: accounts[0] });
        } catch (ex) { assert(ex.reason == 'Bad fee args', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');        
    });
    it('minting originator fee - should not allow setting of batch fee basis points > 10000', async () => {
        const M = accounts[global.TaddrNdx];
        var origFee;
        origFee = { fee_fixed: 1, fee_percBips: 10, fee_min: 10, fee_max: 0 };
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.tonCarbon, 1, M, origFee, [], [],       { from: accounts[0] });
        const batchId = await stm.getSecTokenBatchCount.call();
        
        try {
            origFee = { fee_fixed: 1, fee_percBips: 10001, fee_min: 10, fee_max: 0 }; // bad basis points
            await stm.setOriginatorFeeTokenBatch(batchId, origFee,                                     { from: accounts[0] });
        } catch (ex) { assert(ex.reason == 'Bad fee args', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');        
    });
});
