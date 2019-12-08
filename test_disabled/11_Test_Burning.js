const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;

    beforeEach(async () => {
        stm = await st.deployed();
        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${stm.address} (owner: ${accounts[0]}) - getSecTokenBatchCount: ${(await stm.getSecTokenBatchCount.call()).toString()}`);
    });

    // *** why burn 0.5 eeu costs more gas than burn 1.5 ?

    it('burning - should allow owner to burn half a vEEU', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        const ledgerBefore = await stm.getLedgerEntry(accounts[global.accountNdx]);
        const stId = ledgerBefore.tokens[0].stId;
        const eeuBefore = await stm.getSecToken(stId);
        const batch0_before = await stm.getSecTokenBatch(eeuBefore.batchId);
        assert(Number(batch0_before.burnedQty) == 0, 'unexpected burn KG value on batch before burn');

        // burn half an EEU
        const burnedKgBefore = await stm.getSecToken_totalBurnedQty.call();
        const burnKg = CONST.ktCarbon / 2;
        const a0_burnTx1 = await stm.burnTokens(accounts[global.accountNdx], CONST.tokenType.UNFCCC, burnKg);
        console.log(`\t>>> gasUsed - Burn 0.5 vEEU: ${a0_burnTx1.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * a0_burnTx1.receipt.gasUsed).toFixed(4)} (USD ${((CONST.gasPriceEth * a0_burnTx1.receipt.gasUsed).toFixed(4) * CONST.ethUsd).toFixed(4)}) ETH TX COST`);

        // validate burn partial EEU event
        //truffleAssert.prettyPrintEmittedEvents(a0_burnTx1);
        truffleAssert.eventEmitted(a0_burnTx1, 'BurnedPartialSecToken', ev => {
            return ev.stId == stId
                && ev.tokenTypeId == CONST.tokenType.UNFCCC
                && ev.ledgerOwner == accounts[global.accountNdx]
                && ev.burnedQty == burnKg
                ;
        });

        // check global total
        const burnedKgAfter = await stm.getSecToken_totalBurnedQty.call();
        assert(burnedKgAfter.toNumber() == burnedKgBefore.toNumber() + burnKg,'unexpected total burned KG');

        // check EEU
        const eeuAfter = await stm.getSecToken(stId);
        assert(Number(eeuAfter.currentQty) == Number(eeuAfter.mintedQty) / 2, 'unexpected remaining KG in EEU after burn');

        // check ledger
        const ledgerAfter = await stm.getLedgerEntry(accounts[global.accountNdx]);
        assert(ledgerAfter.tokens_sumQty == ledgerBefore.tokens_sumQty / 2, 'unexpected ledger KG after burn');

        // check batch
        const batchAfter = await stm.getSecTokenBatch(eeuAfter.batchId);
        assert(batchAfter.burnedQty == burnKg, 'unexpected batch burned KG value on batch after burn');
    });

    it('burning - should allow owner to burn a single full vEEU', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        const ledgerBefore = await stm.getLedgerEntry(accounts[global.accountNdx]);
        assert(ledgerBefore.tokens.length == 1, `unexpected ledger EEU entry before burn (${ledgerBefore.tokens.length})`);
        const stId = ledgerBefore.tokens[0].stId;
        const eeuBefore = await stm.getSecToken(stId);
        const batch0_before = await stm.getSecTokenBatch(eeuBefore.batchId);
        assert(Number(batch0_before.burnedQty) == 0, 'unexpected burn KG value on batch before burn');

        // burn a full (single) EEU
        const burnedKgBefore = await stm.getSecToken_totalBurnedQty.call();
        const burnKg = CONST.ktCarbon;
        const a0_burnTx1 = await stm.burnTokens(accounts[global.accountNdx], CONST.tokenType.UNFCCC, burnKg);
        console.log(`\t>>> gasUsed - Burn 1.0 vEEU: ${a0_burnTx1.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * a0_burnTx1.receipt.gasUsed).toFixed(4)} (USD ${((CONST.gasPriceEth * a0_burnTx1.receipt.gasUsed).toFixed(4) * CONST.ethUsd).toFixed(4)}) ETH TX COST`);

        // validate burn full EEU event
        //truffleAssert.prettyPrintEmittedEvents(a0_burnTx1);
        truffleAssert.eventEmitted(a0_burnTx1, 'BurnedFullSecToken', ev => {
            return ev.stId == stId
                && ev.tokenTypeId == CONST.tokenType.UNFCCC
                && ev.ledgerOwner == accounts[global.accountNdx]
                && ev.burnedQty == burnKg
                ;
        });

        // check global total
        const burnedKgAfter = await stm.getSecToken_totalBurnedQty.call();
        assert(burnedKgAfter.toNumber() == burnedKgBefore.toNumber() + burnKg, 'unexpected total burned KG');

        // check EEU
        const eeuAfter = await stm.getSecToken(stId);
        assert(eeuAfter.currentQty == 0, 'unexpected remaining KG in EEU after burn');

        // check ledger
        const ledgerAfter = await stm.getLedgerEntry(accounts[global.accountNdx]);
        assert(ledgerAfter.tokens_sumQty == 0, 'unexpected ledger KG after burn');
        assert(ledgerAfter.tokens.length == 0, 'unexpected ledger EEU entry after burn');

        // check batch
        const batchAfter = await stm.getSecTokenBatch(eeuAfter.batchId);
        assert(batchAfter.burnedQty == burnKg, 'unexpected batch burned KG value on batch after burn');
    });

    it('burning - should allow owner to burn 1.5 vEEUs', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon / 2, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon / 2, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        const ledgerBefore = await stm.getLedgerEntry(accounts[global.accountNdx]);
        //console.dir(ledgerBefore);
        assert(ledgerBefore.tokens.length == 2, `unexpected ledger EEU entry before burn (${ledgerBefore.tokens.length})`);
        const eeu0_before = await stm.getSecToken(ledgerBefore.tokens[0].stId);
        const eeu1_before = await stm.getSecToken(ledgerBefore.tokens[1].stId);
        const batch0_before = await stm.getSecTokenBatch(eeu0_before.batchId);
        const batch1_before = await stm.getSecTokenBatch(eeu1_before.batchId);
        assert(Number(batch0_before.burnedQty) == 0, 'unexpected burn KG value on batch 0 before burn');
        assert(Number(batch1_before.burnedQty) == 0, 'unexpected burn KG value on batch 1 before burn');

        // burn 1.5 eeus
        const burnedKgBefore = await stm.getSecToken_totalBurnedQty.call();
        const burnKg = (CONST.ktCarbon / 4) * 3;
        const expectRemainKg = CONST.ktCarbon - burnKg;
        const a0_burnTx1 = await stm.burnTokens(accounts[global.accountNdx], CONST.tokenType.UNFCCC, burnKg);
        console.log(`\t>>> gasUsed - Burn 1.5 vEEU: ${a0_burnTx1.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * a0_burnTx1.receipt.gasUsed).toFixed(4)} (USD ${((CONST.gasPriceEth * a0_burnTx1.receipt.gasUsed).toFixed(4) * CONST.ethUsd).toFixed(4)}) ETH TX COST`);

        // validate burn full EEU event
        //truffleAssert.prettyPrintEmittedEvents(a0_burnTx1);
        truffleAssert.eventEmitted(a0_burnTx1, 'BurnedFullSecToken', ev => { 
            return ev.stId == ledgerBefore.tokens[0].stId
                   && ev.tokenTypeId == CONST.tokenType.UNFCCC
                   && ev.ledgerOwner == accounts[global.accountNdx]
                   && ev.burnedQty == CONST.ktCarbon / 2
                   ;
        });
        truffleAssert.eventEmitted(a0_burnTx1, 'BurnedPartialSecToken', ev => { 
            return ev.stId == ledgerBefore.tokens[1].stId
                   && ev.tokenTypeId == CONST.tokenType.UNFCCC
                   && ev.ledgerOwner == accounts[global.accountNdx]
                   && ev.burnedQty == CONST.ktCarbon - expectRemainKg - CONST.ktCarbon / 2
                   ;
        });

        // check global total
        const burnedKgAfter = await stm.getSecToken_totalBurnedQty.call();
        assert(burnedKgAfter.toNumber() == burnedKgBefore.toNumber() + burnKg, 'unexpected total burned KG');

        // check EEUs
        const eeu0_After = await stm.getSecToken(ledgerBefore.tokens[0].stId);
        const eeu1_After = await stm.getSecToken(ledgerBefore.tokens[1].stId);
        assert(eeu0_After.currentQty == 0, 'unexpected remaining KG in EEU 0 after burn');
        assert(eeu1_After.currentQty == expectRemainKg, 'unexpected remaining KG in EEU 1 after burn');

        // check ledger
        const ledgerAfter = await stm.getLedgerEntry(accounts[global.accountNdx]);
        //console.dir(ledgerAfter);
        assert(ledgerAfter.tokens_sumQty == expectRemainKg, 'unexpected ledger KG after burn');
        assert(ledgerAfter.tokens.length == 1, 'unexpected ledger EEU entry after burn');

        // check batches
        const batch0_after = await stm.getSecTokenBatch(eeu0_before.batchId);
        assert(batch0_after.burnedQty == CONST.ktCarbon / 2, 'unexpected batch burned KG value on batch 0 after burn');
        
        const batch1_after = await stm.getSecTokenBatch(eeu1_before.batchId);
        assert(batch1_after.burnedQty == CONST.ktCarbon / 2 - expectRemainKg, 'unexpected batch burned KG value on batch 0 after burn');
    });

    it('burning - should allow owner to burn multiple vEEUs of the correct type', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.ktCarbon, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.ktCarbon, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.ktCarbon, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        
        const ledgerBefore = await stm.getLedgerEntry(accounts[global.accountNdx]);
        assert(ledgerBefore.tokens.length == 6, `unexpected ledger EEU entry before burn (${ledgerBefore.tokens.length})`);
        const unfcc_eeus = ledgerBefore.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC);
        const vcs_eeus = ledgerBefore.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS);

        // get UNFCCC batch IDs
        const unfccc_batch1 = await stm.getSecTokenBatch(unfcc_eeus[0].batchId);
        const unfccc_batch2 = await stm.getSecTokenBatch(unfcc_eeus[1].batchId);
        const unfccc_batch3 = await stm.getSecTokenBatch(unfcc_eeus[2].batchId);
        assert(unfccc_batch1.burnedQty == 0, 'unexpected burn KG value on unfccc_batch1 before burn');
        assert(unfccc_batch2.burnedQty == 0, 'unexpected burn KG value on unfccc_batch2 before burn');
        assert(unfccc_batch3.burnedQty == 0, 'unexpected burn KG value on unfccc_batch3 before burn');

        const vcs_batch4_before = await stm.getSecTokenBatch(vcs_eeus[0].batchId);
        const vcs_batch5_before = await stm.getSecTokenBatch(vcs_eeus[1].batchId);
        const vcs_batch6_before = await stm.getSecTokenBatch(vcs_eeus[2].batchId);
        assert(vcs_batch4_before.burnedQty == 0, 'unexpected burn KG value on vcs_batch4 before burn');
        assert(vcs_batch5_before.burnedQty == 0, 'unexpected burn KG value on vcs_batch5 before burn');
        assert(vcs_batch6_before.burnedQty == 0, 'unexpected burn KG value on vcs_batch6 before burn');

        // burn all VCS EEUs
        const burnedKgBefore = await stm.getSecToken_totalBurnedQty.call();
        const burnKg = CONST.ktCarbon * 3;
        const expectRemainKg = CONST.ktCarbon * 6 - burnKg;
        const burnTx = await stm.burnTokens(accounts[global.accountNdx], CONST.tokenType.VCS, burnKg);
        console.log(`\t>>> gasUsed - Burn 5.0 vEEU: ${burnTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * burnTx.receipt.gasUsed).toFixed(4)} (USD ${((CONST.gasPriceEth * burnTx.receipt.gasUsed).toFixed(4) * CONST.ethUsd).toFixed(4)}) ETH TX COST`);

        // validate burn full EEU event
        const burnedFullSecTokenEvents = []
        truffleAssert.eventEmitted(burnTx, 'BurnedFullSecToken', ev => { 
            burnedFullSecTokenEvents.push(ev);
            return vcs_eeus.some(p => ev.stId == p.stId);
        });
        assert(burnedFullSecTokenEvents.length == 3, 'unexpected full EEU burn event count');

        // check global total
        const burnedKgAfter = await stm.getSecToken_totalBurnedQty.call();
        assert(burnedKgAfter.toNumber() == burnedKgBefore.toNumber() + burnKg, 'unexpected total burned KG');

        // check EEUs
        for (var i = 0; i < vcs_eeus.length; i++) {
            const vcsSecTokenAfter = await stm.getSecToken(vcs_eeus[i].stId);
            assert(vcsSecTokenAfter.currentQty == 0, 'unexpected remaining KG in VCS EEU after burn');
        }

        // check ledger
        const ledgerAfter = await stm.getLedgerEntry(accounts[global.accountNdx]);
        assert(ledgerAfter.tokens_sumQty == expectRemainKg, 'unexpected ledger KG after burn');
        assert(ledgerAfter.tokens.length == 3, 'unexpected ledger EEU entry after burn');
        assert(ledgerAfter.tokens.every(p => p.tokenTypeId == CONST.tokenType.UNFCCC), 'unexpected eeu composition on ledger after burn');

        // check burned batches
        const vcs_batch4_after = await stm.getSecTokenBatch(vcs_batch4_before.id);
        const vcs_batch5_after = await stm.getSecTokenBatch(vcs_batch5_before.id);
        const vcs_batch6_after = await stm.getSecTokenBatch(vcs_batch6_before.id);
        assert(vcs_batch4_after.burnedQty == burnKg / 3, 'unexpected batch burned KG value on vcs_batch4_after');
        assert(vcs_batch5_after.burnedQty == burnKg / 3, 'unexpected batch burned KG value on vcs_batch5_after');
        assert(vcs_batch6_after.burnedQty == burnKg / 3, 'unexpected batch burned KG value on vcs_batch6_after');
    });

    it('burning - should not allow non-owner to burn EEUs', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        const a0_le = await stm.getLedgerEntry(accounts[global.accountNdx]);
        try {
            await stm.burnTokens(accounts[global.accountNdx], CONST.tokenType.UNFCCC, CONST.ktCarbon, { from: accounts[1], });
        } catch (ex) { 
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it('burning - should not allow burning for non-existent ledger owner', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        const a9_le = await stm.getLedgerEntry(accounts[9]);
        assert(a9_le.exists == false, 'expected non-existent ledger entry');
        try {
            await stm.burnTokens(accounts[9], CONST.tokenType.UNFCCC, CONST.ktCarbon);
        } catch (ex) { 
            assert(ex.reason == 'Bad ledgerOwner', `unexpected: ${ex.reason}`);
            return;
        }
        assert(false, 'expected contract exception');
    });

    it('burning - should not allow too small a tonnage', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        const a0_le = await stm.getLedgerEntry(accounts[global.accountNdx]);
        try {
            await stm.burnTokens(accounts[global.accountNdx], CONST.tokenType.UNFCCC, 0);
        } catch (ex) { 
            assert(ex.reason == 'Min. burnQty 1', `unexpected: ${ex.reason}`);
            return;
        }
        assert(false, 'expected contract exception');
    });

    it('burning - should not allow invalid tonnage', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        try {
            await stm.burnTokens(accounts[global.accountNdx], CONST.tokenType.UNFCCC, -1);
        } catch (ex) { 
            assert(ex.reason == 'Min. burnQty 1', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it('burning - should not allow non-existent tonnage (1)', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        try {
            await stm.burnTokens(accounts[global.accountNdx], CONST.tokenType.VCS, CONST.ktCarbon);
        } catch (ex) { 
            assert(ex.reason == 'Insufficient tokens', `unexpected: ${ex.reason}`);
            return;
        }
        assert(false, 'expected contract exception');
    });

    it('burning - should not allow non-existent tonnage (2)', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        await stm.burnTokens(accounts[global.accountNdx], CONST.tokenType.UNFCCC, CONST.ktCarbon);
        var ledger = await stm.getLedgerEntry(accounts[global.accountNdx]);
        try {
            await stm.burnTokens(accounts[global.accountNdx], CONST.tokenType.UNFCCC, CONST.ktCarbon);
        } catch (ex) { 
            assert(ex.reason == 'Insufficient tokens', `unexpected: ${ex.reason}`);
            return;
        }
        assert(false, 'expected contract exception');
    });

    it('burning - should not allow burning when contract is read only', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], CONST.nullFees, [], [], { from: accounts[0], });
        const a0_le = await stm.getLedgerEntry(accounts[global.accountNdx]);
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            await stm.burnTokens(accounts[global.accountNdx], CONST.tokenType.UNFCCC, CONST.ktCarbon, { from: accounts[0], });
        } catch (ex) { 
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            await stm.setReadOnly(false, { from: accounts[0] });
            return;
        }
        await stm.setReadOnly(false, { from: accounts[0] });
        assert.fail('expected contract exception');
    });
});
