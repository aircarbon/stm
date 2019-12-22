const st = artifacts.require('StMaster');
const CONST = require('../const.js');
const helper = require('../test/transferHelper.js');

contract("StMaster", accounts => {
    var stm;

    before(async () => {
        stm = await st.deployed();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
        
        for (let i=0 ; i < 60 ; i++) { // whitelist enough accounts for the tests
            await stm.whitelist(accounts[global.TaddrNdx + i]);
        }
        await stm.sealContract();
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`TaddrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it('trading - should allow two-sided (vST <-> ccy) transfer (A <-> B) across ledger entries', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.TaddrNdx + 1],                         { from: accounts[0] });
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],       ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 750,                            tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
        });
        assert(data.ledgerA_before.ccys.find(p => p.ccyTypeId == CONST.ccyType.ETH).balance == 0, 'unexpected ledger A currency before');
        assert(data.ledgerA_after.ccys.find(p => p.ccyTypeId == CONST.ccyType.ETH).balance > 0, 'unexpected ledger A currency after');
        assert(data.ledgerB_before.tokens_sumQty == 0, 'unexpected ledger B ST quantity before');
        assert(data.ledgerB_after.tokens_sumQty > 0, 'unexpected ledger B ST quantity after');
    });

    it('trading - should allow two-sided (ccy <-> vST) transfer (A <-> B) across ledger entries', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.TaddrNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });
        const data = await helper.transferLedger({ stm, accounts, 
                 ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                    qty_A: 0,                                tokenTypeId_A: 0,
                    qty_B: 750,                              tokenTypeId_B: CONST.tokenType.VCS,
             ccy_amount_A: CONST.oneEth_wei,                   ccyTypeId_A: CONST.ccyType.ETH,
             ccy_amount_B: 0,                                  ccyTypeId_B: 0,
        });
        assert(data.ledgerA_before.tokens_sumQty == 0, 'unexpected ledger A ST quantity before');
        assert(data.ledgerA_after.tokens_sumQty > 0, 'unexpected ledger A ST quantity after');
        assert(data.ledgerB_before.ccys.find(p => p.ccyTypeId == CONST.ccyType.ETH).balance == 0, 'unexpected ledger B currency before');
        assert(data.ledgerB_after.ccys.find(p => p.ccyTypeId == CONST.ccyType.ETH).balance > 0, 'unexpected ledger B currency after');
    });

    it('trading - should have reasonable gas cost for two-sided transfer', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.TaddrNdx + 1],                         { from: accounts[0] });
        const data = await helper.transferLedger({ stm, accounts, 
                 ledger_A: accounts[global.TaddrNdx + 0],       ledger_B: accounts[global.TaddrNdx + 1],
                    qty_A: 500,                              tokenTypeId_A: CONST.tokenType.VCS,
                    qty_B: 0,                                tokenTypeId_B: 0,
             ccy_amount_A: 0,                                  ccyTypeId_A: 0,
             ccy_amount_B: CONST.oneEth_wei,                   ccyTypeId_B: CONST.ccyType.ETH,
        });
        CONST.logGas(data.transferTx, `0.5 vST trade eeu/ccy (A <-> B)`);
    });
});