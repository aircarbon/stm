const ac = artifacts.require('AcMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract('AcMaster', accounts => {
    var acm;//, global.accountNdx = 50;

    beforeEach(async () => {
        acm = await ac.deployed();
        //console.log('acm.address', acm.address);
        //const ver = await acm.version();
        //assert.equal(ver, "0.0.3", "test version");
        //const eeuCount = await acm.getEeuMintedCount.call();
        //console.log('eeuCount', eeuCount);

        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx++;
        console.log(`global.global.accountNdx: ${global.accountNdx} - beforeEach: ${acm.address} - getEeuBatchCount: ${(await acm.getEeuBatchCount.call()).toString()}`);
    });

    // *** why burn 0.5 eeu costs more gas than burn 1.5 ?

    it('burning - should allow owner to burn half a vEEU', async () => {
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        const ledgerBefore = await acm.getLedgerEntry(accounts[global.accountNdx]);
        const eeuId = ledgerBefore.eeus[0].eeuId;
        const eeuBefore = await acm.getEeu(eeuId);
        const batch0_before = await acm.getEeuBatch(eeuBefore.batchId);
        assert(Number(batch0_before.burnedKG) == 0, 'unexpected burn KG value on batch before burn');

        // burn half an EEU
        const burnedKgBefore = await acm.getKgCarbonBurned.call();
        const burnKg = CONST.ktCarbon / 2;
        const a0_burnTx1 = await acm.retireCarbon(accounts[global.accountNdx], CONST.eeuType.UNFCCC, burnKg);
        console.log(`gasUsed - Burn 0.5 vEEU: ${a0_burnTx1.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * a0_burnTx1.receipt.gasUsed).toFixed(4)} (USD ${((CONST.gasPriceEth * a0_burnTx1.receipt.gasUsed).toFixed(4) * CONST.ethUsd).toFixed(4)}) ETH TX COST`);

        // validate burn partial EEU event
        //truffleAssert.prettyPrintEmittedEvents(a0_burnTx1);
        truffleAssert.eventEmitted(a0_burnTx1, 'BurnedPartialEeu', ev => {
            return ev.eeuId == eeuId
                && ev.eeuTypeId == CONST.eeuType.UNFCCC
                && ev.ledgerOwner == accounts[global.accountNdx]
                && ev.burnedKG == burnKg
                ;
        });

        // check global total
        const burnedKgAfter = await acm.getKgCarbonBurned.call();
        assert(burnedKgAfter.toNumber() == burnedKgBefore.toNumber() + burnKg,'unexpected total burned KG');

        // check EEU
        const eeuAfter = await acm.getEeu(eeuId);
        assert(Number(eeuAfter.KG) == Number(eeuAfter.mintedKG) / 2, 'unexpected remaining KG in EEU after burn');

        // check ledger
        const ledgerAfter = await acm.getLedgerEntry(accounts[global.accountNdx]);
        assert(ledgerAfter.eeu_sumKG == ledgerBefore.eeu_sumKG / 2, 'unexpected ledger KG after burn');

        // check batch
        const batchAfter = await acm.getEeuBatch(eeuAfter.batchId);
        assert(batchAfter.burnedKG == burnKg, 'unexpected batch burned KG value on batch after burn');
    });

    it('burning - should allow owner to burn a single full vEEU', async () => {
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        const ledgerBefore = await acm.getLedgerEntry(accounts[global.accountNdx]);
        assert(ledgerBefore.eeus.length == 1, `unexpected ledger EEU entry before burn (${ledgerBefore.eeus.length})`);
        const eeuId = ledgerBefore.eeus[0].eeuId;
        const eeuBefore = await acm.getEeu(eeuId);
        const batch0_before = await acm.getEeuBatch(eeuBefore.batchId);
        assert(Number(batch0_before.burnedKG) == 0, 'unexpected burn KG value on batch before burn');

        // burn a full (single) EEU
        const burnedKgBefore = await acm.getKgCarbonBurned.call();
        const burnKg = CONST.ktCarbon;
        const a0_burnTx1 = await acm.retireCarbon(accounts[global.accountNdx], CONST.eeuType.UNFCCC, burnKg);
        console.log(`gasUsed - Burn 1.0 vEEU: ${a0_burnTx1.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * a0_burnTx1.receipt.gasUsed).toFixed(4)} (USD ${((CONST.gasPriceEth * a0_burnTx1.receipt.gasUsed).toFixed(4) * CONST.ethUsd).toFixed(4)}) ETH TX COST`);

        // validate burn full EEU event
        //truffleAssert.prettyPrintEmittedEvents(a0_burnTx1);
        truffleAssert.eventEmitted(a0_burnTx1, 'BurnedFullEeu', ev => {
            return ev.eeuId == eeuId
                && ev.eeuTypeId == CONST.eeuType.UNFCCC
                && ev.ledgerOwner == accounts[global.accountNdx]
                && ev.burnedKG == burnKg
                ;
        });

        // check global total
        const burnedKgAfter = await acm.getKgCarbonBurned.call();
        assert(burnedKgAfter.toNumber() == burnedKgBefore.toNumber() + burnKg, 'unexpected total burned KG');

        // check EEU
        const eeuAfter = await acm.getEeu(eeuId);
        assert(eeuAfter.KG == 0, 'unexpected remaining KG in EEU after burn');

        // check ledger
        const ledgerAfter = await acm.getLedgerEntry(accounts[global.accountNdx]);
        assert(ledgerAfter.eeu_sumKG == 0, 'unexpected ledger KG after burn');
        assert(ledgerAfter.eeus.length == 0, 'unexpected ledger EEU entry after burn');

        // check batch
        const batchAfter = await acm.getEeuBatch(eeuAfter.batchId);
        assert(batchAfter.burnedKG == burnKg, 'unexpected batch burned KG value on batch after burn');
    });

    it('burning - should allow owner to burn 1.5 vEEUs', async () => {
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon / 2, 1, accounts[global.accountNdx], { from: accounts[0], });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon / 2, 1, accounts[global.accountNdx], { from: accounts[0], });
        const ledgerBefore = await acm.getLedgerEntry(accounts[global.accountNdx]);
        //console.dir(ledgerBefore);
        assert(ledgerBefore.eeus.length == 2, `unexpected ledger EEU entry before burn (${ledgerBefore.eeus.length})`);
        const eeu0_before = await acm.getEeu(ledgerBefore.eeus[0].eeuId);
        const eeu1_before = await acm.getEeu(ledgerBefore.eeus[1].eeuId);
        const batch0_before = await acm.getEeuBatch(eeu0_before.batchId);
        const batch1_before = await acm.getEeuBatch(eeu1_before.batchId);
        assert(Number(batch0_before.burnedKG) == 0, 'unexpected burn KG value on batch 0 before burn');
        assert(Number(batch1_before.burnedKG) == 0, 'unexpected burn KG value on batch 1 before burn');

        // burn 1.5 eeus
        const burnedKgBefore = await acm.getKgCarbonBurned.call();
        const burnKg = (CONST.ktCarbon / 4) * 3;
        const expectRemainKg = CONST.ktCarbon - burnKg;
        const a0_burnTx1 = await acm.retireCarbon(accounts[global.accountNdx], CONST.eeuType.UNFCCC, burnKg);
        console.log(`gasUsed - Burn 1.5 vEEU: ${a0_burnTx1.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * a0_burnTx1.receipt.gasUsed).toFixed(4)} (USD ${((CONST.gasPriceEth * a0_burnTx1.receipt.gasUsed).toFixed(4) * CONST.ethUsd).toFixed(4)}) ETH TX COST`);

        // validate burn full EEU event
        //truffleAssert.prettyPrintEmittedEvents(a0_burnTx1);
        truffleAssert.eventEmitted(a0_burnTx1, 'BurnedFullEeu', ev => { 
            return ev.eeuId == ledgerBefore.eeus[0].eeuId
                   && ev.eeuTypeId == CONST.eeuType.UNFCCC
                   && ev.ledgerOwner == accounts[global.accountNdx]
                   && ev.burnedKG == CONST.ktCarbon / 2
                   ;
        });
        truffleAssert.eventEmitted(a0_burnTx1, 'BurnedPartialEeu', ev => { 
            return ev.eeuId == ledgerBefore.eeus[1].eeuId
                   && ev.eeuTypeId == CONST.eeuType.UNFCCC
                   && ev.ledgerOwner == accounts[global.accountNdx]
                   && ev.burnedKG == CONST.ktCarbon - expectRemainKg - CONST.ktCarbon / 2
                   ;
        });

        // check global total
        const burnedKgAfter = await acm.getKgCarbonBurned.call();
        assert(burnedKgAfter.toNumber() == burnedKgBefore.toNumber() + burnKg, 'unexpected total burned KG');

        // check EEUs
        const eeu0_After = await acm.getEeu(ledgerBefore.eeus[0].eeuId);
        const eeu1_After = await acm.getEeu(ledgerBefore.eeus[1].eeuId);
        assert(eeu0_After.KG == 0, 'unexpected remaining KG in EEU 0 after burn');
        assert(eeu1_After.KG == expectRemainKg, 'unexpected remaining KG in EEU 1 after burn');

        // check ledger
        const ledgerAfter = await acm.getLedgerEntry(accounts[global.accountNdx]);
        //console.dir(ledgerAfter);
        assert(ledgerAfter.eeu_sumKG == expectRemainKg, 'unexpected ledger KG after burn');
        assert(ledgerAfter.eeus.length == 1, 'unexpected ledger EEU entry after burn');

        // check batches
        const batch0_after = await acm.getEeuBatch(eeu0_before.batchId);
        assert(batch0_after.burnedKG == CONST.ktCarbon / 2, 'unexpected batch burned KG value on batch 0 after burn');
        
        const batch1_after = await acm.getEeuBatch(eeu1_before.batchId);
        assert(batch1_after.burnedKG == CONST.ktCarbon / 2 - expectRemainKg, 'unexpected batch burned KG value on batch 0 after burn');
    });

    // TODO: fix/cleanup (post 1 eeu max per minting change)
    /*it('burning - should allow owner to burn multiple vEEUs of the correct type', async () => {
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        const ledgerBefore = await acm.getLedgerEntry(accounts[global.accountNdx]);
        assert(ledgerBefore.eeus.length == 10, `unexpected ledger EEU entry before burn (${ledgerBefore.eeus.length})`);
        const unfcc_eeus = ledgerBefore.eeus.filter(p => p.eeuTypeId == CONST.eeuType.UNFCCC);
        const vcs_eeus = ledgerBefore.eeus.filter(p => p.eeuTypeId == CONST.eeuType.VCS);

        const batch0_Before = await acm.getEeuBatch(unfcc_eeus[0].batchId);
        assert(batch0_Before.burnedKG == 0, 'unexpected burn KG value on batch 0 before burn');

        const batch1_Before = await acm.getEeuBatch(vcs_eeus[0].batchId);
        assert(batch1_Before.burnedKG == 0, 'unexpected burn KG value on batch 1 before burn');

        // burn all VCS EEUs
        const burnedKgBefore = await acm.getKgCarbonBurned.call();
        const burnKg = CONST.ktCarbon;
        const expectRemainKg = CONST.ktCarbon - burnKg;
        const a0_burnTx1 = await acm.retireCarbon(accounts[global.accountNdx], CONST.eeuType.VCS, burnKg);
        console.log(`gasUsed - Burn 5.0 vEEU: ${a0_burnTx1.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * a0_burnTx1.receipt.gasUsed).toFixed(4)} (USD ${((CONST.gasPriceEth * a0_burnTx1.receipt.gasUsed).toFixed(4) * CONST.ethUsd).toFixed(4)}) ETH TX COST`);

        // validate burn full EEU event
        //truffleAssert.prettyPrintEmittedEvents(a0_burnTx1);
        truffleAssert.eventEmitted(a0_burnTx1, 'BurnedFullEeu', ev => vcs_eeus.some(p => ev.eeuId == p.eeuId));

        // check global total
        const burnedKgAfter = await acm.getKgCarbonBurned.call();
        assert(burnedKgAfter.toNumber() == burnedKgBefore.toNumber() + burnKg, 'unexpected total burned KG');

        // check EEUs
        for (var i = 0; i < 5; i++) {
            const eeu_batch1_After = await acm.getEeu(ledgerBefore.eeus[5 + i].eeuId);
            assert(eeu_batch1_After.KG == 0, 'unexpected remaining KG in EEU after burn');
        }

        // check ledger
        const ledgerAfter = await acm.getLedgerEntry(accounts[global.accountNdx]);
        assert(ledgerAfter.eeu_sumKG == CONST.ktCarbon, 'unexpected ledger KG after burn');
        assert(ledgerAfter.eeus.length == 5, 'unexpected ledger EEU entry after burn');

        // check batch
        const batchAfter = await acm.getEeuBatch(batch1_Before.id);
        assert(batchAfter.burnedKG == burnKg, 'unexpected batch burned KG value on batch after burn');
    });*/

    it('burning - should not allow non-owner to burn EEUs', async () => {
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        const a0_le = await acm.getLedgerEntry(accounts[global.accountNdx]);
        try {
            await acm.retireCarbon(accounts[global.accountNdx], CONST.eeuType.UNFCCC, CONST.ktCarbon, { from: accounts[1], });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('burning - should not allow burning for non-existent ledger owner', async () => {
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        const a9_le = await acm.getLedgerEntry(accounts[9]);
        assert(a9_le.exists == false, 'expected non-existent ledger entry');
        try {
            await acm.retireCarbon(accounts[9], CONST.eeuType.UNFCCC, CONST.ktCarbon);
        } catch (ex) { return; }
        assert(false, 'expected restriction exception');
    });

    it('burning - should not allow too small a tonnage', async () => {
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        const a0_le = await acm.getLedgerEntry(accounts[global.accountNdx]);
        try {
            await acm.retireCarbon(accounts[global.accountNdx], CONST.eeuType.UNFCCC, CONST.tonCarbon / 2);
        } catch (ex) { return; }
        assert(false, 'expected restriction exception');
    });

    it('burning - should not allow invalid tonnage', async () => {
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        try {
            await acm.retireCarbon(accounts[global.accountNdx], CONST.eeuType.UNFCCC, -1);
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('burning - should not allow non-existent tonnage (1)', async () => {
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        try {
            await acm.retireCarbon(accounts[global.accountNdx], CONST.eeuType.VCS, CONST.ktCarbon);
        } catch (ex) { return; }
        assert(false, 'expected restriction exception');
    });

    it('burning - should not allow non-existent tonnage (2)', async () => {
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        await acm.retireCarbon(accounts[global.accountNdx], CONST.eeuType.UNFCCC, CONST.ktCarbon);
        var ledger = await acm.getLedgerEntry(accounts[global.accountNdx]);
        try {
            await acm.retireCarbon(accounts[global.accountNdx], CONST.eeuType.UNFCCC, CONST.ktCarbon);
        } catch (ex) { return; }
        assert(false, 'expected restriction exception');
    });
});
