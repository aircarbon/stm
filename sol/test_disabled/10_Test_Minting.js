// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StMintable.sol => LedgerLib.sol, SpotFeeLib.sol
const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
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

    it(`minting - should allow owner to mint a single-vST batch`, async () => {
        await mintBatch({ tokenType: CONST.tokenType.TOK_T1, qtyUnit: CONST.GT_CARBON * 100, qtySecTokens: 1, receiver: accounts[global.TaddrNdx], });
    });

    // DEPRECATD: no multi ST batch minting
    //it(`minting - should allow owner to mint a multi-vST (2) batch`, async () => {
    //    await mintBatch({ tokenType: CONST.tokenType.TOK_T1, qtyUnit: CONST.GT_CARBON * 100, qtySecTokens: 2, receiver: accounts[global.TaddrNdx], });
    //});

    it(`minting - should allow owner to mint a minimum-sized token (one ton)`, async () => {
        await mintBatch({ tokenType: CONST.tokenType.TOK_T1, qtyUnit: CONST.KT_CARBON * 1, qtySecTokens: 1, receiver: accounts[global.TaddrNdx], });
    });

    it(`minting - should allow owner to mint a megatoken (10 gigatons)`, async () => {
        await mintBatch({ tokenType: CONST.tokenType.TOK_T1, qtyUnit: CONST.GT_CARBON * 10, qtySecTokens: 1, receiver: accounts[global.TaddrNdx], });
    });

    it(`minting - should allow owner to mint different vST-types`, async () => {
        await mintBatch({ tokenType: CONST.tokenType.TOK_T1, qtyUnit: CONST.GT_CARBON * 100, qtySecTokens: 1, receiver: accounts[global.TaddrNdx], });
        await mintBatch({ tokenType: CONST.tokenType.TOK_T2, qtyUnit: CONST.GT_CARBON * 100, qtySecTokens: 1, receiver: accounts[global.TaddrNdx], });
    });

    it(`minting - should allow minting of multiple batches to the same receiver`, async () => {
        const batchIds = [];
        var totalMintedQty = 0;
        var totalMintedSecTokens = 0;
        for (var i = 0; i < 3; i++) {
            const qtyUnit = (i + 1) * 2 * CONST.KT_CARBON;
            const qtySecTokens = 1;
            const batchId = await mintBatch({ tokenType: CONST.tokenType.TOK_T1, qtyUnit, qtySecTokens, receiver: accounts[global.TaddrNdx] });
            totalMintedQty += qtyUnit;
            totalMintedSecTokens += qtySecTokens;
            batchIds.push(batchId);
        }

        var totalBatchQtyTok = 0;
        for (i = 0; i < batchIds.length; i++) {
            const batchId = batchIds[i];
            const batch = await stm.getSecTokenBatch(batchId);
            totalBatchQtyTok += Number(batch.mintedQty);
        }
        assert(totalBatchQtyTok == totalMintedQty, 'invalid total kg in minted batches');

        const ledgerEntryAfter = await stm.getLedgerEntry(accounts[global.TaddrNdx]);
        assert(ledgerEntryAfter.tokens.length == totalMintedSecTokens, 'invalid eeu qty in ledger entry');
    });


    it(`minting - should not allow non-owner to mint vST batches`, async () => {
        try {
            await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1, accounts[global.TaddrNdx], CONST.nullFees, 0, [], [], { from: accounts[10], });
        } catch (ex) { 
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`minting - should not allow non-existent vST-type to be minted`, async () => {
        try {
            await stm.mintSecTokenBatch(999, CONST.KT_CARBON, 1, accounts[global.TaddrNdx], CONST.nullFees, 0, [], [], { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad tokTypeId', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`minting - should not allow multi-vST minting`, async () => {
        try {
            await mintBatch({ tokenType: CONST.tokenType.TOK_T1, qtyUnit: CONST.KT_CARBON, qtySecTokens: 2, receiver: accounts[global.TaddrNdx], });
        } catch (ex) { 
            assert(ex.reason == 'Set mintSecTokenCount 1', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });    

    // it(`minting - should not allow non-integer TONS carbon in an vST`, async () => {
    //     try {
    //         await mintBatch({ tokenType: CONST.tokenType.TOK_T1, qtyUnit: CONST.KT_CARBON, qtySecTokens: 3, receiver: accounts[global.TaddrNdx], });
    //     } catch (ex) { return; }
    //     assert.fail('expected contract exception');
    // });

    it(`minting - should not allow minting invalid (0) token units (1)`, async () => {
        try {
            await mintBatch( { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 0, qtySecTokens: 1, receiver: accounts[global.TaddrNdx] });
        } catch (ex) { 
            assert(ex.reason == 'Bad mintQty', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`minting - should not allow minting invalid (-1) token units (2)`, async () => {
        try {
            await mintBatch( { tokenType: CONST.tokenType.TOK_T1, qtyUnit: -1, qtySecTokens: 1, receiver: accounts[global.TaddrNdx] });
        } catch (ex) { 
            assert(ex.reason == 'value out-of-bounds', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`minting - should not allow minting invalid (2^64) token units (3)`, async () => {
        try {
            const qty = Big(2).pow(64);//.minus(1);
            const M = accounts[global.TaddrNdx];
            await mintBatch({ tokenType: CONST.tokenType.TOK_T1, qtyUnit: qty.toString(), qtySecTokens: 1, receiver: accounts[global.TaddrNdx] });
        } catch (ex) {
            assert(ex.reason == 'Bad mintQty', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`minting - should not allow minting invalid vST quantities (1)`, async () => {
        try {
            await mintBatch({ tokenType: CONST.tokenType.TOK_T1, qtyUnit: CONST.KT_CARBON, qtySecTokens: 0, receiver: accounts[global.TaddrNdx], });
        } catch (ex) { 
            assert(ex.reason == 'Set mintSecTokenCount 1', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`minting - should not allow invalid minting vST quantities (2)`, async () => {
        try {
            await mintBatch({ tokenType: CONST.tokenType.TOK_T1, qtyUnit: CONST.KT_CARBON, qtySecTokens: -1, receiver: accounts[global.TaddrNdx], });
        } catch (ex) {
            assert(ex.reason == 'Set mintSecTokenCount 1', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`minting - should not allow minting when contract is read only`, async () => {
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            await mintBatch({ tokenType: CONST.tokenType.TOK_T1, qtyUnit: CONST.KT_CARBON, qtySecTokens: 1, receiver: accounts[global.TaddrNdx], });
        } catch (ex) {
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            await stm.setReadOnly(false, { from: accounts[0] });
            return;
        }
        await stm.setReadOnly(false, { from: accounts[0] });
        assert.fail('expected contract exception');
    });

    async function mintBatch({ tokenType, qtyUnit, qtySecTokens, receiver }) {
        var batchId = -1;

        const ledgerEntryBefore = await stm.getLedgerEntry(receiver);
        const ledgerOwnersBefore = await stm.getLedgerOwners();

        // mint new vST match
        const maxBatchIdBefore = (await stm.getSecTokenBatch_MaxId.call()).toNumber();
        const mintTx = await stm.mintSecTokenBatch(
            tokenType, 
            qtyUnit, 
            qtySecTokens, 
            receiver, 
            CONST.nullFees, 0, [], [],
            //0, 
        { from: accounts[0] });

        // validate batch ID
        const maxBatchIdAfter = (await stm.getSecTokenBatch_MaxId.call()).toNumber();
        assert(maxBatchIdAfter == maxBatchIdBefore + 1, 'unexpected batch id after minting');

        // validate batch minted event
        truffleAssert.eventEmitted(mintTx, 'Minted', ev => {
            batchId = Number(ev.batchId);
            return ev.batchId == maxBatchIdAfter
                && ev.tokTypeId == tokenType
                && ev.to == receiver
                && ev.mintQty == qtyUnit
                && ev.mintSecTokenCount == qtySecTokens
                ;
        });
        const batch = await stm.getSecTokenBatch(batchId);
        assert(batch.mintedQty == qtyUnit, 'invalid batch minted kg');
        assert(batch.tokTypeId == tokenType, 'invalid batch eeu-type');

        // validate vST(s) minted events
        const curMaxSecTokenId = (await stm.getSecToken_MaxId.call()).toNumber();
        for (var eeuCount = 1; eeuCount < 1 + qtySecTokens; eeuCount++) {
            truffleAssert.eventEmitted(mintTx, 'MintedSecToken', ev => {
                //console.log(`event: MintedSecToken ev.id=${ev.id} curMaxSecTokenId=${curMaxSecTokenId} ev.mintedQty=${ev.mintedQty}`);
                return ev.stId > curMaxSecTokenId - qtySecTokens && ev.stId <= curMaxSecTokenId
                    && ev.batchId == batchId
                    && ev.tokTypeId == tokenType
                    && ev.to == receiver
                    && ev.mintedQty == qtyUnit / qtySecTokens
                    ;
            });
        }

        // validate ledger owner list
        const ledgerOwnersAfter = await stm.getLedgerOwners();
        assert(ledgerOwnersAfter.some(p => p == receiver), 'invalid ledger owners list data');

        // validate the ledger entry
        const ledgerEntryAfter = await stm.getLedgerEntry(receiver);
        assert(ledgerEntryAfter.exists == true, 'missing ledger entry for receiver');
        assert(ledgerEntryAfter.tokens.length == ledgerEntryBefore.tokens.length + qtySecTokens, 'invalid eeu qty in ledger entry');
        assert(ledgerEntryAfter.tokens.map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0) ==
               ledgerEntryBefore.tokens.map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0) + qtyUnit,
               'invalid kg in ledger entry eeus');
        assert(Number(ledgerEntryAfter.spot_sumQty) == Number(ledgerEntryBefore.spot_sumQty) + qtyUnit, 'invalid kg sum ledger entry');

        // validate STs minted
        for (var ndx = ledgerEntryBefore.tokens.length; ndx < ledgerEntryAfter.tokens.length; ndx++) {
            const stId = ledgerEntryAfter.tokens[ndx].stId;
            const eeu = await stm.getSecToken(stId);
            assert(eeu.exists == true, 'missing vST after minting');
            assert(eeu.batchId == batchId, 'unexpected vST batch after minting');
            //assert(eeu.mintedTimestamp != 0, 'missing mint timestamp on vST after minting');
            assert(eeu.mintedQty == qtyUnit / qtySecTokens, 'unexpected vST minted TONS value after minting');
            assert(eeu.currentQty == qtyUnit / qtySecTokens, 'unexpected vST remaining (unburned) TONS value after minting');
        }

        // validate total minted field
        assert(ledgerEntryAfter.spot_sumQtyMinted - ledgerEntryBefore.spot_sumQtyMinted == qtyUnit, 'unexpected spot_sumQtyMinted before vs. after');

        return batchId;
    }
});
