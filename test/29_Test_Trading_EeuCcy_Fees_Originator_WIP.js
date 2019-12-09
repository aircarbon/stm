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

    const ORIG_FEES_UNFCCC_B1 = { fee_fixed: 1, fee_percBips: 100, fee_min: 10, fee_max: 0 };
    const ORIG_FEES_UNFCCC_B2 = { fee_fixed: 2, fee_percBips: 200, fee_min: 20, fee_max: 0 };
    const ORIG_FEES_UNFCCC_B3 = { fee_fixed: 3, fee_percBips: 300, fee_min: 30, fee_max: 0 };

    beforeEach(async () => {
        stm = await st.deployed();
        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx += 5;
        if (CONST.logTestAccountUsage)
            console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${stm.address} (owner: ${accounts[0]}) - getSecTokenBatchCount: ${(await stm.getSecTokenBatchCount.call()).toString()}`);
    });

    // EEU ORIGINATOR FEES - SINGLE ORIGINATOR

    it('trading fees (originator) - apply VCS token single originator fees (+ ledger @ x4), on a 1.5 EEU trade (fee on A)', async () => {
        // SETUP - mint for M ([+0]), move all to A ([+1]) 
        const M = accounts[global.accountNdx + 0];
        const A = accounts[global.accountNdx + 1];
        const B = accounts[global.accountNdx + 2];

        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      M, ORIG_FEES_VCS_B1, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      M, ORIG_FEES_VCS_B2, [], [], { from: accounts[0] });

        // SETUP - M -> A: no fees
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

        // SETUP - B: fund, so ready to trade with A
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        B,                    { from: accounts[0] });        

        // TEST - set global fee structure: 0
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, CONST.nullFees);

        // TEST - set ledger fee structure VCS for A
        var ledgerFees = {
               fee_fixed: ORIG_FEES_VCS_B1.fee_fixed    * 4,
            fee_percBips: ORIG_FEES_VCS_B1.fee_percBips * 4,
                 fee_min: ORIG_FEES_VCS_B1.fee_min      * 4,
                 fee_max: ORIG_FEES_VCS_B1.fee_max      * 4,
        };
        await stm.setFee_TokType(CONST.tokenType.VCS, A, ledgerFees);

        // TEST - transfer
        const transferAmountKg = new BN(1500);
        const M_ledgerBefore = await stm.getLedgerEntry(M);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: transferAmountKg,               tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });
        const M_ledgerAfter = await stm.getLedgerEntry(M);

        // TEST - contract owner has received exchange fee
        const owner_balBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(data.exchangeFee_tok_A))), 'unexpected contract owner token balance after transfer');
        
        // TEST - originator (M) has received batch fee
        const M_balBefore = M_ledgerBefore.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const M_balAfter  =  M_ledgerAfter.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(M_balAfter).eq(Big(M_balBefore).plus(Big(data.originatorFees_tok_A))), 'unexpected batch originator token balance after transfer');

        // TEST - sender (A) has paid originator + exchange fees
        const A_balBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(data.originatorFees_tok_A)).minus(Big(data.exchangeFee_tok_A)).minus(Big(transferAmountKg))), 'unexpected fee payer token balance after transfer');
    });

    it('trading fees (originator) - apply UNFCCC token single originator fees (+ global @ x8), on a 2.5 EEU trade (fee on B)', async () => {
        // SETUP - mint for M ([+0]), move all to B ([+2])
        const M = accounts[global.accountNdx + 0];
        const A = accounts[global.accountNdx + 1];
        const B = accounts[global.accountNdx + 2];

        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC,    CONST.tonCarbon, 1,      M, ORIG_FEES_UNFCCC_B1, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC,    CONST.tonCarbon, 1,      M, ORIG_FEES_UNFCCC_B2, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC,    CONST.tonCarbon, 1,      M, ORIG_FEES_UNFCCC_B3, [], [], { from: accounts[0] });

        // SETUP - M -> B: no fees
        const MA_qty = 3000;
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        B,                    { from: accounts[0] });
        await stm.setFee_TokType(CONST.tokenType.UNFCCC,    CONST.nullAddr,          CONST.nullFees);
        await stm.setFee_CcyType(CONST.ccyType.ETH,         CONST.nullAddr,          CONST.nullFees);
        const data_MA = await helper.transferLedger({ stm, accounts, 
            ledger_A: M,                                   ledger_B: B,
               qty_A: new BN(MA_qty),                 tokenTypeId_A: CONST.tokenType.UNFCCC,
               qty_B: 0,                              tokenTypeId_B: 0,
        ccy_amount_A: 0,                                ccyTypeId_A: 0,
        ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
            pplyFees: true,
        });
        const MA_B_balAfter = data_MA.ledgerB_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(MA_B_balAfter).eq(Big(MA_qty)), 'test setup failed');

        // SETUP - A: fund, so ready to trade with B
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        A,                    { from: accounts[0] });        

        // TEST - set global fee structure UNFCCC: 8x originator fee
        var globalFee = {
               fee_fixed: ORIG_FEES_VCS_B1.fee_fixed    * 4,
            fee_percBips: ORIG_FEES_VCS_B1.fee_percBips * 4,
                 fee_min: ORIG_FEES_VCS_B1.fee_min      * 4,
                 fee_max: ORIG_FEES_VCS_B1.fee_max      * 4,
        };
        await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, globalFee);
        await stm.setFee_TokType(CONST.tokenType.UNFCCC, B,              CONST.nullFees);

        // TEST - transfer
        const transferAmountKg = new BN(1500);
        const M_ledgerBefore = await stm.getLedgerEntry(M);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: 0,                              tokenTypeId_A: 0,
                   qty_B: transferAmountKg,               tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });
        const M_ledgerAfter = await stm.getLedgerEntry(M);

        // TEST - contract owner has received expected token exchange fees
        const owner_balBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(data.exchangeFee_tok_B))), 'unexpected fee receiver token balance after transfer');

        // TEST - originator (M) has received batch originator token fee
        const M_balBefore = M_ledgerBefore.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const M_balAfter  =  M_ledgerAfter.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(M_balAfter).eq(Big(M_balBefore).plus(Big(data.originatorFees_tok_B))), 'unexpected batch originator token balance after transfer');
        
        // TEST - sender (B) has sent expected quantity and all fees, inc. originator token fee(s)
        const sender_balBefore = data.ledgerB_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const sender_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(sender_balAfter).eq(Big(sender_balBefore).minus(Big(data.originatorFees_tok_B)).minus(Big(data.exchangeFee_tok_B)).minus(Big(transferAmountKg))), 'unexpected fee payer token balance after transfer');
    });

    // EEU ORIGINATOR FEES - MULTIPLE ORIGINATORS

    it('trading fees (originator) - apply VCS token multiple [3] originator fees (+ ledger @ x4), on a 3.5 EEU trade (fee on A)', async () => {
        // SETUP - mint for M[] ([+0], [+1], [+2]), move all to A ([+3]) 
        const M_multi = [ 
            { account: accounts[global.accountNdx + 0] }, 
            { account: accounts[global.accountNdx + 1] },
            { account: accounts[global.accountNdx + 2] }
        ];
        const A = accounts[global.accountNdx + 3];
        const B = accounts[global.accountNdx + 4];

        var batchNo = 1;
        for (var i = 0 ; i < M_multi.length ; i++) {
            const M = M_multi[i].account;
            const origFee = {
                fee_fixed: ORIG_FEES_VCS_B1.fee_fixed    * batchNo,
             fee_percBips: ORIG_FEES_VCS_B1.fee_percBips * batchNo,
                  fee_min: ORIG_FEES_VCS_B1.fee_min      * batchNo,
                  fee_max: ORIG_FEES_VCS_B1.fee_max      * batchNo,                
            }
            await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      M, origFee, [], [],   { from: accounts[0] });
            batchNo++;
        }

        // SETUP - M[] -> A: no fees
        for (var i = 0 ; i < M_multi.length ; i++) {
            const M = M_multi[i].account;
            const MA_qty = CONST.tonCarbon;
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
            assert(Big(MA_B_balAfter).eq(Big(MA_qty * (i + 1))), 'test setup failed (1)');
        }

        // SETUP - B: fund, so ready to trade with A
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,            B,                    { from: accounts[0] });        

        // TEST - set global fee structure: 0
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, CONST.nullFees);

        // TEST - set ledger fee structure VCS for A
        var ledgerFees = {
               fee_fixed: ORIG_FEES_VCS_B1.fee_fixed    * 4,
            fee_percBips: ORIG_FEES_VCS_B1.fee_percBips * 4,
                 fee_min: ORIG_FEES_VCS_B1.fee_min      * 4,
                 fee_max: ORIG_FEES_VCS_B1.fee_max      * 4,
        };
        await stm.setFee_TokType(CONST.tokenType.VCS, A, ledgerFees);

        // TEST - transfer
        const transferAmountKg = new BN(CONST.tonCarbon);
        transferAmountKg.imul(new BN(M_multi.length)); 
        transferAmountKg.isub(new BN(500)); // take off some for fees
        for (var i = 0 ; i < M_multi.length ; i++) {
            M_multi[i].ledgerBefore = await stm.getLedgerEntry(M_multi[i].account);
        }
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: transferAmountKg,               tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });
        for (var i = 0 ; i < M_multi.length ; i++) {
            M_multi[i].ledgerAfter = await stm.getLedgerEntry(M_multi[i].account);
        }
        console.log(`\t>>> gasUsed - Multi Orig Fees: ${data.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
        //console.log('feesPreview', data.feesPreview);

        // TEST - contract owner has received exchange fee
        const owner_balBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(data.exchangeFee_tok_A))), 'unexpected contract owner token balance after transfer');
        
        // TEST - originators (M[]) have each received their batch fee
        for (var i = 0 ; i < M_multi.length ; i++) {
            const M = M_multi[i].account;
            const expectedBatchFee = data.feesPreview.filter(p => p.fee_to == M).map(p => p.fee_tok_A).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            const M_balBefore = M_multi[i].ledgerBefore.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            const M_balAfter  =  M_multi[i].ledgerAfter.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            assert(Big(M_balAfter).eq(Big(M_balBefore).plus(Big(expectedBatchFee))), 'unexpected batch originator token balance after transfer');
        }

        // TEST - sender (A) has paid originator + exchange fees
        const A_balBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(data.originatorFees_tok_A)).minus(Big(data.exchangeFee_tok_A)).minus(Big(transferAmountKg))), 'unexpected fee payer token balance after transfer');
        
        // TEST - receiver (B) has received transfer amount
        const B_balBefore = data.ledgerB_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const B_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(B_balAfter).eq(Big(B_balBefore).plus(Big(transferAmountKg))), 'unexpected receiver token balance after transfer');
    });

    // TODO: multi, side B

    // TODO: mixed fees both sides (carbon/ccy swap)
    // TODO: orig both sides (carbon/carbon swap)
});