const BigNumber = require('big-number');
const ac = artifacts.require('AcMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract('AcMaster', accounts => {
    var acm;//, accountNdx = 250;

    beforeEach(async () => {
        acm = await ac.deployed();

        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx++;
        //console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${acm.address} (owner: ${accounts[0]}) - getEeuBatchCount: ${(await acm.getEeuBatchCount.call()).toString()}`);
    });

    it('withdrawing - should allow withdrawing of USD', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents * 2, accounts[global.accountNdx], { from: accounts[0] });
        await withdrawLedger({ ccyTypeId: CONST.ccyType.USD, amount: CONST.thousandUsd_cents * 2, withdrawer: accounts[global.accountNdx]});
    });

    it('withdrawing - should allow withdrawing of extreme values of USD', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.millionUsd_cents * 1000 * 1000, accounts[global.accountNdx], { from: accounts[0] });
        await withdrawLedger({ ccyTypeId: CONST.ccyType.USD, amount: CONST.millionUsd_cents * 1000 * 1000, withdrawer: accounts[global.accountNdx] });
    });

    it('withdrawing - should allow withdrawing of ETH', async () => {
        await acm.fund(CONST.ccyType.ETH, CONST.oneEth_wei, accounts[global.accountNdx], { from: accounts[0] });
        await withdrawLedger({ ccyTypeId: CONST.ccyType.ETH, amount: CONST.oneEth_wei, withdrawer: accounts[global.accountNdx] });
    });

    it('withdrawing - should allow withdrawing of extreme values of ETH', async () => {
        await acm.fund(CONST.ccyType.ETH, CONST.millionEth_wei, accounts[global.accountNdx], { from: accounts[0] });
        await withdrawLedger({ ccyTypeId: CONST.ccyType.ETH, amount: CONST.millionEth_wei, withdrawer: accounts[global.accountNdx] });
    });

    it('withdrawing - should allow repeated withdrawing', async () => {
        await acm.fund(CONST.ccyType.USD, 3, accounts[global.accountNdx]);
        for (var i=0 ; i < 3 ; i++) {
            await withdrawLedger({ ccyTypeId: CONST.ccyType.USD, amount: 1, withdrawer: accounts[global.accountNdx] });
        }
        const ledger = await acm.getLedgerEntry(accounts[global.accountNdx]);
        assert(ledger.ccys.find(p => p.typeId == CONST.ccyType.USD).balance == 0, 'unexpected ledger balance after repeated withdrawing');
    });

    it('withdrawing - should have reasonable gas cost for withdrawing', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents, accounts[global.accountNdx], { from: accounts[0] });
        const withdrawTx = await acm.withdraw(CONST.ccyType.USD, CONST.thousandUsd_cents, accounts[global.accountNdx], { from: accounts[0] });
        console.log(`\t>>> gasUsed - Withdrawing: ${withdrawTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * withdrawTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * withdrawTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('withdrawing - should allow minting, funding and withdrawing on same ledger entry', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.mtCarbon, 1, accounts[global.accountNdx], [], [], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents, accounts[global.accountNdx],           { from: accounts[0] });
        await withdrawLedger({ ccyTypeId: CONST.ccyType.USD, amount: CONST.thousandUsd_cents / 2, withdrawer: accounts[global.accountNdx] });
        const ledgerEntryAfter = await acm.getLedgerEntry(accounts[global.accountNdx]);

        assert(ledgerEntryAfter.eeus.length == 1, 'unexpected eeu count in ledger entry after minting, funding & withdrawing');
        assert(Number(ledgerEntryAfter.eeu_sumKG) == Number(CONST.mtCarbon), 'invalid kg sum in ledger entry after minting, funding & withdrawing');
        assert(ledgerEntryAfter.ccys.find(p => p.typeId == CONST.ccyType.USD).balance == CONST.thousandUsd_cents / 2, 'unexpected usd balance in ledger entry after minting, funding & withdrawing');
    });

    async function withdrawLedger({ ccyTypeId, amount, withdrawer }) {
        var ledgerEntryBefore, ledgerEntryAfter;

        ledgerEntryBefore = await acm.getLedgerEntry(withdrawer);
        const totalWithdrawnBefore = await acm.getTotalCcyWithdrawn.call(ccyTypeId);
        
        // withdraw
        const withdrawTx = await acm.withdraw(ccyTypeId, amount, withdrawer, { from: accounts[0] });
        ledgerEntryAfter = await acm.getLedgerEntry(withdrawer);
        truffleAssert.eventEmitted(withdrawTx, 'CcyWithdrewLedger', ev => {
            return ev.ccyTypeId == ccyTypeId
                && ev.ledgerOwner == withdrawer
                && ev.amount.toString() == amount.toString()
                ;
        });

        // validate ledger balance is updated for test ccy
        assert(ledgerEntryAfter.ccys.find(p => p.typeId == ccyTypeId).balance == 
               Number(ledgerEntryBefore.ccys.find(p => p.typeId == ccyTypeId).balance) - Number(amount),
               'unexpected ledger balance after withdrawing for test ccy');

        // validate ledger balance unchanged for other ccy's
        assert(ledgerEntryAfter.ccys
               .filter(p => p.typeId != ccyTypeId)
               .every(p => p.balance == ledgerEntryBefore.ccys.find(p2 => p2.typeId == p.typeId).balance),
               'unexpected ledger balance after withdrawing for ccy non-test ccy');

        // validate global total funded is updated
        const totalWithdrawnAfter = await acm.getTotalCcyWithdrawn.call(ccyTypeId);
        assert(totalWithdrawnAfter - totalWithdrawnBefore == amount, 'unexpected total withdrawn after withdrawal');
    }

    it('withdrawing - should not allow non-owner to withdrawing from a ledger entry', async () => {
        try {
            await acm.withdraw(CONST.ccyType.USD, 100, accounts[global.accountNdx], { from: accounts[1] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('withdrawing - should not allow non-existent currency types', async () => {
        try {
            await acm.withdraw(9999, 100, accounts[global.accountNdx], { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('withdrawing - should not allow invalid amounts (1)', async () => {
        try {
            await acm.withdraw(CONST.ccyType.USD, 0, accounts[global.accountNdx], { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('withdrawing - should not allow invalid amounts (2)', async () => {
        try {
            await acm.withdraw(CONST.ccyType.USD, -1, accounts[global.accountNdx], { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('withdrawing - should not allow withdrawing beyond available balance', async () => {
        await acm.fund(CONST.ccyType.USD, 100, accounts[global.accountNdx], { from: accounts[0] });
        try {
            await withdrawLedger({ ccyTypeId: CONST.ccyType.USD, amount: 101, withdrawer: accounts[global.accountNdx]});
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('withdrawing - should not allow withdrawing when contract is read only', async () => {
        await acm.fund(CONST.ccyType.USD, 100, accounts[global.accountNdx], { from: accounts[0] });
        try {
            await acm.setReadOnly(true, { from: accounts[0] });
            await withdrawLedger({ ccyTypeId: CONST.ccyType.USD, amount: 50, withdrawer: accounts[global.accountNdx]});
        } catch (ex) { 
            await acm.setReadOnly(false, { from: accounts[0] });
            return;
        }
        await acm.setReadOnly(false, { from: accounts[0] });
        assert.fail('expected restriction exception');
    });
});