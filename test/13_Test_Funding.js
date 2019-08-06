const BigNumber = require('big-number');
const ac = artifacts.require('AcMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract('AcMaster', accounts => {
    var acm, accountNdx = 1;

    beforeEach(async () => {
        acm = await ac.deployed();
        accountNdx++;
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

    // todo: test mint first then fund 
    // todo: add ccy type then fund

    async function fundLedger({ ccyTypeId, amount, receiver }) {
        var ledgerEntryBefore, ledgerEntryAfter;

        ledgerEntryBefore = await acm.getLedgerEntry(receiver);
        const totalFundedBefore = await acm.getTotalFunded.call(ccyTypeId);
        
        // fund
        const fundTx = await acm.fund(ccyTypeId, amount, receiver, { from: accounts[0] });
        ledgerEntryAfter = await acm.getLedgerEntry(receiver);
        
        // validate funded event
        truffleAssert.eventEmitted(fundTx, 'FundedLedger', ev => {
            //console.dir(BigNumber(ev.amount));
            //console.dir(ev.amount.toString());
            //console.dir(amount.toString());
            //console.dir(BigNumber(amount));
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

    /*it('funding - should not allow non-owner to fund a ledger entry', async () => {
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
    });*/

});