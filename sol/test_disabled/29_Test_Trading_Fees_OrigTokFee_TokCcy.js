// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StTransferable.sol => TransferLib.sol
const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');
const transferHelper = require('../test/transferHelper.js');
const BN = require('bn.js');
const Big = require('big.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;

    const ORIG_FEES_VCS_B1 = { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 10, fee_percBips: 1000, fee_min: 0, fee_max: 10 };
    const ORIG_FEES_VCS_B2 = { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 20, fee_percBips: 2000, fee_min: 0, fee_max: 20 };

    const ORIG_FEES_corsia_B1 = { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 1, fee_percBips: 100, fee_min: 10, fee_max: 0 };
    const ORIG_FEES_corsia_B2 = { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 2, fee_percBips: 200, fee_min: 20, fee_max: 0 };
    const ORIG_FEES_corsia_B3 = { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 3, fee_percBips: 300, fee_min: 30, fee_max: 0 };

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
        
        await setupHelper.whitelistAndSeal({ stm, accounts });
        await setupHelper.setDefaults({ stm, accounts });
    });

    beforeEach(async () => {
        stm = await st.deployed();
        global.TaddrNdx += 5;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // ST ORIGINATOR FEES - SINGLE ORIGINATOR

    it(`fees (orig token fee) - apply NATURE token 1 originator fee (+ ledger @ x4) [/ ETH global fee], on a 1.5 ST trade (tok fee on A / ccy fee on B)`, async () => {
        // SETUP - mint for M ([+0]), move all to A ([+1])
        const M = accounts[global.TaddrNdx + 0];
        const A = accounts[global.TaddrNdx + 1];
        const B = accounts[global.TaddrNdx + 2];

        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      M, ORIG_FEES_VCS_B1, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      M, ORIG_FEES_VCS_B2, 0, [], [], { from: accounts[0] });

        // SETUP - M -> A: no fees
        const MA_qty = 2000;
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,                      CONST.oneEth_wei,        A, 'TEST');
        await stm.setFee_TokType(CONST.tokenType.TOK_T2,       CONST.nullAddr,          CONST.nullFees);
        await stm.setFee_CcyType(CONST.ccyType.ETH,            CONST.nullAddr,          CONST.nullFees);
        const data_MA = await transferHelper.transferLedger({ stm, accounts, 
            ledger_A: M,                                   ledger_B: A,
               qty_A: new BN(MA_qty),                   tokTypeId_A: CONST.tokenType.TOK_T2,
               qty_B: 0,                                tokTypeId_B: 0,
        ccy_amount_A: 0,                                ccyTypeId_A: 0,
        ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
           applyFees: true,
        });
        const MA_B_balAfter = data_MA.ledgerB_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(MA_B_balAfter).eq(Big(MA_qty)), 'test setup failed');

        // SETUP - B: fund, so ready to trade with A
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,                   CONST.oneEth_wei,        B, 'TEST');

        // TEST - set ledger fee NATURE for A
        const ledgerFeeTok = { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: ORIG_FEES_VCS_B1.fee_fixed * 4, fee_percBips: 0, fee_min: 0, fee_max: 0, };
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, A,              ledgerFeeTok);
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 1, fee_percBips: 0, fee_min: 0, fee_max: 0 }); // to test ledger override

        // tmp - removing ETH for direct perf before (591k) / after comparison
        // // TEST - set global fee ETH
        // const globalFeeCcy = {
        //     fee_fixed: CONST.hundredthEth_wei,
        //  fee_percBips: 100,
        //       fee_min: 1,
        //       fee_max: CONST.tenthEth_wei
        // };
        // await stm.setFee_CcyType(CONST.ccyType.ETH, B,                CONST.nullFees);
        // await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   globalFeeCcy);

        // TEST - transfer
        const transferAmountTokQty = new BN(1500);
        const M_ledgerBefore = await stm.getLedgerEntry(M);
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: transferAmountTokQty,             tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                tokTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.tenthEth_wei,               ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });
        await CONST.logGas(web3, data.transferTx, `Single Orig Fees ${1}`);
        const M_ledgerAfter = await stm.getLedgerEntry(M);

        // TEST - contract owner has received exchange fees (tokens + currency)
        const owner_balVcsBefore = data.owner_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balVcsAfter  =  data.owner_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(data.exchangeFee_tok_A).eq(Big(ledgerFeeTok.fee_fixed)), 'unexpected contract owner token balance after transfer (1)');
        assert(Big(owner_balVcsAfter).eq(Big(owner_balVcsBefore).plus(Big(data.exchangeFee_tok_A))), 'unexpected contract owner token balance after transfer (2)');
        
        const owner_balEthBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH)[0].balance;
        const owner_balEthAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH)[0].balance;
        assert(Big(owner_balEthAfter).eq(Big(owner_balEthBefore).plus(Big(data.exchangeFee_ccy_B))), 'unexpected contract owner currency balance after transfer');

        // TEST - originator (M) has received batch fee
        const M_balBefore = M_ledgerBefore.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const M_balAfter  =  M_ledgerAfter.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(M_balAfter).eq(Big(M_balBefore).plus(Big(data.originatorFees_tok_A))), 'unexpected batch originator token balance after transfer');

        // TEST - token sender (A) has paid originator + exchange fees
        const A_balBefore = data.ledgerA_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(data.originatorFees_tok_A)).minus(Big(data.exchangeFee_tok_A)).minus(Big(transferAmountTokQty))), 'unexpected fee payer token balance after transfer');
    });

    it(`fees (orig token fee) - apply CORSIA token 1 originator fees (+ global @ x8) / SGD ledger fee, on a 2.5 ST trade (tok fee on B / ccy fee on A)`, async () => {
        // SETUP - mint for M ([+0]), move all to B ([+2])
        const M = accounts[global.TaddrNdx + 0];
        const A = accounts[global.TaddrNdx + 1];
        const B = accounts[global.TaddrNdx + 2];

        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1,    CONST.KT_CARBON, 1,      M, ORIG_FEES_corsia_B1, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1,    CONST.KT_CARBON, 1,      M, ORIG_FEES_corsia_B2, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1,    CONST.KT_CARBON, 1,      M, ORIG_FEES_corsia_B3, 0, [], [], { from: accounts[0] });

        // SETUP - M -> B: no fees
        const MA_qty = 3000;
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,                   CONST.oneEth_wei,        B, 'TEST');
        await stm.setFee_TokType(CONST.tokenType.TOK_T1,    CONST.nullAddr,          CONST.nullFees);
        await stm.setFee_CcyType(CONST.ccyType.ETH,         CONST.nullAddr,          CONST.nullFees);
        const data_MA = await transferHelper.transferLedger({ stm, accounts, 
            ledger_A: M,                                   ledger_B: B,
               qty_A: new BN(MA_qty),                   tokTypeId_A: CONST.tokenType.TOK_T1,
               qty_B: 0,                                tokTypeId_B: 0,
        ccy_amount_A: 0,                                ccyTypeId_A: 0,
        ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
            pplyFees: true,
        });
        const MA_B_balAfter = data_MA.ledgerB_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(MA_B_balAfter).eq(Big(MA_qty)), 'test setup failed');

        // SETUP - A: fund, so ready to trade with B
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,                   CONST.millionCcy_cents,  A, 'TEST');

        // TEST - set global fee structure CORSIA: 8x originator fee
        var globalFeeTok = { ccy_mirrorFee: false, ccy_perMillion: 0,
               fee_fixed: ORIG_FEES_corsia_B1.fee_fixed    * 4,
            fee_percBips: ORIG_FEES_corsia_B1.fee_percBips * 4,
                 fee_min: ORIG_FEES_corsia_B1.fee_min      * 4,
                 fee_max: ORIG_FEES_corsia_B1.fee_max      * 4,
        };
        await stm.setFee_TokType(CONST.tokenType.TOK_T1, CONST.nullAddr, globalFeeTok);
        await stm.setFee_TokType(CONST.tokenType.TOK_T1, B,              CONST.nullFees);

        // TEST - set ledger fee SGD
        const ledgerFeeCcy = { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 100, fee_percBips: 0, fee_min: 0, fee_max: 0, };
        await stm.setFee_CcyType(CONST.ccyType.USD, A,                ledgerFeeCcy);
        await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr,   { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 200, fee_percBips: 0, fee_min: 0, fee_max: 0 } ); // to test ledger override

        // TEST - transfer
        const transferAmountTokQty = new BN(1500);
        const M_ledgerBefore = await stm.getLedgerEntry(M);
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: 0,                                tokTypeId_A: 0,
                   qty_B: transferAmountTokQty,             tokTypeId_B: CONST.tokenType.TOK_T1,
            ccy_amount_A: CONST.hundredCcy_cents,           ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });
        await CONST.logGas(web3, data.transferTx, `Single Orig Fees ${1}`);
        const M_ledgerAfter = await stm.getLedgerEntry(M);

        // TEST - contract owner has received expected token exchange fees
        const owner_balBefore = data.owner_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(data.exchangeFee_tok_B))), 'unexpected fee receiver token balance after transfer');
        
        const owner_balCcyBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD)[0].balance;
        const owner_balCcyAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD)[0].balance;
        assert(Big(owner_balCcyAfter).eq(Big(ledgerFeeCcy.fee_fixed)), 'unexpected contract owner currency balance after transfer (1)');
        assert(Big(owner_balCcyAfter).eq(Big(owner_balCcyBefore).plus(Big(data.exchangeFee_ccy_A))), 'unexpected contract owner currency balance after transfer (2)');

        // TEST - originator (M) has received batch originator token fee
        const M_balBefore = M_ledgerBefore.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const M_balAfter  =  M_ledgerAfter.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(M_balAfter).eq(Big(M_balBefore).plus(Big(data.originatorFees_tok_B))), 'unexpected batch originator token balance after transfer');
        
        // TEST - sender (B) has sent expected quantity and all fees, inc. originator token fee(s)
        const sender_balBefore = data.ledgerB_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const sender_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(sender_balAfter).eq(Big(sender_balBefore).minus(Big(data.originatorFees_tok_B)).minus(Big(data.exchangeFee_tok_B)).minus(Big(transferAmountTokQty))), 'unexpected fee payer token balance after transfer');
    });

    // ST ORIGINATOR FEES - MULTIPLE ORIGINATORS

    it(`fees (orig token fees) - apply NATURE token multiple [3] originator fees (+ ledger @ x4), on a 3.5 ST trade (fee on A)`, async () => {
        // SETUP - mint for M[] ([+0], [+1], [+2]), move all to A ([+3]) 
        const M_multi = [ 
            { account: accounts[global.TaddrNdx + 0] }, 
            { account: accounts[global.TaddrNdx + 1] },
            { account: accounts[global.TaddrNdx + 2] }
        ];
        const A = accounts[global.TaddrNdx + 3];
        const B = accounts[global.TaddrNdx + 4];

        // SETUP - different originator fees
        var batchNo = 1;
        for (var i = 0 ; i < M_multi.length ; i++) {
            const M = M_multi[i].account;
            const origFee = { ccy_mirrorFee: false, ccy_perMillion: 0,
                fee_fixed: ORIG_FEES_VCS_B1.fee_fixed    * batchNo,
             fee_percBips: ORIG_FEES_VCS_B1.fee_percBips * batchNo,
                  fee_min: ORIG_FEES_VCS_B1.fee_min      * batchNo,
                  fee_max: ORIG_FEES_VCS_B1.fee_max      * batchNo,                
            }
            await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,    CONST.KT_CARBON, 1,      M, origFee, 0, [], [],   { from: accounts[0] });
            batchNo++;
        }

        // SETUP - M[] -> A: no fees
        for (var i = 0 ; i < M_multi.length ; i++) {
            const M = M_multi[i].account;
            const MA_qty = CONST.KT_CARBON;
            await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,                      CONST.oneEth_wei,        A, 'TEST');
            await stm.setFee_TokType(CONST.tokenType.TOK_T2,       CONST.nullAddr,          CONST.nullFees);
            await stm.setFee_CcyType(CONST.ccyType.ETH,            CONST.nullAddr,          CONST.nullFees);
            const data_MA = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: M,                                   ledger_B: A,
                   qty_A: new BN(MA_qty),                   tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                tokTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
            });
            const MA_B_balAfter = data_MA.ledgerB_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            assert(Big(MA_B_balAfter).eq(Big(MA_qty * (i + 1))), 'test setup failed (1)');
        }

        // SETUP - B: fund, so ready to trade with A
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,                   CONST.oneEth_wei,            B, 'TEST');

        // TEST - set global fee structure NATURE: 0
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, CONST.nullFees);

        // TEST - set ledger fee structure NATURE for A
        var ledgerFees = { ccy_mirrorFee: false, ccy_perMillion: 0,
               fee_fixed: ORIG_FEES_VCS_B1.fee_fixed    * 4,
            fee_percBips: ORIG_FEES_VCS_B1.fee_percBips * 4,
                 fee_min: ORIG_FEES_VCS_B1.fee_min      * 4,
                 fee_max: ORIG_FEES_VCS_B1.fee_max      * 4,
        };
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, A, ledgerFees);

        // TEST - transfer
        const transferAmountTokQty = new BN(CONST.KT_CARBON);
        transferAmountTokQty.imul(new BN(M_multi.length)); 
        transferAmountTokQty.isub(new BN(500)); // take off some for fees
        for (var i = 0 ; i < M_multi.length ; i++) {
            M_multi[i].ledgerBefore = await stm.getLedgerEntry(M_multi[i].account);
        }
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: transferAmountTokQty,             tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                tokTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });
        for (var i = 0 ; i < M_multi.length ; i++) {
            M_multi[i].ledgerAfter = await stm.getLedgerEntry(M_multi[i].account);
        }
        await CONST.logGas(web3, data.transferTx, `Multi Orig Fees ${M_multi.length}`);
        //console.log('feesPreview', data.feesPreview);

        // TEST - contract owner has received exchange fee
        const owner_balBefore = data.owner_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(data.exchangeFee_tok_A))), 'unexpected contract owner token balance after transfer');
        
        // TEST - originators (M[]) have each received their batch fee
        for (var i = 0 ; i < M_multi.length ; i++) {
            const M = M_multi[i].account;
            const expectedBatchFee = data.feesPreview.filter(p => p.fee_to == M).map(p => p.fee_tok_A).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            const M_balBefore = M_multi[i].ledgerBefore.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            const M_balAfter  =  M_multi[i].ledgerAfter.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            assert(Big(M_balAfter).eq(Big(M_balBefore).plus(Big(expectedBatchFee))), 'unexpected batch originator token balance after transfer');
        }

        // TEST - sender (A) has paid originator + exchange fees
        const A_balBefore = data.ledgerA_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const A_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(data.originatorFees_tok_A)).minus(Big(data.exchangeFee_tok_A)).minus(Big(transferAmountTokQty))), 'unexpected fee payer token balance after transfer');
        
        // TEST - receiver (B) has received transfer amount
        const B_balBefore = data.ledgerB_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const B_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(B_balAfter).eq(Big(B_balBefore).plus(Big(transferAmountTokQty))), 'unexpected receiver token balance after transfer');
    });

    it(`fees (orig token fees) - apply CORSIA token multiple [3] originator fees (+ global @ x10), on a 3.5 ST trade (fee on B)`, async () => {
        // SETUP - mint for M[] ([+0], [+1], [+2]), move all to B ([+3]) 
        const M_multi = [ 
            { account: accounts[global.TaddrNdx + 0] }, 
            { account: accounts[global.TaddrNdx + 1] },
            { account: accounts[global.TaddrNdx + 2] }
        ];
        const A = accounts[global.TaddrNdx + 3];
        const B = accounts[global.TaddrNdx + 4];

        // SETUP - different originator fees
        var batchNo = 1;
        for (var i = 0 ; i < M_multi.length ; i++) {
            const M = M_multi[i].account;
            const origFee = { ccy_mirrorFee: false, ccy_perMillion: 0,
                fee_fixed: ORIG_FEES_corsia_B1.fee_fixed    * batchNo,
             fee_percBips: ORIG_FEES_corsia_B1.fee_percBips * batchNo,
                  fee_min: ORIG_FEES_corsia_B1.fee_min      * batchNo,
                  fee_max: ORIG_FEES_corsia_B1.fee_max      * batchNo,                
            }
            await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1,    CONST.KT_CARBON, 1,   M, origFee, 0, [], [],   { from: accounts[0] });
            batchNo++;
        }

        // SETUP - M[] -> B: no fees
        for (var i = 0 ; i < M_multi.length ; i++) {
            const M = M_multi[i].account;
            const MA_qty = CONST.KT_CARBON;
            await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,                   CONST.oneEth_wei,        B, 'TEST');
            await stm.setFee_TokType(CONST.tokenType.TOK_T1,    CONST.nullAddr,          CONST.nullFees);
            await stm.setFee_CcyType(CONST.ccyType.ETH,         CONST.nullAddr,          CONST.nullFees);
            const data_MA = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: M,                                   ledger_B: B,
                   qty_A: new BN(MA_qty),                   tokTypeId_A: CONST.tokenType.TOK_T1,
                   qty_B: 0,                                tokTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
            });
            const MA_B_balAfter = data_MA.ledgerB_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            assert(Big(MA_B_balAfter).eq(Big(MA_qty * (i + 1))), 'test setup failed (1)');
        }

        // SETUP - A: fund, so ready to trade with B
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH,                   CONST.oneEth_wei,            A, 'TEST');

        // TEST - set global fee structure: 0
        await stm.setFee_TokType(CONST.tokenType.TOK_T1, CONST.nullAddr, CONST.nullFees);

        // TEST - set global fee structure CORSIA
        var globalFee = { ccy_mirrorFee: false, ccy_perMillion: 0,
               fee_fixed: ORIG_FEES_corsia_B1.fee_fixed    * 10,
            fee_percBips: ORIG_FEES_corsia_B1.fee_percBips * 10,
                 fee_min: ORIG_FEES_corsia_B1.fee_min      * 10,
                 fee_max: ORIG_FEES_corsia_B1.fee_max      * 10,
        };
        await stm.setFee_TokType(CONST.tokenType.TOK_T1, B, CONST.nullFees);
        await stm.setFee_TokType(CONST.tokenType.TOK_T1, CONST.nullAddr, globalFee);

        // TEST - transfer
        const transferAmountTokQty = new BN(CONST.KT_CARBON);
        transferAmountTokQty.imul(new BN(M_multi.length)); 
        transferAmountTokQty.isub(new BN(500000)); // take off some for fees
        for (var i = 0 ; i < M_multi.length ; i++) {
            M_multi[i].ledgerBefore = await stm.getLedgerEntry(M_multi[i].account);
        }
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: 0,                                tokTypeId_A: 0,
                   qty_B: transferAmountTokQty,             tokTypeId_B: CONST.tokenType.TOK_T1,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });
        for (var i = 0 ; i < M_multi.length ; i++) {
            M_multi[i].ledgerAfter = await stm.getLedgerEntry(M_multi[i].account);
        }
        await CONST.logGas(web3, data.transferTx, `Multi Orig Fees ${M_multi.length}`);
        //console.log('feesPreview', data.feesPreview);

        // TEST - contract owner has received exchange fee
        const owner_balBefore = data.owner_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(data.exchangeFee_tok_B))), 'unexpected contract owner token balance after transfer');
        
        // TEST - originators (M[]) have each received their batch fee
        for (var i = 0 ; i < M_multi.length ; i++) {
            const M = M_multi[i].account;
            const expectedBatchFee = data.feesPreview.filter(p => p.fee_to == M).map(p => p.fee_tok_B).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            const M_balBefore = M_multi[i].ledgerBefore.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            const M_balAfter  =  M_multi[i].ledgerAfter.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            assert(Big(M_balAfter).eq(Big(M_balBefore).plus(Big(expectedBatchFee))), 'unexpected batch originator token balance after transfer');
        }

        // TEST - sender (B) has paid originator + exchange fees
        const S_balBefore = data.ledgerB_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const S_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(S_balAfter).eq(Big(S_balBefore).minus(Big(data.originatorFees_tok_B)).minus(Big(data.exchangeFee_tok_B)).minus(Big(transferAmountTokQty))), 'unexpected fee payer token balance after transfer');
        
        // TEST - receiver (A) has received transfer amount
        const R_balBefore = data.ledgerA_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const R_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(R_balAfter).eq(Big(R_balBefore).plus(Big(transferAmountTokQty))), 'unexpected receiver token balance after transfer');
    });
});