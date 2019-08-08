const BigNumber = require('big-number');
const ac = artifacts.require('AcMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract('AcMaster', accounts => {
    var acm, accountNdx = 30;

    beforeEach(async () => {
        acm = await ac.deployed();
        accountNdx++;
        console.log(`beforeEach: ${acm.address} getEeuBatchCount`, (await acm.getEeuBatchCount.call()));
    });
    
    it('funding - should allow funding of USD', async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.USD, amount: CONST.thousandUsd_cents, receiver: accounts[accountNdx]});
    });

    it('funding - should allow funding of large values of USD', async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.USD, amount: CONST.millionUsd_cents.multiply(1000) , receiver: accounts[accountNdx]});
    });

    it('funding - should allow funding of ETH', async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.ETH, amount: CONST.oneEth_wei, receiver: accounts[accountNdx]});
    });

    it('funding - should allow funding of large values of ETH', async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.ETH, amount: CONST.millionEth_wei, receiver: accounts[accountNdx]});
    });

    it('funding - should allow funding of insane values of ETH', async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.ETH, amount: CONST.millionEth_wei.multiply(1000), receiver: accounts[accountNdx]});
    });

    it('funding - should allow repeated funding', async () => {
        for (var i=0 ; i < 10 ; i++) {
            await fundLedger({ ccyTypeId: CONST.ccyType.USD, amount: CONST.thousandUsd_cents, receiver: accounts[accountNdx]});
        }
    });

    it('funding - should have reasonable gas cost for funding', async () => {
        const fundTx = await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents, accounts[accountNdx], { from: accounts[0] });
        console.log(`gasUsed - Funding: ${fundTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * fundTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * fundTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('funding - should allow minting and funding on same ledger entry', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS, CONST.mtCarbon, 2, accounts[accountNdx], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents, accounts[accountNdx], { from: accounts[0] });
        const ledgerEntryAfter = await acm.getLedgerEntry(accounts[accountNdx]);

        assert(ledgerEntryAfter.eeus.length == 2, 'unexpected eeu count in ledger entry after minting & funding');
        assert(Number(ledgerEntryAfter.eeu_sumKG) == Number(CONST.mtCarbon), 'invalid kg sum in ledger entry after minting & funding');
        assert(ledgerEntryAfter.ccys.find(p => p.typeId == CONST.ccyType.USD).balance == CONST.thousandUsd_cents, 'unexpected usd balance in ledger entry after minting & funding');
    });

    async function fundLedger({ ccyTypeId, amount, receiver }) {
        var ledgerEntryBefore, ledgerEntryAfter;

        ledgerEntryBefore = await acm.getLedgerEntry(receiver);
        const totalFundedBefore = await acm.getTotalFunded.call(ccyTypeId);
        
        // fund
        const fundTx = await acm.fund(ccyTypeId, amount, receiver, { from: accounts[0] });
        ledgerEntryAfter = await acm.getLedgerEntry(receiver);
        
        // validate funded event
        truffleAssert.eventEmitted(fundTx, 'FundedLedger', ev => {
            return ev.ccyTypeId == ccyTypeId
                && ev.ledgerOwner == receiver
                && ev.amount.toString() == amount.toString()
                ;
        });
        
        // validate ledger balance is updated for test ccy
        assert(ledgerEntryAfter.ccys.find(p => p.typeId == ccyTypeId).balance == 
               Number(ledgerEntryBefore.ccys.find(p => p.typeId == ccyTypeId).balance) + Number(amount),
               'unexpected ledger balance after funding for test ccy');

        // validate ledger balance unchanged for other ccy's
        assert(ledgerEntryAfter.ccys
               .filter(p => p.typeId != ccyTypeId)
               .every(p => p.balance == ledgerEntryBefore.ccys.find(p2 => p2.typeId == p.typeId).balance),
               'unexpected ledger balance after funding for ccy non-test ccy');

        // validate global total funded is updated
        const totalFundedAfter = await acm.getTotalFunded.call(ccyTypeId);
        assert(totalFundedAfter - totalFundedBefore == amount, 'unexpected total funded after funding');
    }

    it('funding - should not allow non-owner to fund a ledger entry', async () => {
        try {
            await acm.fund(CONST.ccyType.USD, 100, accounts[accountNdx], { from: accounts[1] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('funding - should not allow non-existent currency types', async () => {
        try {
            await acm.fund(9999, 100, accounts[accountNdx], { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('funding - should not allow invalid amounts (1)', async () => {
        try {
            await acm.fund(CONST.ccyType.USD, 0, accounts[accountNdx], { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('funding - should not allow invalid amounts (2)', async () => {
        try {
            await acm.fund(CONST.ccyType.USD, -1, accounts[accountNdx], { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

});