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

    it('trading eeu - should have reasonable gas cost for two-sided 0.5 vEEU / ccy transfer (A <-> B), aka. trade', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,                   accounts[global.accountNdx + 1], { from: accounts[0] });
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 750,                              eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
        });
        console.log(`gasUsed - 0.5 vEEU trade eeu/ccy (A <-> B): ${data.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    // ...

    
    
});