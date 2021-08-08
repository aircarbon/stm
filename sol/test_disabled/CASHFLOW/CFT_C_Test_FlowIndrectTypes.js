// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: (CASHFLOW_CONTROLLER) (all)
const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const chalk = require('chalk');

const CONST = require('../const.js');
const setupHelper = require('../test/testSetupContract.js');
const transferHelper = require('./transferHelper.js');

//
// TODO: CFT upgrades... > multiple upgrade cases: 
//    (1) controller upgraded, bases remain in-place
//    (2) bases upgraded, controller remains
//    (3) base & controllers upgraded
//

contract("StMaster", accounts => {
    var stm, curHash;

    const M1 = accounts[1];
    //const M2 = accounts[2];

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.CASHFLOW_CONTROLLER) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 10;

        // whitelist & seal controller
        const wlAddrs = accounts.slice(0, global.TaddrNdx + 50);
        await stm.whitelistMany(wlAddrs);
        await stm.sealContract();

        // whitelist & seal base types
        const types = (await stm.getSecTokenTypes()).tokenTypes;
        const O = await CONST.getAccountAndKey(0);
        for (var type of types) {
            await CONST.web3_tx('whitelistMany', [wlAddrs], O.addr, O.privKey, /*nameOverride*/undefined, /*addrOverride*/type.cashflowBaseAddr);
            await CONST.web3_tx('sealContract', [], O.addr, O.privKey, /*nameOverride*/undefined, /*addrOverride*/type.cashflowBaseAddr);
        }

        curHash = await CONST.getLedgerHashcode(stm);
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    //
    // ORDERED
    //

    //...
    // ## TODO -- need a new 2_deploy... mode that deploys & links the base-types... see commented/removed code in 2_deploy / case 'CASHFLOW_CONTROLLER':
    //...

    // indirect types & minting
    it(`cashflow controller - should be able to query controller's indirect types`, async () => {
        const types = (await stm.getSecTokenTypes()).tokenTypes;
        //assert(types.length == 2);
    });
    it(`cashflow controller - allow an initial unibatch mint on an indirect passed-through cashflow base (type 1)`, async () => {
        const origFee = { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 1, fee_percBips: 0, fee_min: 1, fee_max: 0 };
        const { batchId, mintTx } = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: M1, origTokFees: origFee, origCcyFee_percBips_ExFee: 0, metaKeys: [ 'key1', 'key2' ],  metaValues: [ 'val1', 'val2' ],
        });
        //console.log('totalSupply', (await stm.totalSupply()).toString());
        //truffleAssert.prettyPrintEmittedEvents(mintTx);
        curHash = await checkHashUpdate(curHash);
        
        truffleAssert.eventEmitted(mintTx, 'Minted', ev => ev.batchId == 1 && ev.tokTypeId == CONST.tokenType.TOK_T1 && ev.mintQty == 1000);
        truffleAssert.eventEmitted(mintTx, 'MintedSecToken', ev => { 
            return ev.stId.eq(new BN('6277101735386680763835789423207666416102355444464034512897')) // 0x0000000000000001000000000000000000000000000000000000000000000001
              && ev.tokTypeId == CONST.tokenType.TOK_T1 && ev.mintedQty == 1000
            }
        );
        const st = await stm.getSecToken(new BN('6277101735386680763835789423207666416102355444464034512897'));
        assert(st.tokTypeId == CONST.tokenType.TOK_T1 && st.batchId == 1, 'unexpected token data');
    });
  
    it(`cashflow controller - should not allow a subsequent batch mint for the same indirect base (type 1)`, async () => {
        try {
            const { batchId, mintTx } = await mintBatchWithMetadata( 
                { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 100, qtySecTokens: 1, receiver: M1, origCcyFee_percBips_ExFee: 0, origTokFees: CONST.nullFees,
                   metaKeys: [ 'key3', 'key4' ],
                 metaValues: [ 'val4', 'val4' ],
            });
        } catch (ex) { assert(ex.reason == 'Bad cashflow request', `unexpected: ${ex.reason}`); return; }
    });
    it(`cashflow controller - should allow an initial unibatch mint on a different indirect passed-through cashflow base (type 2)`, async () => {
        const { batchId, mintTx } = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T2, qtyUnit: 2000, // small # of units - for testing feePerMillion granularity...
                qtySecTokens: 1, receiver: M1, origTokFees: CONST.nullFees,
                origCcyFee_percBips_ExFee: 5000, // orginator ccy fee share: 50%
                metaKeys: [ 'key5', 'key6' ], metaValues: [ 'val5', 'val6' ],
        });
        truffleAssert.eventEmitted(mintTx, 'Minted', ev => ev.batchId == 2 && ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.mintQty == 2000);
        truffleAssert.eventEmitted(mintTx, 'MintedSecToken', ev => { 
            return ev.stId.eq(new BN('12554203470773361527671578846415332832204710888928069025793')) // 0x0000000000000002000000000000000000000000000000000000000000000001
              && ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.mintedQty == 2000
            }
        );
        curHash = await checkHashUpdate(curHash);
        const st = await stm.getSecToken(new BN('12554203470773361527671578846415332832204710888928069025793'));
        assert(st.tokTypeId == CONST.tokenType.TOK_T2 && st.batchId == 2, 'unexpected token data');
    });

    // query contoller for single delegated sec token 
    it(`cashflow controller - should be able to delegate-fetch a single token with mapped batch ID & mapped token type ID from base (type 2)`, async () => {
        //const maxId = await stm.getSecToken_MaxId(); // (## token IDs in controller are fragmented, i.e. getSecToken_MaxId is a COUNT in the controller, not a MAX id)
        const st = await stm.getSecToken(new BN('12554203470773361527671578846415332832204710888928069025793'));
        assert(st.tokTypeId == 2, 'unexpected (unmapped?) tok-type id on token from controller');
        assert(st.batchId == 2, 'unexpected (unmapped?) batch id on token from controller');
    });

    // query controller's split ledger entry
    it(`cashflow controller - should be able to fetch a split (multi-delegated) ledger entry across all indirect token types`, async () => {
        const le_cftc = await stm.getLedgerEntry(M1);
        //console.log('le_cftc', le_cftc);
        assert(new BN(le_cftc.tokens[0].stId).eq(new BN('6277101735386680763835789423207666416102355444464034512897')), 'unexpected ledger token id (0)');
        assert(new BN(le_cftc.tokens[1].stId).eq(new BN('12554203470773361527671578846415332832204710888928069025793')), 'unexpected ledger token id (1)');

        assert(le_cftc.tokens[0].tokTypeId == CONST.tokenType.TOK_T1 && le_cftc.tokens[0].batchId == 1 && le_cftc.tokens[0].mintedQty == 1000, 'unexpected ledger token data (0)');
        assert(le_cftc.tokens[1].tokTypeId == CONST.tokenType.TOK_T2 && le_cftc.tokens[1].batchId == 2 && le_cftc.tokens[1].mintedQty == 2000, 'unexpected ledger token data (1)');
        assert(le_cftc.spot_sumQty == 3000, 'unexpected ledger sum data');

        // query base types directly - note: addr override on web3 helper methods
        const types = (await stm.getSecTokenTypes()).tokenTypes;
        for (var type of types) {
            const le_base = await CONST.web3_call('getLedgerEntry', [M1], /*nameOverride*/undefined, /*addrOverride*/type.cashflowBaseAddr);
            //console.log('le_base.tokens', le_base.tokens);
            assert(le_base.tokens.length == 1, 'unexpected base type (direct-query) token count');
        }
    });

    it(`cashflow controller - should be able to partially burn (split) an indirect token on a base type`, async () => {
        var le;
        
        // by qty - type 1
        var le_before = await stm.getLedgerEntry(M1);
        //console.log('le_before', le_before);
        const burnTx1 = await stm.burnTokens(M1, CONST.tokenType.TOK_T1, 100, []);
        curHash = await checkHashUpdate(curHash);
        var le_after = await stm.getLedgerEntry(M1);
        //console.log('le_after', le_after);
        assert(le_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1)[0].currentQty == 
               le_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1)[0].currentQty - 100, 'unexpected token qty (type 1) after burn by qty');

        // by qty - type 2
        le_before = await stm.getLedgerEntry(M1);
        const burnTx2 = await stm.burnTokens(M1, CONST.tokenType.TOK_T2, 200, []);
        curHash = await checkHashUpdate(curHash);
        le_after = await stm.getLedgerEntry(M1);
        assert(le_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2)[0].currentQty == 
               le_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2)[0].currentQty - 200, 'unexpected token qty (type 2) after burn by qty');

        //
        // burn by ID -- unlike transferOrTrade() by ID, this does not (yet?) accept burning of partial token(s) by ID, i.e.
        // the supplied qty must match exactly the STID summed quantities ("Quantity mistmatch" thrown by-design by the SC);
        // so disabling here, because we need to retain some tokens for subsequent tests...
        //

        // by id - type 1
        le_before = await stm.getLedgerEntry(M1);
        const burnTx1_byId = await stm.burnTokens(M1, CONST.tokenType.TOK_T1, 10, [le_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1)[0].stId]);
        curHash = await checkHashUpdate(curHash);
        le_after = await stm.getLedgerEntry(M1); 
        assert(le_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1)[0].currentQty == 
               le_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T1)[0].currentQty - 10, 'unexpected token qty (type 1) after burn by id');
        
        // by id - type 2
        le_before = await stm.getLedgerEntry(M1);
        //console.log('le_before.tokens', le_before.tokens);
        const burnTx2_byId = await stm.burnTokens(M1, CONST.tokenType.TOK_T2, 20, [le_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2)[0].stId]);
        curHash = await checkHashUpdate(curHash);
        le_after = await stm.getLedgerEntry(M1); 
        assert(le_after.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2)[0].currentQty == 
               le_before.tokens.filter(p => p.tokTypeId == CONST.tokenType.TOK_T2)[0].currentQty - 20, 'unexpected token qty (type 2) after burn by id');
    });

    // TOK-TRANSFER: ONE SIDED (w/ token batch token exchange fees)
    it(`cashflow controller - should be able to delegate-transfer base indirect token types across ledger entries: one-sided, M->B by qty, B->A by ID, w/ token batch & token exchange fees`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];

        // M->B: by qty (no fees)
        await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: M1,                       ledger_B: B,
                   qty_A: 100,                   tokTypeId_A: CONST.tokenType.TOK_T1,
                   qty_B: 0,                     tokTypeId_B: 0,
               k_stIds_A: [],                      k_stIds_B: [],
            ccy_amount_A: 0,                     ccyTypeId_A: 0,
            ccy_amount_B: 0,                     ccyTypeId_B: 0,
               applyFees: true,
        });
        curHash = await checkHashUpdate(curHash);

        // exchange token fee
        await stm.setFee_TokType(CONST.tokenType.TOK_T1, CONST.nullAddr, CONST.nullFees);
        await stm.setFee_TokType(CONST.tokenType.TOK_T1, B, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 2, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        // B->A: by ID (residual), w/ batch tok orig fee + exchange tok fees
        const le_before_A = await stm.getLedgerEntry(A);
        const le_before_B = await stm.getLedgerEntry(B);
        const stIds = le_before_B.tokens.map(p => p.stId);
        const data = await transferHelper.transferLedger({ stm, accounts, 
            ledger_A: A,                        ledger_B: B,
               qty_A: 0,                     tokTypeId_A: 0,                        k_stIds_A: [],   
               qty_B: 50,                    tokTypeId_B: CONST.tokenType.TOK_T1,   k_stIds_B: stIds,
        ccy_amount_A: 0,                     ccyTypeId_A: 0,
        ccy_amount_B: 0,                     ccyTypeId_B: 0,
           applyFees: true,
        });
        curHash = await checkHashUpdate(curHash);
        //truffleAssert.prettyPrintEmittedEvents(data.transferTx);
        await CONST.logGas(web3, data.transferTx, `Transfer STs B:(Type TOK_T1 / [${stIds.join(',')}]) / A:(null)`);

        const le_after_A = await stm.getLedgerEntry(A);
        const le_after_B = await stm.getLedgerEntry(B);

        // console.log('le_after_A.tokens', le_after_A.tokens);
        // console.log('stIds', stIds);
        // assert(stIds.every(p => le_after_A.tokens.some(p2 => p2.stId == p)), 'missing ledger A token ID(s) after transfer'); // ###

        // console.log('le_before_A.tokens', le_before_A.tokens);
        // console.log('le_before_B.tokens', le_before_B.tokens);
        // console.log('le_after_A.tokens', le_after_A.tokens);
        // console.log('le_after_B.tokens', le_after_B.tokens);
        //assert(!stIds.some(p => le_after_B.tokens.some(p2 => p2.stId == p)), 'unexpected ledger B token ID(s) after transfer'); // ###
    });
    it(`cashflow controller - should be able to delegate-transfer base indirect token types across ledger entries: one-sided, M->A by qty, A->B by ID, w/ token batch & token exchange fees`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];

        // A->B: by qty (A = minter, no fees)
        await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                        ledger_B: M1,
                   qty_A: 0,                     tokTypeId_A: 0,
                   qty_B: 100,                   tokTypeId_B: CONST.tokenType.TOK_T1,
               k_stIds_A: [],                      k_stIds_B: [],
            ccy_amount_A: 0,                     ccyTypeId_A: 0,
            ccy_amount_B: 0,                     ccyTypeId_B: 0,
               applyFees: true,
        });
        curHash = await checkHashUpdate(curHash);
        var le_A = await stm.getLedgerEntry(A);
        var le_B = await stm.getLedgerEntry(B);
        //console.log('le_A', le_A);
        //console.log('le_B', le_B);

        // exchange token fee
        await stm.setFee_TokType(CONST.tokenType.TOK_T1, CONST.nullAddr, CONST.nullFees );
        await stm.setFee_TokType(CONST.tokenType.TOK_T1, A, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 2, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        // B->A: by ID (residual/partial), w/ batch tok orig fee + exchange tok fees
        const stIds = le_A.tokens.map(p => p.stId);
        const data = await transferHelper.transferLedger({ stm, accounts, 
            ledger_A: A,                        ledger_B: B,
               qty_A: 50,                    tokTypeId_A: CONST.tokenType.TOK_T1,   k_stIds_A: stIds,
               qty_B: 0,                     tokTypeId_B: 0,                        k_stIds_B: [],
        ccy_amount_A: 0,                     ccyTypeId_A: 0,
        ccy_amount_B: 0,                     ccyTypeId_B: 0,
           applyFees: true,
        });
        curHash = await checkHashUpdate(curHash);
        //truffleAssert.prettyPrintEmittedEvents(data.transferTx);
        await CONST.logGas(web3, data.transferTx, `Transfer STs A:(Type TOK_T1 / [${stIds.join(',')}]) / B:(null)`);
        le_A = await stm.getLedgerEntry(A);
        le_B = await stm.getLedgerEntry(B);
        //console.log('le_A', le_A);
        //console.log('le_B', le_B);
    });

    // TOK-CCY TRANSFER: TWO SIDED (w/ exchange ccy fees per million, mirrored, & batch orginator fees...)
    it(`cashflow controller - should be able to delegate-trade base indirect token type 1 across ledger entries: two-sided, M->B by qty, A<->B by qty [, w/ exchange ccy fees per million mirrored & batch orig ccy fee]`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];

        // M1->B: by qty (no fees)
        await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: M1,                       ledger_B: B,
                   qty_A: 100,                   tokTypeId_A: CONST.tokenType.TOK_T1,
                   qty_B: 0,                     tokTypeId_B: 0,
               k_stIds_A: [],                      k_stIds_B: [],
            ccy_amount_A: 0,                     ccyTypeId_A: 0,
            ccy_amount_B: 0,                     ccyTypeId_B: 0,
               applyFees: true,
        });
        curHash = await checkHashUpdate(curHash);

        // exchange ccy fee per million
        //const ccy_perMillion = ... // 
        //const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ccy_mirrorFee: true, ccy_perMillion, fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        // fund B, trade small # of units, e.g. 100 and test granularity/resolution on feePerMillion semantics...
        const fundTx = await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, 100, A, 'TEST');
        curHash = await checkHashUpdate(curHash);

        // B<->A: by ID (all IDs), (todo: w/ exchange ccy fee per million)
        const le_before_A = await stm.getLedgerEntry(A);
        const le_before_B = await stm.getLedgerEntry(B);
        //const stIds = le_before_B.tokens.map(p => p.stId);
        const tokQty = 50, ccyQty = 50;
        const data = await transferHelper.transferLedger({ stm, accounts, 
            ledger_A: A,                        ledger_B: B,
               qty_A: 0,                     tokTypeId_A: 0,                        k_stIds_A: [],   
               qty_B: tokQty,                tokTypeId_B: CONST.tokenType.TOK_T1,   k_stIds_B: [], //stIds,
        ccy_amount_A: ccyQty,                ccyTypeId_A: CONST.ccyType.USD,
        ccy_amount_B: 0,                     ccyTypeId_B: 0,
           applyFees: true,
        });
        curHash = await checkHashUpdate(curHash);
        truffleAssert.prettyPrintEmittedEvents(data.transferTx);
        //await CONST.logGas(web3, data.transferTx, `Transfer STs B:(Type TOK_T1 / [${stIds.join(',')}]) / A:(Ccy USD / $1.00)`);
        await CONST.logGas(web3, data.transferTx, `Transfer STs B:(Type TOK_T1 / qty:${tokQty}[]) / A:(Ccy USD / $${ccyQty})`);

        const le_after_A = await stm.getLedgerEntry(A);
        const le_after_B = await stm.getLedgerEntry(B);
    });
    it(`cashflow controller - should be able to delegate-trade base indirect token type 2 across ledger entries: two-sided, M->B by qty, A<->B by qty [, w/ exchange ccy fees per million mirrored & batch orig ccy fee]`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];

        // M1->B: by qty (no fees)
        await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: M1,                       ledger_B: B,
                   qty_A: 100,                   tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                     tokTypeId_B: 0,
               k_stIds_A: [],                      k_stIds_B: [],
            ccy_amount_A: 0,                     ccyTypeId_A: 0,
            ccy_amount_B: 0,                     ccyTypeId_B: 0,
               applyFees: true,
        });
        curHash = await checkHashUpdate(curHash);

        // fund B, trade small # of units, e.g. 100 and test granularity/resolution on feePerMillion semantics...
        const fundTx = await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, 100, A, 'TEST');
        curHash = await checkHashUpdate(curHash);

        // B<->A: by ID (all IDs), (todo: w/ exchange ccy fee per million)
        const le_before_A = await stm.getLedgerEntry(A);
        const le_before_B = await stm.getLedgerEntry(B);
        //const stIds = le_before_B.tokens.map(p => p.stId);
        const tokQty = 40, ccyQty = 40;
        const data = await transferHelper.transferLedger({ stm, accounts, 
            ledger_A: A,                        ledger_B: B,
               qty_A: 0,                     tokTypeId_A: 0,                        k_stIds_A: [],   
               qty_B: tokQty,                tokTypeId_B: CONST.tokenType.TOK_T2,   k_stIds_B: [], //stIds,
        ccy_amount_A: ccyQty,                ccyTypeId_A: CONST.ccyType.USD,
        ccy_amount_B: 0,                     ccyTypeId_B: 0,
           applyFees: true,
        });
        curHash = await checkHashUpdate(curHash);
        truffleAssert.prettyPrintEmittedEvents(data.transferTx);
        //await CONST.logGas(web3, data.transferTx, `Transfer STs B:(Type TOK_T2 / [${stIds.join(',')}]) / A:(Ccy USD / $1.00)`);
        await CONST.logGas(web3, data.transferTx, `Transfer STs B:(Type TOK_T2 / qty:${tokQty}[]) / A:(Ccy USD / $${ccyQty})`);

        const le_after_A = await stm.getLedgerEntry(A);
        const le_after_B = await stm.getLedgerEntry(B);
    });

    async function mintBatchWithMetadata({ tokenType, qtyUnit, qtySecTokens, receiver, origTokFees, origCcyFee_percBips_ExFee, metaKeys, metaValues }) {
        const mintTx = await stm.mintSecTokenBatch(
            tokenType, qtyUnit, qtySecTokens, receiver, origTokFees, origCcyFee_percBips_ExFee, metaKeys, metaValues,
            //0,
        { from: accounts[0] });
        //truffleAssert.prettyPrintEmittedEvents(mintTx);

        const batchId = (await stm.getSecTokenBatch_MaxId.call()).toNumber();
        //console.log('batchId', batchId);
        
        const batch = await stm.getSecTokenBatch(batchId);
        //console.log('batch', batch);
        
        const batchKeys = batch.metaKeys;
        const batchValues = batch.metaValues;
        //console.dir(batchKeys);
        //console.dir(batchValues);

        assert(batchKeys.length == metaKeys.length, 'batch/supplied meta keys length mismatch');
        assert(batchValues.length == metaValues.length, 'batch/supplied meta values length mismatch');
        for (var i=0 ; i < batchKeys.length ; i++) {
            assert(batchKeys[i] == metaKeys[i], `batch/supplied meta key mismatch at position ${i}`);
        }
        for (var i=0 ; i < batchValues.length ; i++) {
            assert(batchValues[i] == metaValues[i], `batch/supplied meta value mismatch at position ${i}`);
        }
        return { batchId, mintTx };
    }

    async function checkHashUpdate(curHash) {
        newHash = await CONST.getLedgerHashcode(stm);
        assert(newHash.toString() != curHash.toString(), `expected ledger hashcode change (newHash=${newHash}, curHash=${curHash})`);
        return newHash;
    }
});