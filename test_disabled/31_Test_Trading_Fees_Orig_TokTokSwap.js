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

    beforeEach(async () => {
        stm = await st.deployed();
        if (!global.accountNdx) global.accountNdx = 0;
        //global.accountNdx += 5; // tests increment this; they use varying #'s of accounts
        if (CONST.logTestAccountUsage)
            console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${stm.address} (owner: ${accounts[0]}) - getSecTokenBatchCount: ${(await stm.getSecTokenBatchCount.call()).toString()}`);
    });

    // ST ORIGINATOR FEES - MULTIPLE ORIGINATORS

    it('fees (orig/orig) - apply VCS token M originator fees (+ ledger fee) / UNFCCC token M originator fees (+ global fee), on a 1.5 ST trade (tok fee on A / tok fee on B)', async () => {
        const A = accounts[++global.accountNdx];
        const B = accounts[++global.accountNdx];

        const tokType_A = CONST.tokenType.VCS;
        const tokType_B = CONST.tokenType.UNFCCC;
        var { qty: qty_A, M_multi: M_multi_A } = await MintAndTransfer({ tokenType: tokType_A, originatorCount: 2, batchesPerOriginator: 1, transferTo: A });
        var { qty: qty_B, M_multi: M_multi_B } = await MintAndTransfer({ tokenType: tokType_B, originatorCount: 1, batchesPerOriginator: 4, transferTo: B });
        console.log('qty_A', qty_A.toString());
        console.log('qty_B', qty_B.toString());
        console.log('M_multi_A', M_multi_A);
        console.log('M_multi_B', M_multi_B);

        // TEST - set ledger fee structure A
        var ledgerFee_A = { fee_fixed: 100, fee_percBips: 10, fee_min: 100, fee_max: 200 };
        await stm.setFee_TokType(tokType_A, A,              ledgerFee_A);
        await stm.setFee_TokType(tokType_A, CONST.nullAddr, CONST.nullFees);

        // TEST - set global fee structure B
        var globalFee_B = { fee_fixed: 50, fee_percBips: 5, fee_min: 50, fee_max: 100 };
        await stm.setFee_TokType(tokType_B, CONST.nullAddr, globalFee_B);
        await stm.setFee_TokType(tokType_B, B,              CONST.nullFees);

        // TEST - transfer
        qty_A = qty_A.minus(Big(500)); // take off some for fees
        qty_B = qty_B.minus(Big(500));

        for (var i = 0 ; i < M_multi_A.length ; i++) M_multi_A[i].ledgerBefore = await stm.getLedgerEntry(M_multi_A[i].account);
        for (var i = 0 ; i < M_multi_B.length ; i++) M_multi_B[i].ledgerBefore = await stm.getLedgerEntry(M_multi_B[i].account);
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: qty_A,                          tokenTypeId_A: tokType_A,
                   qty_B: qty_B,                          tokenTypeId_B: tokType_B,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });
        for (var i = 0 ; i < M_multi_A.length ; i++) M_multi_A[i].ledgerAfter = await stm.getLedgerEntry(M_multi_A[i].account);
        for (var i = 0 ; i < M_multi_B.length ; i++) M_multi_B[i].ledgerAfter = await stm.getLedgerEntry(M_multi_B[i].account);
        console.log(`\t>>> gasUsed - Multi Orig Fees ${M_multi_A.length + M_multi_B.length}: ${data.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
        console.log('feesPreview', data.feesPreview);

        console.log('qty_A', qty_A.toString());
        console.log('qty_B', qty_B.toString());

        // TEST - contract owner has received exchange fees
        const owner_balBefore = data.owner_before.tokens.map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.tokens.map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        console.log('owner_balBefore', owner_balBefore.toString());
        console.log('owner_balAfter', owner_balAfter.toString());
        console.log('data.exchangeFee_tok_A', data.exchangeFee_tok_A.toString());
        console.log('data.exchangeFee_tok_B', data.exchangeFee_tok_B.toString());
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(data.exchangeFee_tok_A)).plus(Big(data.exchangeFee_tok_B))), 'unexpected contract owner token balance after transfer');
        
        // TEST - originators (M[]) have each received their batch fee
        for (var i = 0 ; i < M_multi_A.length ; i++) {
            const M = M_multi_A[i].account;
            const expectedBatchFee = data.feesPreview.filter(p => p.fee_to == M).map(p => p.fee_tok_A).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            const M_balBefore = M_multi_A[i].ledgerBefore.tokens.map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            const M_balAfter  =  M_multi_A[i].ledgerAfter.tokens.map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            assert(Big(M_balAfter).eq(Big(M_balBefore).plus(Big(expectedBatchFee))), 'unexpected batch originator token balance after transfer (A)');
        }
        for (var i = 0 ; i < M_multi_B.length ; i++) {
            const M = M_multi_B[i].account;
            const expectedBatchFee = data.feesPreview.filter(p => p.fee_to == M).map(p => p.fee_tok_B).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            const M_balBefore = M_multi_B[i].ledgerBefore.tokens.map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            const M_balAfter  =  M_multi_B[i].ledgerAfter.tokens.map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
            assert(Big(M_balAfter).eq(Big(M_balBefore).plus(Big(expectedBatchFee))), 'unexpected batch originator token balance after transfer (B)');
        }

        // TEST - A has paid originator + exchange fees, and received from B
        var A_balBefore, A_balAfter;
        A_balBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == tokType_A).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        A_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == tokType_A).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(data.originatorFees_tok_A)).minus(Big(data.exchangeFee_tok_A)).minus(Big(qty_A))), 'unexpected A (type A) token balance after transfer');
        
        A_balBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == tokType_B).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        A_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == tokType_B).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(A_balAfter).eq(Big(A_balBefore).plus(qty_B)), 'unexpected A (type B) token balance after transfer');

        // TEST - B has paid originator + exchange fees, and received from A
        var B_balBefore, B_balAfter;
        B_balBefore = data.ledgerB_before.tokens.filter(p => p.tokenTypeId == tokType_B).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        B_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokenTypeId == tokType_B).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(B_balAfter).eq(Big(B_balBefore).minus(Big(data.originatorFees_tok_B)).minus(Big(data.exchangeFee_tok_B)).minus(Big(qty_B))), 'unexpected B (type B) token balance after transfer');

        B_balBefore = data.ledgerB_before.tokens.filter(p => p.tokenTypeId == tokType_A).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        B_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokenTypeId == tokType_A).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(B_balAfter).eq(Big(B_balBefore).plus(qty_A)), 'unexpected B (type A) token balance after transfer');
    });

    async function MintAndTransfer(a) {
        const { tokenType, originatorCount, batchesPerOriginator, transferTo } = a;

        // SETUP - setup M[] mint originators, with varying no. of batches & qty's
        const M_multi = [];
        for (var i=0; i < originatorCount ; i++) {
            M_multi.push({ account: accounts[++global.accountNdx] });
        }
        var totalTokQty = 0;
        for (var i = 0 ; i < M_multi.length ; i++) {
            const M = M_multi[i].account;
            for (var j = 0 ; j < batchesPerOriginator ; j++) {
                const origFee = { fee_fixed: (i+j), fee_percBips: (i+j) * 10, fee_min: (i+j) * 10, fee_max: (i+j) * 100 };
                const qty = CONST.tonCarbon * (i + 1 + j + 1);
                await stm.mintSecTokenBatch(tokenType, qty, 1, M, origFee, [], [], { from: accounts[0] });
                totalTokQty += qty;
            }
        }

        // SETUP - M[] -> A (no originator fees to self)
        for (var i = 0 ; i < M_multi.length ; i++) {
            const M = M_multi[i].account;
            const le = await stm.getLedgerEntry(M);
            const M_qty = le.tokens.filter(p => p.tokenTypeId == tokenType).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));

            await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        transferTo,    { from: accounts[0] });
            await stm.setFee_TokType(tokenType,                 CONST.nullAddr,          CONST.nullFees); // no exchange fees
            await stm.setFee_CcyType(CONST.ccyType.ETH,         CONST.nullAddr,          CONST.nullFees);
            const data_MA = await helper.transferLedger({ stm, accounts, 
                ledger_A: M,                                   ledger_B: transferTo,
                   qty_A: new BN(M_qty.toString()),       tokenTypeId_A: tokenType,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
            });
        }

        const le = await stm.getLedgerEntry(transferTo);
        const A_qty = le.tokens.filter(p => p.tokenTypeId == tokenType).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(totalTokQty).eq(Big(totalTokQty)), 'test setup failed');
        return { qty: A_qty, M_multi };
    }

    // TODO: multi-split (new test file) multi-extreme A (~100 batches?)/ multi-extreme (~100 batches?) :: pathological case for orchestrator to use fee-previews for splitting logic...
});