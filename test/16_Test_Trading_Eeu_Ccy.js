const ac = artifacts.require('AcMaster');
const CONST = require('../const.js');
const helper = require('./transferHelper.js');

contract('AcMaster', accounts => {
    var acm;

    beforeEach(async () => {
        acm = await ac.deployed();

        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx += 2;
        console.log(`global.global.accountNdx: ${global.accountNdx} - beforeEach: ${acm.address} - getEeuBatchCount: ${(await acm.getEeuBatchCount.call()).toString()}`);
    });

    // two-sided mixed transfer (trade): kg for ccy, x3 as above
    // ...

    /*
     it('transferring ccy - should not allow two-sided transfer (A <-> B) of invalid currency values', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1], 0, 0, 0, 0, 
                -1,                          // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                -1,                          // ccy_amount_B
                CONST.ccyType.USD,           // ccyTypeId_B
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });    

    it('transferring eeu - should not allow two-sided transfer (A <-> B) of currency values in excess of the balances', async () => {
        await acm.fund(CONST.ccyType.USD, CONST.thousandUsd_cents,       accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.accountNdx + 1], { from: accounts[0] });
        try {
            await acm.transfer(
                accounts[global.accountNdx + 0], accounts[global.accountNdx + 1],
                0, 0, 0, 0, 
                CONST.millionUsd_cents,      // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                CONST.thousandEth_wei,       // ccy_amount_B
                CONST.ccyType.ETH,           // ccyTypeId_B
                { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });*/
    
});