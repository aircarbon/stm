const ac = artifacts.require('AcMaster');
const CONST = require('../const.js');
const helper = require('./transferHelper.js');

contract('AcMaster', accounts => {
    var acm;

    beforeEach(async () => {
        acm = await ac.deployed();

        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx += 2;
        //console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${acm.address} (owner: ${accounts[0]}) - getEeuBatchCount: ${(await acm.getEeuBatchCount.call()).toString()}`);
    });

    it('trading - should allow two-sided (vEEU <-> ccy) transfer (A <-> B) across ledger entries', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,        accounts[global.accountNdx + 1],         { from: accounts[0] });
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 750,                              eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
        });
        assert(data.ledgerA_before.ccys.find(p => p.typeId == CONST.ccyType.ETH).balance == 0, 'unexpected ledger A currency before');
        assert(data.ledgerA_after.ccys.find(p => p.typeId == CONST.ccyType.ETH).balance > 0, 'unexpected ledger A currency after');
        assert(data.ledgerB_before.eeu_sumKG == 0, 'unexpected ledger B EEU tonnage before');
        assert(data.ledgerB_after.eeu_sumKG > 0, 'unexpected ledger B EEU tonnage after');
    });

    it('trading - should allow two-sided (ccy <-> vEEU) transfer (A <-> B) across ledger entries', async () => {
        await acm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,        accounts[global.accountNdx + 0],         { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                eeuTypeId_A: 0,
                    kg_B: 750,                              eeuTypeId_B: CONST.eeuType.VCS,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        assert(data.ledgerA_before.eeu_sumKG == 0, 'unexpected ledger A EEU tonnage before');
        assert(data.ledgerA_after.eeu_sumKG > 0, 'unexpected ledger A EEU tonnage after');
        assert(data.ledgerB_before.ccys.find(p => p.typeId == CONST.ccyType.ETH).balance == 0, 'unexpected ledger B currency before');
        assert(data.ledgerB_after.ccys.find(p => p.typeId == CONST.ccyType.ETH).balance > 0, 'unexpected ledger B currency after');
    });

    it('trading - should have reasonable gas cost for two-sided transfer', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], ['dummyKey'], ['dummyValue'], { from: accounts[0] });
        await acm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,        accounts[global.accountNdx + 1],         { from: accounts[0] });
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 750,                              eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
        });
        console.log(`\t>>> gasUsed - 0.5 vEEU trade eeu/ccy (A <-> B): ${data.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

});