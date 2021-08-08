// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: CcyCollateralizable.sol => CcyLib.sol
const BigNumber = require('big-number');
const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
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
    
    it(`funding - should allow funding of USD`, async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.USD, amount: CONST.thousandCcy_cents, receiver: accounts[global.TaddrNdx]});
    });
    it(`funding - should allow funding of extreme values of USD`, async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.USD, amount: CONST.millionCcy_cents * 1000 * 1000, receiver: accounts[global.TaddrNdx]});
    });

    it(`funding - should allow funding of ETH`, async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.ETH, amount: CONST.oneEth_wei, receiver: accounts[global.TaddrNdx]});
    });
    it(`funding - should allow funding of extreme values of ETH`, async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.ETH, amount: CONST.millionEth_wei, receiver: accounts[global.TaddrNdx]});
    });

    it(`funding - should allow funding of BTC`, async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.BTC, amount: CONST.oneBtc_sat, receiver: accounts[global.TaddrNdx]});
    });
    it(`funding - should allow funding of extreme values of BTC`, async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.BTC, amount: CONST.millionBtc_sat, receiver: accounts[global.TaddrNdx]});
    });

    it(`funding - should allow funding of USD`, async () => {
        await fundLedger({ ccyTypeId: CONST.ccyType.USD, amount: CONST.thousandCcy_cents, receiver: accounts[global.TaddrNdx]});
    });
    // it(`funding - should allow funding of EUR`, async () => {
    //     await fundLedger({ ccyTypeId: CONST.ccyType.EUR, amount: CONST.thousandCcy_cents, receiver: accounts[global.TaddrNdx]});
    // });
    // it(`funding - should allow funding of HKD`, async () => {
    //     await fundLedger({ ccyTypeId: CONST.ccyType.HKD, amount: CONST.thousandCcy_cents, receiver: accounts[global.TaddrNdx]});
    // });
    // it(`funding - should allow funding of GBP`, async () => {
    //     await fundLedger({ ccyTypeId: CONST.ccyType.GBP, amount: CONST.thousandCcy_cents, receiver: accounts[global.TaddrNdx]});
    // });

    it(`funding - should allow repeated funding`, async () => {
        for (var i=0 ; i < 10 ; i++) {
            await fundLedger({ ccyTypeId: CONST.ccyType.USD, amount: CONST.thousandCcy_cents, receiver: accounts[global.TaddrNdx]});
        }
    });

    it(`funding - should allow minting and funding on same ledger entry`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1, accounts[global.TaddrNdx], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.thousandCcy_cents, accounts[global.TaddrNdx], 'TEST');
        const ledgerEntryAfter = await stm.getLedgerEntry(accounts[global.TaddrNdx]);

        assert(ledgerEntryAfter.tokens.length == 1, 'unexpected eeu count in ledger entry after minting & funding');
        assert(Number(ledgerEntryAfter.spot_sumQty) == Number(CONST.GT_CARBON), 'invalid kg sum in ledger entry after minting & funding');
        assert(ledgerEntryAfter.ccys.find(p => p.ccyTypeId == CONST.ccyType.USD).balance == CONST.thousandCcy_cents, 'unexpected usd balance in ledger entry after minting & funding');
    });

    it(`funding - should not allow non-owner to fund a ledger entry`, async () => {
        try {
            await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, 100, accounts[global.TaddrNdx], 'TEST', { from: accounts[10] });
        } catch (ex) { 
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`funding - should not allow non-existent currency types`, async () => {
        try {
            await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, 9999, 100, accounts[global.TaddrNdx], 'TEST', { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad ccyTypeId', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`funding - should not allow invalid amounts`, async () => {
        try {
            await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, -1, accounts[global.TaddrNdx], 'TEST', { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad amount', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`funding - should not allow when contract is read only`, async () => {
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, 100, accounts[global.TaddrNdx], 'TEST', { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            await stm.setReadOnly(false, { from: accounts[0] });
            return;
        }
        await stm.setReadOnly(false, { from: accounts[0] });
        assert.fail('expected contract exception');
    });
    
    async function fundLedger({ ccyTypeId, amount, receiver }) {
        var ledgerEntryBefore, ledgerEntryAfter;

        ledgerEntryBefore = await stm.getLedgerEntry(receiver);
        //const totalFundedBefore = await stm.getTotalCcyFunded.call(ccyTypeId);
        
        // fund
        const fundTx = await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, ccyTypeId, amount, receiver, 'TEST', { from: accounts[0] });
        ledgerEntryAfter = await stm.getLedgerEntry(receiver);
        truffleAssert.eventEmitted(fundTx, 'CcyFundedLedger', ev => {
            return ev.ccyTypeId == ccyTypeId
                && ev.to == receiver
                && ev.amount.toString() == amount.toString()
                ;
        });
        
        // validate ledger balance is updated for test ccy
        assert(ledgerEntryAfter.ccys.find(p => p.ccyTypeId == ccyTypeId).balance == 
               Number(ledgerEntryBefore.ccys.find(p => p.ccyTypeId == ccyTypeId).balance) + Number(amount),
               'unexpected ledger balance after funding for test ccy');

        // validate ledger balance unchanged for other ccy's
        assert(ledgerEntryAfter.ccys
               .filter(p => p.ccyTypeId != ccyTypeId)
               .every(p => p.balance == ledgerEntryBefore.ccys.find(p2 => p2.ccyTypeId == p.ccyTypeId).balance),
               'unexpected ledger balance after funding for ccy non-test ccy');

        // validate global total funded is updated
        //const totalFundedAfter = await stm.getTotalCcyFunded.call(ccyTypeId);
        //assert(totalFundedAfter - totalFundedBefore == amount, 'unexpected total funded after funding');
    }

});