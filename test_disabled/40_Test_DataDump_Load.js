const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const _ = require('lodash');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm_cur, stm_new;

    before(async function () {  
        stm_cur = await st.deployed();
        //if (await stm_cur.getContractType() == CONST.contractType.CASHFLOW) this.skip();
        console.log(`stm_cur: @${stm_cur.address} ledgerHash=${await stm_cur.getLedgerHashcode()} / ${await stm_cur.name()} ${await stm_cur.version()}`);

        // explorers need unique contract names?!
        stm_new = await st.new(
            await stm_cur.getContractType(),
            (await stm_cur.getCashflowData()).args,
            `${await stm_cur.name()}_V++`,
            `${await stm_cur.version()}_V++`,
            await stm_cur.unit(),
            await stm_cur.symbol(),
            await stm_cur.decimals(),
            await stm_cur.chainlinkAggregator_btcUsd(),
            await stm_cur.chainlinkAggregator_ethUsd()
        );
        console.log(`stm_new: @${stm_new.address} ledgerHash=${await stm_new.getLedgerHashcode()} / ${await stm_new.name()} ${await stm_new.version()}`);
    });

    it(`data dump - should be able to read without gas fees`, async () => {
        var curHash = await stm_cur.getLedgerHashcode();
        const ccyTypesData = await stm_cur.getCcyTypes();
        const stTypesData = await stm_cur.getSecTokenTypes();
        const whitelist = await stm_cur.getWhitelist();
        const allLedgerOwners = await stm_cur.getLedgerOwners();
        const ledgerEntry = await stm_cur.getLedgerEntry(accounts[0]);
        const cashflowData = await stm_cur.getCashflowData();
    });

    it(`data dump - should be able to read all contract data`, async function () {
        if (await stm_cur.getContractType() == CONST.contractType.CASHFLOW) this.skip();

        const ENTRY_COUNT = 1;
        var curHash = await stm_cur.getLedgerHashcode();

        // ccy types
        await stm_cur.addCcyType('TEST_CCY_TYPE', 'TEST_UNIT', 42);
        const ccyTypesData = await stm_cur.getCcyTypes();
        console.log(`Ccy Types: ${ccyTypesData.ccyTypes.map(p => p.name).join(', ')}`);
        curHash = await checkHashUpdate(curHash);

        // token types
        const stTypesData = await stm_cur.getSecTokenTypes();
        if (await stm_cur.getContractType() == CONST.contractType.COMMODITY) {
            await stm_cur.addSecTokenType('NEW_TOK_TYPE', { from: accounts[0] });
            console.log(`St Types: ${stTypesData.tokenTypes.map(p => p.name).join(', ')}`);
            curHash = await checkHashUpdate(curHash);
        }

        // whitelist
        for (let i=0 ; i < ENTRY_COUNT + 1; i++)
            await stm_cur.whitelist(accounts[i]);
        const whitelist = await stm_cur.getWhitelist();
        console.log(`Whitelist: ${whitelist.join(', ')}`);
        curHash = await checkHashUpdate(curHash);
        stm_cur.sealContract();

        // exchange fee - ccy's
        for (let i=0 ; i < ccyTypesData.ccyTypes.length; i++) {
            const ccyType = ccyTypesData.ccyTypes[i];
            const setFee = await stm_cur.setFee_CcyType(ccyType.id, CONST.nullAddr, { fee_fixed: i+1, fee_percBips: (i+1)*100, fee_min: (i+1), fee_max: (i+1+100) } );
            const x = await stm_cur.getFee(CONST.getFeeType.CCY, ccyType.id, CONST.nullAddr);
            console.log(`Exchange Fee: ccyTypeId=${ccyType.id} { x.fee_fixed=${x.fee_fixed} / x.fee_percBips=${x.fee_percBips} / x.fee_min=${x.fee_min} / x.fee_max=${x.fee_max} }`);
            curHash = await checkHashUpdate(curHash);
        }

        // exchange fee - tok's
        for (let i=0 ; i < stTypesData.tokenTypes.length; i++) {
            const tokType = stTypesData.tokenTypes[i];
            const setFee = await stm_cur.setFee_TokType(tokType.id, CONST.nullAddr, { fee_fixed: i+1, fee_percBips: (i+1)*100, fee_min: (i+1), fee_max: (i+1+100) } );
            const x = await stm_cur.getFee(CONST.getFeeType.TOK, tokType.id, CONST.nullAddr);
            console.log(`Exchange Fee: tokType=${tokType.id} { x.fee_fixed=${x.fee_fixed} / x.fee_percBips=${x.fee_percBips} / x.fee_min=${x.fee_min} / x.fee_max=${x.fee_max} }`);
            curHash = await checkHashUpdate(curHash);
        }

        // ledger - batches
        const MM = [];
        for (let i=1 ; i <= ENTRY_COUNT ; i++) { // test data - mint for accounts after owner, move some to owner

            const M = accounts[i];
            MM.push(M);
            const batchFee = { fee_fixed: i+1, fee_percBips: (i+1)*100, fee_min: (i+1), fee_max: (i+1+100) };
            const metaKVPs = [
                { k: `DATADUMP_TEST_${i+1}`,        v: `${i+1}` },
                { k: `DATADUMP_TEST2_${(i+1)*100}`, v: `${(i+1)*100}` },
            ];
            
            // mint
            console.log('minting for account... ', M);
            const mintTx_B1 = await stm_cur.mintSecTokenBatch(CONST.tokenType.CORSIA, 1000 * (i+1), 1, M, batchFee,  metaKVPs.map(p => p.k), metaKVPs.map(p => p.v), { from: accounts[0] });
            curHash = await checkHashUpdate(curHash);
            if (await stm_cur.getContractType() == CONST.contractType.COMMODITY) {
                const mintTx_B2 = await stm_cur.mintSecTokenBatch(CONST.tokenType.NATURE,    10000 * (i+1), 1, M, batchFee, metaKVPs.map(p => p.k), metaKVPs.map(p => p.v), { from: accounts[0] });
                curHash = await checkHashUpdate(curHash);
            }

            // transfer to owner - batch 1 CORSIA, no fees
            const send_tx_B1 = await stm_cur.transferOrTrade({ 
                        ledger_A: M,                            ledger_B: accounts[0], 
                           qty_A: 200,                     tokenTypeId_A: CONST.tokenType.CORSIA, 
                           qty_B: 0,                       tokenTypeId_B: 0, 
                    ccy_amount_A: 0,                         ccyTypeId_A: 0, 
                    ccy_amount_B: 0,                         ccyTypeId_B: 0, 
                       applyFees: false,
                    feeAddrOwner: CONST.nullAddr,
                },
                { from: accounts[0] }
            );
            curHash = await checkHashUpdate(curHash);

            // transfer to owner - batch 2 NATURE, with fees
            if (await stm_cur.getContractType() == CONST.contractType.COMMODITY) {
                    const send_tx_B2 = await stm_cur.transferOrTrade({ 
                         ledger_A: M,                            ledger_B: accounts[0], 
                            qty_A: 100,                     tokenTypeId_A: CONST.tokenType.NATURE, 
                            qty_B: 0,                       tokenTypeId_B: 0, 
                     ccy_amount_A: 0,                         ccyTypeId_A: 0, 
                     ccy_amount_B: 0,                         ccyTypeId_B: 0, 
                        applyFees: true,
                        feeAddrOwner: CONST.nullAddr,
                    },
                    { from: accounts[0] }
                );
                curHash = await checkHashUpdate(curHash);
            }

            // burn - parital, CORSIA
            const burn_tx_B1 = await stm_cur.burnTokens(M, CONST.tokenType.CORSIA, 1);
            curHash = await checkHashUpdate(curHash);

            // burn - full, batch 2 NATURE
            const burn_tx_B2 = await stm_cur.burnTokens(M, CONST.tokenType.NATURE, 100);
            curHash = await checkHashUpdate(curHash);
        }
        const batchCount = await stm_cur.getSecTokenBatchCount.call();
        for (let i=1 ; i <= batchCount; i++) { // read all
            const x = await stm_cur.getSecTokenBatch(i); // --> StructLib.SecTokenBatch
            console.log(`Batch Data: id=${i} mintedQty=${x.mintedQty} burnedQty=${x.burnedQty} metaKeys=${x.metaKeys.join()} metaValues=${x.metaValues.join()} { x.fee_fixed=${x.origTokFee.fee_fixed} / x.fee_percBips=${x.origTokFee.fee_percBips} / x.fee_min=${x.origTokFee.fee_min} / x.fee_max=${x.origTokFee.fee_max} }`);
        }

        // ledger entries: fund, set ledger fees
        const entryCount = await stm_cur.getLedgerOwnerCount(); // DATA_DUMP: individual fetches
        const allEntries = await stm_cur.getLedgerOwners(); // ## NON-PAGED - x-ref check
        assert(allEntries.length == entryCount, 'getLedgerOwnerCount / getLedgerOwners mismatch');
        
        for (let j=0 ; j < entryCount; j++) { // fund, withdraw & set ledger ccy & tok type fees
            const entryOwner = await stm_cur.getLedgerOwner(j);
            
            // for all ccy types
            for (let i=0 ; i < ccyTypesData.ccyTypes.length; i++) { // test ccy data 
                const ccyType = ccyTypesData.ccyTypes[i];
            
                // fund to ledger
                await stm_cur.fund(ccyType.id, (j+1)*100+(i+1), entryOwner, { from: accounts[0] });
                if (entryOwner != accounts[0])
                    curHash = await checkHashUpdate(curHash);

                // withdraw from ledger
                await stm_cur.withdraw(ccyType.id, 1, entryOwner, { from: accounts[0] });
                if (entryOwner != accounts[0])
                    curHash = await checkHashUpdate(curHash);

                // set ledger ccy fee
                await stm_cur.setFee_CcyType(ccyType.id, entryOwner, { fee_fixed: i+2+j+2, fee_percBips: (i+2+j+2)*100, fee_min: (i+2+j+2), fee_max: (i+2+j+2+100) } );
                if (entryOwner != accounts[0])
                    curHash = await checkHashUpdate(curHash);
            }

            // for all token types
            for (let k=0 ; k < stTypesData.tokenTypes.length; k++) {
                const tokType = stTypesData.tokenTypes[k];

                // set ledger token fee
                await stm_cur.setFee_TokType(tokType.id, entryOwner, { fee_fixed: k+4+j+4, fee_percBips: (k+4+j+4)*100, fee_min: (k+4+j+4), fee_max: (k+4+j+4+100) } );
                if (entryOwner != accounts[0])
                    curHash = await checkHashUpdate(curHash);
            }
        }

        // ledger entries: iterate, read all
        // for (let i=0 ; i < entryCount; i++) {
        //     //const entry = entries[i]; // ## NON-PAGED
        //     const entryOwner = await stm.getLedgerOwner(i); // DATA_DUMP: individual fetches
        //     const x = await stm.getLedgerEntry(entryOwner);
        //     console.log(`Ledger Entry: ${entryOwner} tok.stId=[ ${x.tokens.map(p => p.stId).join(', ')} ] ccy.bal=[${x.ccys.map(p => `{ccyId=${p.ccyTypeId} bal=${p.balance}}`).join(', ')}]`);
            
        //     for (let j=0 ; j < x.ccys.length; j++) { // ledger ccy type fee
        //         const ccy = x.ccys[j];
        //         const x2 = await stm.getFee(CONST.getFeeType.CCY, ccy.ccyTypeId, entryOwner);
        //         console.log(`\tLedger Fee: ccyId=${ccy.ccyTypeId} { x2.fee_fixed=${x2.fee_fixed} / x2.fee_percBips=${x2.fee_percBips} / x2.fee_min=${x2.fee_min} / x2.fee_max=${x2.fee_max} }`)
        //     }

        //     const stTypeIds = [];
        //     const tokens = [];
        //     for (let j=0 ; j < x.tokens.length; j++) { // get ledger token types
        //         const st = x.tokens[j];
        //         if (!stTypeIds.includes(st.tokenTypeId)) stTypeIds.push(st.tokenTypeId);

        //         tokens.push(await stm.getSecToken(st.stId));
        //     }

        //     for (let j=0 ; j < stTypeIds.length; j++) { // ledger tok type fee
        //         const x2 = await stm.getFee(CONST.getFeeType.TOK, stTypeIds[j], entryOwner);
        //         console.log(`\tLedger Fee: stTypeId=${stTypeIds[j]} { x2.fee_fixed=${x2.fee_fixed} / x2.fee_percBips=${x2.fee_percBips} / x2.fee_min=${x2.fee_min} / x2.fee_max=${x2.fee_max} }`)
        //     }

        //     // ledger tokens
        //     console.log(`\tLedger Tokens: [ ${tokens.map(p => `{ id: ${p.id}, batchId: ${p.batchId} curQty: ${p.currentQty}, mintedQty: ${p.mintedQty} }`).join(', ')} ]`);
        // }
    });

    it(`data load - should be able to initialize a new contract with data from old`, async () => {

        //
        // cashflow data: args are set in new contract ctor()
        // TODO: remaining cashflow data (need StDataLoadable support...)
        //...

        // load ccy & token types
        const curCcys = await stm_cur.getCcyTypes(), newCcys = await stm_new.getCcyTypes(), loadCcys = _.differenceWith(curCcys.ccyTypes, newCcys.ccyTypes, _.isEqual);
        _.forEach(loadCcys, async (p) => await stm_new.addCcyType(p.name, p.unit, p.decimals));

        const curToks = await stm_cur.getSecTokenTypes(), newToks = await stm_new.getSecTokenTypes(), loadToks = _.differenceWith(curToks.tokenTypes, newToks.tokenTypes, _.isEqual);
        _.forEach(loadToks, async (p) => await stm_new.addSecTokenType(p.name));

        // load whitelist
        stm_new.whitelist(accounts[555]); // simulate a new contract owner (first whitelist entry, by convention) -- i.e. we can upgrade contract with a new privkey
        const curWL = (await stm_cur.getWhitelist()), newWL = (await stm_new.getWhitelist()), loadWL = _.differenceWith(curWL.slice(1), newWL.slice(1), _.isEqual);
        _.forEach(loadWL, async (p) => await stm_new.whitelist(p));

        // currencies - load exchange fees, set total funded & withdrawn
        _.forEach(curCcys.ccyTypes, async (p) => { 
            await stm_new.setFee_CcyType(p.id, CONST.nullAddr, (await stm_cur.getFee(CONST.getFeeType.CCY, p.id, CONST.nullAddr)));
            await stm_new.setTotalCcyFunded(p.id, (await stm_cur.getTotalCcyFunded(p.id)));
            await stm_new.setTotalCcyWithdrawn(p.id, (await stm_cur.getTotalCcyWithdrawn(p.id)));
        });

        // tokens - load exchange fees
        _.forEach(curToks.tokenTypes, async (p) => { 
            await stm_new.setFee_TokType(p.id, CONST.nullAddr, (await stm_cur.getFee(CONST.getFeeType.TOK, p.id, CONST.nullAddr)))
        });

        // load batches
        const curBatchCount = await stm_cur.getSecTokenBatchCount();
        const curBatches = [];
        for (let batchId=1; batchId <= curBatchCount; batchId++) curBatches.push(await stm_cur.getSecTokenBatch(batchId));
        for (let p of _.chunk(curBatches, 2)) { // ** tune chunk size
            await stm_new.loadSecTokenBatch(p, curBatchCount);
        }

        // create ledger entries, add tokens, fees & balances
        const curEntryCount = await stm_cur.getLedgerOwnerCount();
        for (let i=0 ; i < curEntryCount; i++) {
            const curEntryOwner = await stm_cur.getLedgerOwner(i);
            const curEntry = await stm_cur.getLedgerEntry(curEntryOwner);

            // create ledger entry, populate with currency balances
            await stm_new.createLedgerEntry(curEntryOwner, curEntry.ccys);

            // set ledger ccy fees
            for (p of curCcys.ccyTypes) await stm_new.setFee_CcyType(p.id, curEntryOwner, (await stm_cur.getFee(CONST.getFeeType.CCY, p.id, curEntryOwner)));

            // set ledger token fees
            for (p of curToks.tokenTypes) await stm_new.setFee_TokType(p.id, curEntryOwner, (await stm_cur.getFee(CONST.getFeeType.TOK, p.id, curEntryOwner)));

            // add tokens
            for (let p of curEntry.tokens) {
                await stm_new.addSecToken(curEntryOwner, 
                    p.batchId,
                    p.stId,
                    p.tokenTypeId,
                    p.mintedQty,
                    p.currentQty
                );
            }
        }
        // for (let p of await stm_cur.getLedgerOwners()) {
        //     const x = await stm_cur.getLedgerEntry(p);
        //     console.log(`curEntry: ${p} tok.stId=[ ${x.tokens.map(p => p.stId).join(', ')} ] ccy.bal=[${x.ccys.map(p => `{ccyId=${p.ccyTypeId} bal=${p.balance}}`).join(', ')}]`);
        // }
        // console.log('---');
        // for (let p of await stm_new.getLedgerOwners()) {
        //     const x = await stm_new.getLedgerEntry(p);
        //     console.log(`newEntry: ${p} tok.stId=[ ${x.tokens.map(p => p.stId).join(', ')} ] ccy.bal=[${x.ccys.map(p => `{ccyId=${p.ccyTypeId} bal=${p.balance}}`).join(', ')}]`);
        // }

        // set token totals
        const curTotalExchangeFeesPaidQty = await stm_cur.getSecToken_totalExchangeFeesPaidQty();
        const curTotalOriginatorFeesPaidQty = await stm_cur.getSecToken_totalOriginatorFeesPaidQty();
        const curTotalTransferedQty = await stm_cur.getSecToken_totalTransferedQty();
        const curSecTokenMintedCount = await stm_cur.getSecToken_countMinted();
        const curSecTokenBurnedQty = await stm_cur.getSecToken_totalBurnedQty();
        const curSecTokenMintedQty = await stm_cur.getSecToken_totalMintedQty();
        await stm_new.setTokenTotals(
            curTotalExchangeFeesPaidQty, curTotalOriginatorFeesPaidQty, curTotalTransferedQty,
            curSecTokenMintedCount, curSecTokenMintedQty, curSecTokenBurnedQty
        );

        console.log('stm_cur.getLedgerHashcode: ', await stm_cur.getLedgerHashcode());
        console.log('stm_new.getLedgerHashcode: ', await stm_new.getLedgerHashcode());
        
        stm_new.sealContract();
        assert(await stm_cur.getLedgerHashcode() == await stm_new.getLedgerHashcode(), 'ledger hashcode mismatch');

        // ~7.49m     for 1x { 2 batches, 2 transfers }
        // 34,157,603 for 10x { 2 batches, 2 transfers }
        // ~2.9m per { 2 batches, 2 trades }
        // ~0.75m per trade/batch @ 10 gwei ~= $1.00 per trade
    });

    async function checkHashUpdate(curHash) {
        newHash = await stm_cur.getLedgerHashcode();
        assert(newHash.toString() != curHash.toString(), 'expected ledger hashcode change');
        return newHash;
    }
});
