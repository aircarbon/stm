// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StTransferable.sol => TransferLib.sol
const st = artifacts.require('StMaster');
const CONST = require('../const.js');
const transferHelper = require('../test/transferHelper.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
        
        await setupHelper.whitelistAndSeal({ stm, accounts });
        await setupHelper.setDefaults({ stm, accounts });
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`TaddrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`trading - should allow two-sided (vST <-> ccy) transfer (A <-> B) across ledger entries`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,        CONST.oneEth_wei,        accounts[global.TaddrNdx + 1], 'TEST', );
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],       ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 750,                              tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                tokTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
        });
        assert(data.ledgerA_before.ccys.find(p => p.ccyTypeId == CONST.ccyType.ETH).balance == 0, 'unexpected ledger A currency before');
        assert(data.ledgerA_after.ccys.find(p => p.ccyTypeId == CONST.ccyType.ETH).balance > 0, 'unexpected ledger A currency after');
        assert(data.ledgerB_before.spot_sumQty == 0, 'unexpected ledger B ST quantity before');
        assert(data.ledgerB_after.spot_sumQty > 0, 'unexpected ledger B ST quantity after');
    });

    it(`trading - should allow two-sided (ccy <-> vST) transfer (A <-> B) across ledger entries`, async () => {
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,        CONST.oneEth_wei,        accounts[global.TaddrNdx + 0], 'TEST', );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        const data = await transferHelper.transferLedger({ stm, accounts, 
                 ledger_A: accounts[global.TaddrNdx + 0],         ledger_B: accounts[global.TaddrNdx + 1],
                    qty_A: 0,                                  tokTypeId_A: 0,
                    qty_B: 750,                                tokTypeId_B: CONST.tokenType.TOK_T2,
             ccy_amount_A: CONST.oneEth_wei,                   ccyTypeId_A: CONST.ccyType.ETH,
             ccy_amount_B: 0,                                  ccyTypeId_B: 0,
        });
        assert(data.ledgerA_before.spot_sumQty == 0, 'unexpected ledger A ST quantity before');
        assert(data.ledgerA_after.spot_sumQty > 0, 'unexpected ledger A ST quantity after');
        assert(data.ledgerB_before.ccys.find(p => p.ccyTypeId == CONST.ccyType.ETH).balance == 0, 'unexpected ledger B currency before');
        assert(data.ledgerB_after.ccys.find(p => p.ccyTypeId == CONST.ccyType.ETH).balance > 0, 'unexpected ledger B currency after');
    });

});