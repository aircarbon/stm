const truffleAssert = require('truffle-assertions');
const st = artifacts.require('StMaster');
const BN = require('bn.js');
const CONST = require('../const.js');
const transferHelper = require('./transferHelper.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
        
        await stm.whitelistMany(accounts.slice(global.TaddrNdx, global.TaddrNdx + 50));
        await stm.sealContract();
        await setupHelper.setDefaults({ stm, accounts });
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // NO FEES: one-sided transfer, no consideration
    it(`transferring tok by id - should allow one-sided multi-token transfer (A -> B) of specific STs across ledger entries`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];
        
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents, B,                          );

        const tokType = CONST.tokenType.TOK_T2;
        const le_before_A = await stm.getLedgerEntry(A);
        const sts_A = le_before_A.tokens.filter(p => p.tokTypeId == tokType && p.stId % 3 == 1);
        const stIds_A = sts_A.map(p => p.stId);
        const stsQty_A = sts_A.map(p => p.currentQty).reduce((a,b) => a.add(new BN(b)), new BN(0));
        //console.log('stIds_A', stIds_A);
        //console.log('stsQty_A.toString()', stsQty_A.toString());
        //console.log('le_before_A', le_before_A);

        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                     ledger_B: B,
                   qty_A: stsQty_A.toString(),                tokTypeId_A: tokType,
                   qty_B: 0,                                  tokTypeId_B: 0,
               k_stIds_A: stIds_A,                              k_stIds_B: [],
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
        });
        await CONST.logGas(web3, data.transferTx, `Transfer STs of type ${tokType} IDs: [${stIds_A.join(',')}]`);

        const le_after_A = await stm.getLedgerEntry(A);
        //console.log('le_after_A.tokens', le_after_A.tokens);
        assert(le_after_A.tokens.length == le_before_A.tokens.length - stIds_A.length, 'unexpected ledger A token count after transfer');
        const le_after_B = await stm.getLedgerEntry(B);
        //console.log('le_after_B.tokens', le_after_B.tokens);
        assert(le_after_B.tokens.length == stIds_A.length, 'unexpected ledger B token count after transfer');
        assert(data.tokFullEvents.length == stIds_A.length && data.tokPartialEvents == 0, 'unexpected event composition');
        assert(data.tokFullEvents.every(p => stIds_A.includes(p.stId.toString())), 'unexpected event detail');
    });
    it(`transferring tok by id - should allow one-sided multi-token transfer (B -> A) of specific STs across ledger entries`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];
        await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents, A,                           );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      B, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      B, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.KT_CARBON, 1,      B, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      B, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      B, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      B, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      B, CONST.nullFees, 0, [], []);

        const tokType = CONST.tokenType.TOK_T1;
        const le_before_B = await stm.getLedgerEntry(B);
        const sts_B = le_before_B.tokens.filter(p => p.tokTypeId == tokType && p.stId % 2 == 1);
        const stIds_B = sts_B.map(p => p.stId);
        const stsQty_B = sts_B.map(p => p.currentQty).reduce((a,b) => a.add(new BN(b)), new BN(0));
        //console.log('stIds_B', stIds_B);
        //console.log('stsQty_B.toString()', stsQty_B.toString());
        //console.log('le_before_B', le_before_B);

        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                     ledger_B: B,
                   qty_A: 0,                                  tokTypeId_A: 0,
                   qty_B: stsQty_B.toString(),                tokTypeId_B: tokType,
               k_stIds_A: [],                                   k_stIds_B: stIds_B,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
        });
        await CONST.logGas(web3, data.transferTx, `Transfer STs of type ${tokType} IDs: [${stIds_B.join(',')}]`);
        const le_after_B = await stm.getLedgerEntry(B);
        //console.log('le_after_B.tokens', le_after_B.tokens);
        assert(le_after_B.tokens.length == le_before_B.tokens.length - stIds_B.length, 'unexpected ledger B token count after transfer');
        const le_after_A = await stm.getLedgerEntry(A);
        //console.log('le_after_A.tokens', le_after_A.tokens);
        assert(le_after_A.tokens.length == stIds_B.length, 'unexpected ledger A token count after transfer');
        assert(data.tokFullEvents.length == stIds_B.length && data.tokPartialEvents == 0, 'unexpected event composition');
        assert(data.tokFullEvents.every(p => stIds_B.includes(p.stId.toString())), 'unexpected event detail');
    });

    // CCY FEES: two-sided transfer (ccy/tok)
    it(`transferring tok by id - should allow two-sided multi-token trade (A -> B) of specific STs for collateral across ledger entries, with exchange mirrored ccy fees and originator bps ccy fees`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];
        const origCcyFee_percBips_ExFee = 100;
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      A, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      A, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.KT_CARBON, 1,      A, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      A, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      A, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      A, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      A, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      A, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      A, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.fund(CONST.ccyType.USD,                   CONST.millionCcy_cents,  B,                                                  );

        // set global fee: ccy 3.00 /per Million qty received, MIRRORED
        const ccy_perMillion = 300; // $3
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ...CONST.nullFees, ccy_mirrorFee: true, ccy_perMillion } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyPerMillion', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_perMillion == ccy_perMillion && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).ccy_perMillion == ccy_perMillion, 'unexpected fee per Million received after setting ccy fee structure');
        
        // set specific transfer STs
        const tokType = CONST.tokenType.TOK_T2;
        const le_before_A = await stm.getLedgerEntry(A);
        const sts_A = le_before_A.tokens.filter(p => p.tokTypeId == tokType);
        const stIds_A = sts_A.map(p => p.stId);
        const stsQty_A = sts_A.map(p => p.currentQty).reduce((a,b) => a.add(new BN(b)), new BN(0));
        // console.log('stIds_A', stIds_A);
        // console.log('stsQty_A.toString()', stsQty_A.toString());
        // console.log('le_before_A', le_before_A);

        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                     ledger_B: B,
                   qty_A: stsQty_A.toString(),                tokTypeId_A: tokType,
                   qty_B: 0,                                  tokTypeId_B: 0,
               k_stIds_A: stIds_A,                              k_stIds_B: [],
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 100 * 1000,                         ccyTypeId_B: CONST.ccyType.USD,
               applyFees: true,
        });
        await CONST.logGas(web3, data.transferTx, `Transfer STs of type ${tokType} IDs: [${stIds_A.join(',')}]`);
        //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

        const le_after_A = await stm.getLedgerEntry(A);
        assert(le_after_A.tokens.length == le_before_A.tokens.length - stIds_A.length, 'unexpected ledger A token count after transfer');
        const le_after_B = await stm.getLedgerEntry(B);
        assert(le_after_B.tokens.length == stIds_A.length, 'unexpected ledger B token count after transfer');
        assert(data.tokFullEvents.length == stIds_A.length && data.tokPartialEvents == 0, 'unexpected event composition');
        assert(data.tokFullEvents.every(p => stIds_A.includes(p.stId.toString())), 'unexpected event detail');
    });
    it(`transferring tok by id - should allow two-sided multi-token trade (B -> A) of specific STs for collateral across ledger entries, with exchange mirrored ccy fees and originator bps ccy fees`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];
        const origCcyFee_percBips_ExFee = 1000;
        await stm.fund(CONST.ccyType.USD,                   CONST.millionCcy_cents,  A,                                                  );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      B, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      B, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.KT_CARBON, 1,      B, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      B, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.KT_CARBON, 1,      B, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      B, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.KT_CARBON, 1,      B, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.KT_CARBON, 1,      B, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.KT_CARBON, 1,      B, CONST.nullFees, origCcyFee_percBips_ExFee, [], []);

        // set global fee: ccy 3.00 /per Million qty received, MIRRORED
        const ccy_perMillion = 300; // $3
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { ...CONST.nullFees, ccy_mirrorFee: true, ccy_perMillion } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyPerMillion', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_perMillion == ccy_perMillion && ev.ledgerOwner == CONST.nullAddr);
        assert((await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr)).ccy_perMillion == ccy_perMillion, 'unexpected fee per Million received after setting ccy fee structure');
        
        // set specific transfer STs
        const tokType = CONST.tokenType.TOK_T3;
        const le_before_B = await stm.getLedgerEntry(B);
        const sts_B = le_before_B.tokens.filter(p => p.tokTypeId == tokType);
        const stIds_B = sts_B.map(p => p.stId);
        const stsQty_B = sts_B.map(p => p.currentQty).reduce((a,b) => a.add(new BN(b)), new BN(0));
        // console.log('stIds_B', stIds_B);
        // console.log('stsQty_B.toString()', stsQty_B.toString());
        // console.log('le_before_A', le_before_A);

        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                     ledger_B: B,
                   qty_A: 0,                                  tokTypeId_A: 0,
                   qty_B: stsQty_B.toString(),                tokTypeId_B: tokType,
               k_stIds_A: [],                                   k_stIds_B: stIds_B,
            ccy_amount_A: 100 * 1000,                         ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
               applyFees: true,
        });
        await CONST.logGas(web3, data.transferTx, `Transfer STs of type ${tokType} IDs: [${stIds_B.join(',')}]`);
        //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

        const le_after_B = await stm.getLedgerEntry(B);
        assert(le_after_B.tokens.length == le_before_B.tokens.length - stIds_B.length, 'unexpected ledger B token count after transfer');

        const le_after_A = await stm.getLedgerEntry(A);
        assert(le_after_A.tokens.length == stIds_B.length, 'unexpected ledger A token count after transfer');
        assert(data.tokFullEvents.length == stIds_B.length && data.tokPartialEvents == 0, 'unexpected event composition');
        assert(data.tokFullEvents.every(p => stIds_B.includes(p.stId.toString())), 'unexpected event detail');
    });

    // NO FEES: two-sided transfer (tok/tok)
    it(`transferring tok by id - should allow two-sided multi-token swap (B <-> A) of specific STs across ledger entries, no token fees, different types`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];

        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.KT_CARBON, 1,      A, CONST.nullFees, 0, [], []);

        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      B, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      B, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      B, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.KT_CARBON, 1,      B, CONST.nullFees, 0, [], []);

        // set specific transfer STs
        const tokTypeId_A = CONST.tokenType.TOK_T1;
        const le_before_A = await stm.getLedgerEntry(A);
        const sts_A = le_before_A.tokens.filter(p => p.tokTypeId == tokTypeId_A);
        const stIds_A = sts_A.map(p => p.stId);
        const stsQty_A = sts_A.map(p => p.currentQty).reduce((a,b) => a.add(new BN(b)), new BN(0));

        const tokTypeId_B = CONST.tokenType.TOK_T2;
        const le_before_B = await stm.getLedgerEntry(B);
        const sts_B = le_before_B.tokens.filter(p => p.tokTypeId == tokTypeId_B);
        const stIds_B = sts_B.map(p => p.stId);
        const stsQty_B = sts_B.map(p => p.currentQty).reduce((a,b) => a.add(new BN(b)), new BN(0));

        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                     ledger_B: B,
                   qty_A: stsQty_A.toString(),                tokTypeId_A: tokTypeId_A,
                   qty_B: stsQty_B.toString(),                tokTypeId_B: tokTypeId_B,
               k_stIds_A: stIds_A,                              k_stIds_B: stIds_B,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
               applyFees: true,
        });
        await CONST.logGas(web3, data.transferTx, `Swap STs A:(Type ${tokTypeId_A} / [${stIds_A.join(',')}]) / B:(Type ${tokTypeId_B} [${stIds_B.join(',')}])`);
        //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

        const le_after_A = await stm.getLedgerEntry(A);
        const le_after_B = await stm.getLedgerEntry(B);
        // console.log('le_after_A', le_after_A);
        // console.log('le_after_B', le_after_B);
        assert(le_after_A.tokens.length == le_before_A.tokens.length - stIds_A.length + stIds_B.length, 'unexpected ledger A token count after transfer');
        assert(le_after_B.tokens.length == le_before_B.tokens.length - stIds_B.length + stIds_A.length, 'unexpected ledger B token count after transfer');

        assert(data.tokFullEvents.length == stIds_A.length + stIds_B.length && data.tokPartialEvents == 0, 'unexpected event composition');
        assert(data.tokFullEvents.every(p => stIds_A.includes(p.stId.toString()) || stIds_B.includes(p.stId.toString())), 'unexpected event detail');    
    });

    // TOKEN FEES: two-sided transfer w/ batch originator fees (tok/tok)
    it(`transferring tok by id - should allow two-sided multi-token residual qty swap (B <-> A) of specific STs across ledger entries, w/ batch originator token fees, different types`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1],
              M1 = accounts[global.TaddrNdx + 2], M2 = accounts[global.TaddrNdx + 3]; global.TaddrNdx += 2;

        const origFee = { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 1, fee_percBips: 0, fee_min: 1, fee_max: 1 };

        // setup: mint M1 -> A (by qty)
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      M1, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      M1, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.KT_CARBON, 1,      M1, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.KT_CARBON, 1,      M1, CONST.nullFees, 0, [], []);
        const tokTypeId_A = CONST.tokenType.TOK_T1;
        const le_M1 = await stm.getLedgerEntry(M1);
        const sts_A = le_M1.tokens.filter(p => p.tokTypeId == tokTypeId_A);
        const stIds_A = sts_A.map(p => p.stId);
        const stsQty_A = sts_A.map(p => p.currentQty).reduce((a,b) => a.add(new BN(b)), new BN(0));
        var data = await transferHelper.transferLedger({ stm, accounts, 
            ledger_A: M1,                                    ledger_B: A,
               qty_A: stsQty_A.toString(),                tokTypeId_A: tokTypeId_A,
               qty_B: 0,                                  tokTypeId_B: 0,
           k_stIds_A: [],                                   k_stIds_B: [],
        ccy_amount_A: 0,                                  ccyTypeId_A: 0,
        ccy_amount_B: 0,                                  ccyTypeId_B: 0,
           applyFees: true,
        });
        const le_before_A = await stm.getLedgerEntry(A);

        // setup: mint M2 -> B
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      M2, origFee, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      M2, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1,      M2, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.KT_CARBON, 1,      M2, CONST.nullFees, 0, [], []);
        const tokTypeId_B = CONST.tokenType.TOK_T2;
        const le_M2 = await stm.getLedgerEntry(M2);
        const sts_B = le_M2.tokens.filter(p => p.tokTypeId == tokTypeId_B);
        const stIds_B = sts_B.map(p => p.stId);
        const stsQty_B = sts_B.map(p => p.currentQty).reduce((a,b) => a.add(new BN(b)), new BN(0));
        var data = await transferHelper.transferLedger({ stm, accounts, 
            ledger_A: M2,                                    ledger_B: B,
               qty_A: stsQty_B.toString(),                tokTypeId_A: tokTypeId_B,
               qty_B: 0,                                  tokTypeId_B: 0,
           k_stIds_A: [],                                   k_stIds_B: [],
        ccy_amount_A: 0,                                  ccyTypeId_A: 0,
        ccy_amount_B: 0,                                  ccyTypeId_B: 0,
           applyFees: true,
        });
        const le_before_B = await stm.getLedgerEntry(B);

        // ** test transfer: A <=> B by stId (qty != st qty's: one partial [or residual] ST), w/ originator fees **
        const stsTestQty_A = stsQty_A;
        const stsTestQty_B = stsQty_B.sub(new BN(2)); // allow for originator fees, and then a little more so we end up with one partial token user transfer (and the rest full)
        data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                     ledger_B: B,
                   qty_A: stsTestQty_A.toString(),            tokTypeId_A: tokTypeId_A,
                   qty_B: stsTestQty_B.toString(),            tokTypeId_B: tokTypeId_B,
               k_stIds_A: stIds_A,                              k_stIds_B: stIds_B,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
               applyFees: true,
        });
        await CONST.logGas(web3, data.transferTx, `Swap STs A:(Type ${tokTypeId_A} / [${stIds_A.join(',')}]) / B:(Type ${tokTypeId_B} [${stIds_B.join(',')}])`);
        truffleAssert.prettyPrintEmittedEvents(data.transferTx);
        console.log(data);

        const le_after_A = await stm.getLedgerEntry(A);
        const le_after_B = await stm.getLedgerEntry(B);
        //console.log('le_before_A', le_before_A);
        //console.log('le_after_A', le_after_A);
        assert(le_after_A.tokens.length == le_before_A.tokens.length - stIds_A.length + stIds_B.length, 'unexpected ledger A token count after transfer');
        assert(le_after_B.tokens.length == le_before_B.tokens.length - stIds_B.length + stIds_A.length + 1, 'unexpected ledger B token count after transfer'); // one partial

        assert(data.tokFullEvents.filter(p => p.transferType == CONST.transferType.USER).length 
             + data.tokPartialEvents.filter(p => p.transferType == CONST.transferType.USER).length 
              == stIds_A.length + stIds_B.length, 'unexpected event composition');

        assert(data.tokFullEvents.every(p => stIds_A.includes(p.stId.toString()) || stIds_B.includes(p.stId.toString()))
            && data.tokPartialEvents.every(p => stIds_A.includes(p.stId.toString()) || stIds_B.includes(p.stId.toString())), 'unexpected event detail');  
    });

    // TODO: exchange token fees...

});