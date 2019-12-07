const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');
const helper = require('../test/transferHelper.js');
const BN = require('bn.js');
const Big = require('big.js');
const Web3 = require('web3');
const web3 = new Web3();

contract("StMaster", accounts => {
    var stm;

    const ORIG_FEES_VCS_B1 = { fee_fixed: 10, fee_percBips: 1000, fee_min: 0, fee_max: 10 };
    const ORIG_FEES_VCS_B2 = { fee_fixed: 20, fee_percBips: 2000, fee_min: 0, fee_max: 20 };

    beforeEach(async () => {
        stm = await st.deployed();
        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx += 3;
        if (CONST.logTestAccountUsage)
            console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${stm.address} (owner: ${accounts[0]}) - getSecTokenBatchCount: ${(await stm.getSecTokenBatchCount.call()).toString()}`);

        // mint for M ([0]), move all to A ([1]) for test setup
        const M = accounts[global.accountNdx + 0];
        const A = accounts[global.accountNdx + 1];
        const B = accounts[global.accountNdx + 2];

        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      M, ORIG_FEES_VCS_B1, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      M, ORIG_FEES_VCS_B2, [], [], { from: accounts[0] });

        // M -> A: no fees
        const MA_qty = 2000;
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        A,                    { from: accounts[0] });
        await stm.setFee_TokType(CONST.tokenType.VCS,       CONST.nullAddr,          CONST.nullFees);
        await stm.setFee_CcyType(CONST.ccyType.ETH,         CONST.nullAddr,          CONST.nullFees);
        const data_MA = await helper.transferLedger({ stm, accounts, 
            ledger_A: M,                                   ledger_B: A,
               qty_A: new BN(MA_qty),                 tokenTypeId_A: CONST.tokenType.VCS,
               qty_B: 0,                              tokenTypeId_B: 0,
        ccy_amount_A: 0,                                ccyTypeId_A: 0,
        ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
            applyFees: true,
        });
        const MA_B_balAfter = data_MA.ledgerB_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(MA_B_balAfter).eq(Big(MA_qty)), 'test setup failed');

        // B: fund, so ready to trade from A
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        B,                    { from: accounts[0] });
    });

    // EEU ORIGINATOR FEES

    it('trading fees (originator) - apply VCS carbon originator fees (+ ledger @ x4), on a 1.5 EEU trade (fee on A)', async () => {
        const A = accounts[global.accountNdx + 1]; // ...M = ndx+0
        const B = accounts[global.accountNdx + 2];

        // set global fee structure: 0
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        // set ledger fee structure VCS for A
        var ledgerFees = {
               fee_fixed: ORIG_FEES_VCS_B1.fee_fixed    * 4,
            fee_percBips: ORIG_FEES_VCS_B1.fee_percBips * 4,
                 fee_min: ORIG_FEES_VCS_B1.fee_min      * 4,
                 fee_max: ORIG_FEES_VCS_B1.fee_max      * 4,
        };
        await stm.setFee_TokType(CONST.tokenType.VCS, A, ledgerFees);

        // transfer
        const transferAmountKg = new BN(1500);

        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: transferAmountKg,               tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // contract owner has received expected carbon exchange fees
        const owner_balBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(data.exchangeFee_tok_A))), 'unexpected fee receiver carbon balance after transfer');
        
        // sender has sent expected quantity and all fees
        const A_balBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(data.originatorFees_tok_A)).minus(Big(data.exchangeFee_tok_A)).minus(Big(transferAmountKg))), 'unexpected fee payer carbon balance after transfer');
    });
});