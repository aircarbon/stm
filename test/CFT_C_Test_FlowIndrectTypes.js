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

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.CASHFLOW_CONTROLLER) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 0;

        // whitelist & seal ontroller
        const wlAddrs = accounts.slice(global.TaddrNdx, global.TaddrNdx + 50);
        await stm.whitelistMany(wlAddrs);
        await stm.sealContract();

        // whitelist & seal base types
        //if (await stm.getContractType() == CONST.contractType.CASHFLOW_CONTROLLER) {
            const types = (await stm.getSecTokenTypes()).tokenTypes;
            const O = await CONST.getAccountAndKey(0);
            for (var type of types) {
                await CONST.web3_tx('whitelistMany', [wlAddrs], O.addr, O.privKey, /*nameOverride*/undefined, /*addrOverride*/type.cashflowBaseAddr);
                await CONST.web3_tx('sealContract', [], O.addr, O.privKey, /*nameOverride*/undefined, /*addrOverride*/type.cashflowBaseAddr);
            }
        //}
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    //
    // ORDERED
    //

    // indirect types & minting
    // it(`cashflow controller - should be able to query controller's indirect types (default deployer: 2 indirect types)`, async () => {
    //     const types = (await stm.getSecTokenTypes()).tokenTypes;
    //     assert(types.length == 2);
    // });
    it(`cashflow controller - allow an initial unibatch mint on an indirect passed-through cashflow base (type 1)`, async () => {
        const M = accounts[0];
        const origFee = { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 1, fee_percBips: 0, fee_min: 1, fee_max: 0 };
        //const origFee = CONST.nullFees;
        const { batchId, mintTx } = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: M, origTokFees: origFee, metaKeys: [ 'key1', 'key2' ],  metaValues: [ 'val1', 'val2' ],
        }, );
        //truffleAssert.prettyPrintEmittedEvents(mintTx);
        
        truffleAssert.eventEmitted(mintTx, 'Minted', ev => ev.batchId == 1 && ev.tokTypeId == CONST.tokenType.TOK_T1 && ev.mintQty == 1000);
        truffleAssert.eventEmitted(mintTx, 'MintedSecToken', ev => { 
            return ev.stId.eq(new BN('6277101735386680763835789423207666416102355444464034512897')) // 0x0000000000000001000000000000000000000000000000000000000000000001
              && ev.tokTypeId == CONST.tokenType.TOK_T1 && ev.mintedQty == 1000
            }
        );
        const st = await stm.getSecToken(new BN('6277101735386680763835789423207666416102355444464034512897'));
        assert(st.tokTypeId == CONST.tokenType.TOK_T1 && st.batchId == 1, 'unexpected token data');
    });
    // it(`cashflow controller - should not allow a subsequent batch mint for the same indirect base (type 1)`, async () => {
    //     const M = accounts[0];
    //     try {
    //         const { batchId, mintTx } = await mintBatchWithMetadata( 
    //             { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 100, qtySecTokens: 1, receiver: M,
    //                metaKeys: [ 'key3', 'key4' ],
    //              metaValues: [ 'val4', 'val4' ],
    //         }, { from: accounts[0] } );
    //     } catch (ex) { assert(ex.reason == 'Bad cashflow request', `unexpected: ${ex.reason}`); return; }
    // });
    // it(`cashflow controller - should allow an initial unibatch mint on a different indirect passed-through cashflow base (type 2)`, async () => {
    //     const M = accounts[0];
    //     const { batchId, mintTx } = await mintBatchWithMetadata( 
    //         { tokenType: CONST.tokenType.TOK_T2, qtyUnit: 2000, qtySecTokens: 1, receiver: M, metaKeys: [ 'key5', 'key6' ], metaValues: [ 'val5', 'val6' ],
    //     }, );
    //     truffleAssert.eventEmitted(mintTx, 'Minted', ev => ev.batchId == 2 && ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.mintQty == 2000);
    //     truffleAssert.eventEmitted(mintTx, 'MintedSecToken', ev => { 
    //         return ev.stId.eq(new BN('12554203470773361527671578846415332832204710888928069025793')) // 0000000000000002000000000000000000000000000000000000000000000001
    //           && ev.tokTypeId == CONST.tokenType.TOK_T2 && ev.mintedQty == 2000
    //         }
    //     );
    //     const st = await stm.getSecToken(new BN('12554203470773361527671578846415332832204710888928069025793'));
    //     assert(st.tokTypeId == CONST.tokenType.TOK_T2 && st.batchId == 2, 'unexpected token data');
    // });

    // query contoller for single delegated sec token 
    // it(`cashflow controller - should be able to delegate-fetch a single token with mapped batch ID & mapped token type ID from base (type 2)`, async () => {
    //     //const maxId = await stm.getSecToken_MaxId(); // (## token IDs in controller are fragmented, i.e. getSecToken_MaxId is a COUNT in the controller, not a MAX id)
    //     const st = await stm.getSecToken(new BN('12554203470773361527671578846415332832204710888928069025793'));
    //     assert(st.tokTypeId == 2, 'unexpected (unmapped?) tok-type id on token from controller');
    //     assert(st.batchId == 2, 'unexpeMayBE cted (unmapped?) batch id on token from controller');
    // });

    // query controller's split ledger entry
    // it(`cashflow controller - should be able to fetch a split (multi-delegated) ledger entry across all indirect token types`, async () => {
    //     const le_cftc = await stm.getLedgerEntry(accounts[0]); 
    //     console.log('le_cftc', le_cftc);
    //     assert(new BN(le_cftc.tokens[0].stId).eq(new BN('6277101735386680763835789423207666416102355444464034512897')), 'unexpected ledger token id (0)');
    //     assert(new BN(le_cftc.tokens[1].stId).eq(new BN('12554203470773361527671578846415332832204710888928069025793')), 'unexpected ledger token id (1)');

    //     assert(le_cftc.tokens[0].tokTypeId == CONST.tokenType.TOK_T1 && le_cftc.tokens[0].batchId == 1 && le_cftc.tokens[0].mintedQty == 1000, 'unexpected ledger token data (0)');
    //     assert(le_cftc.tokens[1].tokTypeId == CONST.tokenType.TOK_T2 && le_cftc.tokens[1].batchId == 2 && le_cftc.tokens[1].mintedQty == 2000, 'unexpected ledger token data (1)');
    //     assert(le_cftc.spot_sumQty == 3000, 'unexpected ledger sum data');

    //     // query base types directly - note: addr override on web3 helper methods
    //     const types = (await stm.getSecTokenTypes()).tokenTypes;
    //     for (var type of types) {
    //         const le_base = await CONST.web3_call('getLedgerEntry', [accounts[0]], /*nameOverride*/undefined, /*addrOverride*/type.cashflowBaseAddr);
    //         console.log('le_base.tokens', le_base.tokens);
    //     }
    // });

    // it(`cashflow controller - should be able to partially burn (split) an indirect token on a base type`, async () => {
    //     const M = accounts[0];
    //     var le;
        
    //     // by qty - type 1
    //     const burnTx1 = await stm.burnTokens(M, CONST.tokenType.TOK_T1, 100, []);
    //     var le = await stm.getLedgerEntry(accounts[0]); 
    //     console.log('le', le);

    //     // by qty - type 2
    //     const burnTx2 = await stm.burnTokens(M, CONST.tokenType.TOK_T2, 200, []);
    //     le = await stm.getLedgerEntry(accounts[0]); 
    //     console.log('le', le);

    //     // by id - type 1
    //     // const burnTx1_byId = await stm.burnTokens(M, CONST.tokenType.TOK_T1, 900, [le.tokens[0].stId]);
    //     // le = await stm.getLedgerEntry(accounts[0]); 
    //     // console.log('le', le);

    //     // // by id - type 2
    //     // const burnTx2_byId = await stm.burnTokens(M, CONST.tokenType.TOK_T2, 1800, [le.tokens[0].stId]);
    //     // le = await stm.getLedgerEntry(accounts[0]); 
    //     // console.log('le', le);
    // });

    it(`cashflow controller - should be able to delegate-transfer base indirect token types across ledger entries (one-sided, A->B by qty & by ID)`, async () => {
        const A = accounts[0], B = accounts[global.TaddrNdx + 0];

        // A->B: by qty
        await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                        ledger_B: B,
                   qty_A: 100,                   tokTypeId_A: CONST.tokenType.TOK_T1,
                   qty_B: 0,                     tokTypeId_B: 0,
               k_stIds_A: [],                      k_stIds_B: [],
            ccy_amount_A: 0,                     ccyTypeId_A: 0,
            ccy_amount_B: 0,                     ccyTypeId_B: 0,
               applyFees: true,
        });
        var le_A = await stm.getLedgerEntry(A);
        var le_B = await stm.getLedgerEntry(B);
        //console.log('le_A', le_A);
        //console.log('le_B', le_B);

        // B->A: by ID (residual), w/ batch tok orig fee
        const stIds = le_B.tokens.map(p => p.stId);
        //console.log('stIds', stIds);
        await transferHelper.transferLedger({ stm, accounts, 
            ledger_A: A,                        ledger_B: B,
               qty_A: 0,                     tokTypeId_A: 0,                        k_stIds_A: [],   
               qty_B: 99,                    tokTypeId_B: CONST.tokenType.TOK_T1,   k_stIds_B: stIds,
        ccy_amount_A: 0,                     ccyTypeId_A: 0,
        ccy_amount_B: 0,                     ccyTypeId_B: 0,
           applyFees: true,
        });

        le_A = await stm.getLedgerEntry(A);
        le_B = await stm.getLedgerEntry(B);
        //console.log('le_A', le_A);
        //console.log('le_B', le_B);

        // TODO: TESTS (COMMODITY) -- by ID, w/ orig tok fees + w/ exchange tok fees...
        
        // TODO: #0 fund/withdraw - comment/desc to events (for arbitrary off-chain fees)
        // TODO: #1 k_stIds[] + qty (differing, i.e. partial transfer/burn, by ID)
        // TODO: #2 getBatches[]
    });
    // todo: B ->A by Qty & ID
    // todo: A<->B, 4 permutations
    // 8 total perms!

    // TODO: previews...()
    //
    // TODO: !? getLedgerHashcode() -> controller needs to delegate to base for ST data...? 
    //        > multiple upgrade cases: 
    //              (1) controller upgraded, bases remain in-place
    //              (2) bases upgraded, controller remains
    //              (3) base & controllers upgraded

    async function mintBatchWithMetadata({ tokenType, qtyUnit, qtySecTokens, receiver, origTokFees, metaKeys, metaValues }) {
        const mintTx = await stm.mintSecTokenBatch(
            tokenType, qtyUnit, qtySecTokens, receiver, origTokFees, 0, metaKeys, metaValues,
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

});