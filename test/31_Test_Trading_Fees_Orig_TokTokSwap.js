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

    async function MintAndTransfer(a) {
        const { tokenType, originatorCount, batchesPerOriginator, transferTo } = a;

        // SETUP - setup M[] mint originators, with varying no. of batches & qty's
        const M_multi = [];
        for (var i=0; i < originatorCount ; i++) {
            M_multi.push({ account: accounts[global.accountNdx++] });
        }
        var totalTokQty = 0;
        for (var i = 0 ; i < M_multi.length ; i++) {
            const M = M_multi[i].account;
            for (var j = 0 ; j < batchesPerOriginator ; j++) {
                const origFee = { fee_fixed: (i+j), fee_percBips: (i+j) * 10, fee_min: (i+j) * 10, fee_max: (i+j) * 100 };
                const qty = CONST.tonCarbon * (i+j);
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
                   qty_A: new BN(M_qty),                  tokenTypeId_A: tokenType,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
            });
        }

        const le = await stm.getLedgerEntry(transferTo);
        const A_qty = le.tokens.filter(p => p.tokenTypeId == tokenType).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(totalTokQty).eq(Big(totalTokQty)), 'setup setup failed');
    }

    // ST ORIGINATOR FEES - MULTIPLE ORIGINATORS

    it('fees (orig/orig) - apply VCS token M originator fees (+ ledger @ x4) / UNFCCC token M originator fees (+ global @ x8), on a 1.5 ST trade (tok fee on A / tok fee on B)', async () => {
        const A = accounts[global.accountNdx++];
        const B = accounts[global.accountNdx++];

        MintAndTransfer({ tokenType: CONST.tokenType.VCS, originatorCount: 3, batchesPerOriginator: 2, transferTo: A });
        MintAndTransfer({ tokenType: CONST.tokenType.VCS, originatorCount: 3, batchesPerOriginator: 2, transferTo: B });

        //...

        // SETUP - B: fund, so ready to trade with A
        // await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,            B,                    { from: accounts[0] });        

        // // TEST - set global fee structure VCS: 0
        // await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, CONST.nullFees);

        // // TEST - set ledger fee structure VCS for A
        // var ledgerFees = {
        //        fee_fixed: ORIG_FEES_VCS_B1.fee_fixed    * 4,
        //     fee_percBips: ORIG_FEES_VCS_B1.fee_percBips * 4,
        //          fee_min: ORIG_FEES_VCS_B1.fee_min      * 4,
        //          fee_max: ORIG_FEES_VCS_B1.fee_max      * 4,
        // };
        // await stm.setFee_TokType(CONST.tokenType.VCS, A, ledgerFees);

        // // TEST - transfer
        // const transferAmountKg = new BN(CONST.tonCarbon);
        // transferAmountKg.imul(new BN(M_multi.length)); 
        // transferAmountKg.isub(new BN(500)); // take off some for fees
        // for (var i = 0 ; i < M_multi.length ; i++) {
        //     M_multi[i].ledgerBefore = await stm.getLedgerEntry(M_multi[i].account);
        // }
        // const data = await helper.transferLedger({ stm, accounts, 
        //         ledger_A: A,                                   ledger_B: B,
        //            qty_A: transferAmountKg,               tokenTypeId_A: CONST.tokenType.VCS,
        //            qty_B: 0,                              tokenTypeId_B: 0,
        //     ccy_amount_A: 0,                                ccyTypeId_A: 0,
        //     ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
        //        applyFees: true,
        // });
        // for (var i = 0 ; i < M_multi.length ; i++) {
        //     M_multi[i].ledgerAfter = await stm.getLedgerEntry(M_multi[i].account);
        // }
        // console.log(`\t>>> gasUsed - Multi Orig Fees ${M_multi.length}: ${data.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
        // //console.log('feesPreview', data.feesPreview);

        // // TEST - contract owner has received exchange fee
        // const owner_balBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        // const owner_balAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        // assert(Big(owner_balAfter).eq(Big(owner_balBefore).plus(Big(data.exchangeFee_tok_A))), 'unexpected contract owner token balance after transfer');
        
        // // TEST - originators (M[]) have each received their batch fee
        // for (var i = 0 ; i < M_multi.length ; i++) {
        //     const M = M_multi[i].account;
        //     const expectedBatchFee = data.feesPreview.filter(p => p.fee_to == M).map(p => p.fee_tok_A).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        //     const M_balBefore = M_multi[i].ledgerBefore.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        //     const M_balAfter  =  M_multi[i].ledgerAfter.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        //     assert(Big(M_balAfter).eq(Big(M_balBefore).plus(Big(expectedBatchFee))), 'unexpected batch originator token balance after transfer');
        // }

        // // TEST - sender (A) has paid originator + exchange fees
        // const A_balBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        // const A_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        // assert(Big(A_balAfter).eq(Big(A_balBefore).minus(Big(data.originatorFees_tok_A)).minus(Big(data.exchangeFee_tok_A)).minus(Big(transferAmountKg))), 'unexpected fee payer token balance after transfer');
        
        // // TEST - receiver (B) has received transfer amount
        // const B_balBefore = data.ledgerB_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        // const B_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        // assert(Big(B_balAfter).eq(Big(B_balBefore).plus(Big(transferAmountKg))), 'unexpected receiver token balance after transfer');
    });

    // TODO: multi-split (new test file) multi-extreme A (~100 batches?)/ multi-extreme (~100 batches?) :: pathological case for orchestrator to use fee-previews for splitting logic...
});