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
        console.log(`global.global.accountNdx: ${global.accountNdx} - beforeEach: ${acm.address} - getEeuBatchCount: ${(await acm.getEeuBatchCount.call()).toString()}`);
    });

    // todo: test withdraw too much (no negative)
    
    it('withdrawing - should allow withdrawing of USD', async () => {
        await acm.fund(CONST.ccyType.USD, 100, accounts[global.accountNdx], { from: accounts[0] });
        await withdrawLedger({ ccyTypeId: CONST.ccyType.USD, amount: 50, withdrawer: accounts[global.accountNdx]});
    });

    /*it('withdrawing - should allow withdrawing of large values of USD', async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.USD, amount: CONST.millionUsd_cents.multiply(1000) , receiver: accounts[global.accountNdx]});
    });

    it('withdrawing - should allow withdrawing of ETH', async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.ETH, amount: CONST.oneEth_wei, receiver: accounts[global.accountNdx]});
    });

    it('withdrawing - should allow withdrawing of large values of ETH', async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.ETH, amount: CONST.millionEth_wei, receiver: accounts[global.accountNdx]});
    });

    it('withdrawing - should allow withdrawing of insane values of ETH', async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.ETH, amount: CONST.millionEth_wei.multiply(1000), receiver: accounts[global.accountNdx]});
    });

    it('withdrawing - should allow repeated withdrawing', async () => {
        for (var i=0 ; i < 10 ; i++) {
            await fundLedger({ ccyTypeId: CONST.ccyType.USD, amount: CONST.thousandUsd_cents, receiver: accounts[global.accountNdx]});
        }
    });

    it('withdrawing - should have reasonable gas cost for withdrawing', async () => {
        const fundTx = await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents, accounts[global.accountNdx], { from: accounts[0] });
        console.log(`gasUsed - Funding: ${fundTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * fundTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * fundTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('withdrawing - should allow minting and withdrawing on same ledger entry', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.mtCarbon, 2, accounts[global.accountNdx], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents, accounts[global.accountNdx], { from: accounts[0] });
        const ledgerEntryAfter = await acm.getLedgerEntry(accounts[global.accountNdx]);

        assert(ledgerEntryAfter.eeus.length == 2, 'unexpected eeu count in ledger entry after minting & funding');
        assert(Number(ledgerEntryAfter.eeu_sumKG) == Number(CONST.mtCarbon), 'invalid kg sum in ledger entry after minting & funding');
        assert(ledgerEntryAfter.ccys.find(p => p.typeId == CONST.ccyType.USD).balance == CONST.thousandUsd_cents, 'unexpected usd balance in ledger entry after minting & funding');
    });*/

    async function withdrawLedger({ ccyTypeId, amount, withdrawer }) {
        var ledgerEntryBefore, ledgerEntryAfter;

        ledgerEntryBefore = await acm.getLedgerEntry(withdrawer);
        const totalWithdrawnBefore = await acm.getTotalWithdrawn.call(ccyTypeId);
        
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
        const totalWithdrawnAfter = await acm.getTotalWithdrawn.call(ccyTypeId);
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
});