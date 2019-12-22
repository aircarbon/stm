const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const _ = require('lodash');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm_cur, stm_new;

    before(async () => {  
        stm_cur = await st.deployed();
        console.log(`stm_cur: @${stm_cur.address} ledgerHash=${await stm_cur.getLedgerHashcode()} / ${await stm_cur.name()} ${await stm_cur.version()}`);

        stm_new = await st.new(`${CONST.contractName}_UPGRADED`, `${CONST.contractVer}_B`, CONST.contractUnit, CONST.contractSymbol, CONST.contractDecimals);
        console.log(`stm_new: @${stm_new.address} ledgerHash=${await stm_new.getLedgerHashcode()} / ${await stm_new.name()} ${await stm_new.version()}`);
    });

    it('data dump - should be able to read without gas fees', async () => {
        var curHash = await stm_cur.getLedgerHashcode();
        const ccyTypesData = await stm_cur.getCcyTypes();
        const stTypesData = await stm_cur.getSecTokenTypes();
        const whitelist = await stm_cur.getWhitelist();
        const allLedgerOwners = await stm_cur.getLedgerOwners();
        const ledgerEntry = await stm_cur.getLedgerEntry(accounts[0]);
    });

    it('data dump - should be able to read all contract data', async () => {
        const ENTRY_COUNT = 2;
        var curHash = await stm_cur.getLedgerHashcode();

        // ccy types
        await stm_cur.addCcyType('TEST_CCY_TYPE', 'TEST_UNIT', 42);
        const ccyTypesData = await stm_cur.getCcyTypes();
        console.log(`Ccy Types: ${ccyTypesData.ccyTypes.map(p => p.name).join(', ')}`);
        curHash = await checkHashUpdate(curHash);

        // token types
        await stm_cur.addSecTokenType('NEW_TOK_TYPE', { from: accounts[0] });
        const stTypesData = await stm_cur.getSecTokenTypes();
        console.log(`St Types: ${stTypesData.tokenTypes.map(p => p.name).join(', ')}`);
        curHash = await checkHashUpdate(curHash);

        // whitelist
        for (let i=0 ; i < ENTRY_COUNT + 1; i++)
            await stm_cur.whitelist(accounts[i]);
        const whitelist = await stm_cur.getWhitelist();
        console.log(`Whitelist: ${whitelist.join(', ')}`);
        curHash = await checkHashUpdate(curHash);

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

            // TODO: DataLoadable - call per LedgerEntry to write new contract data...

            // const M = accounts[i];
            // MM.push(M);
            // const batchFee = { fee_fixed: i+1, fee_percBips: (i+1)*100, fee_min: (i+1), fee_max: (i+1+100) };
            // const metaKVPs = [
            //     { k: `DATADUMP_TEST_${i+1}`,        v: `${i+1}` },
            //     { k: `DATADUMP_TEST2_${(i+1)*100}`, v: `${(i+1)*100}` },
            // ];
            
            // // mint
            // const mintTx_B1 = await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, 1000 * (i+1), 1, M, batchFee,  metaKVPs.map(p => p.k), metaKVPs.map(p => p.v), { from: accounts[0] });
            // curHash = await checkHashUpdate(curHash);
            // const mintTx_B2 = await stm.mintSecTokenBatch(CONST.tokenType.VCS,    10000 * (i+1), 1, M, batchFee, metaKVPs.map(p => p.k), metaKVPs.map(p => p.v), { from: accounts[0] });
            // curHash = await checkHashUpdate(curHash);

            // // transfer to owner - batch 1 UNFCCC, no fees
            // const send_tx_B1 = await stm.transferOrTrade({ 
            //             ledger_A: M,                            ledger_B: accounts[0], 
            //                qty_A: 1,                       tokenTypeId_A: CONST.tokenType.UNFCCC, 
            //                qty_B: 0,                       tokenTypeId_B: 0, 
            //         ccy_amount_A: 0,                         ccyTypeId_A: 0, 
            //         ccy_amount_B: 0,                         ccyTypeId_B: 0, 
            //            applyFees: false,
            //         feeAddrOwner: CONST.nullAddr,
            //     },
            //     { from: accounts[0] }
            // );
            // curHash = await checkHashUpdate(curHash);

            // // transfer to owner - batch 2 VCS, with fees
            // const send_tx_B2 = await stm.transferOrTrade({ 
            //             ledger_A: M,                            ledger_B: accounts[0], 
            //                qty_A: 100,                     tokenTypeId_A: CONST.tokenType.VCS, 
            //                qty_B: 0,                       tokenTypeId_B: 0, 
            //         ccy_amount_A: 0,                         ccyTypeId_A: 0, 
            //         ccy_amount_B: 0,                         ccyTypeId_B: 0, 
            //            applyFees: true,
            //         feeAddrOwner: CONST.nullAddr,
            //     },
            //     { from: accounts[0] }
            // );
            // curHash = await checkHashUpdate(curHash);

            // // burn - some of batch 2 VCS
            // const burn_tx_B2 = await stm.burnTokens(M, CONST.tokenType.VCS, 1);
            // curHash = await checkHashUpdate(curHash);
        }
        // const batchCount = await stm.getSecTokenBatchCount.call();
        // for (let i=1 ; i <= batchCount; i++) { // read all
        //     const x = await stm.getSecTokenBatch(i); // --> StructLib.SecTokenBatch
        //     console.log(`Batch Data: id=${i} mintedQty=${x.mintedQty} burnedQty=${x.burnedQty} metaKeys=${x.metaKeys.join()} metaValues=${x.metaValues.join()} { x.fee_fixed=${x.origTokFee.fee_fixed} / x.fee_percBips=${x.origTokFee.fee_percBips} / x.fee_min=${x.origTokFee.fee_min} / x.fee_max=${x.origTokFee.fee_max} }`);
        // }

        // // ledger entries: fund, set ledger fees
        // const entryCount = await stm.getLedgerOwnerCount(); // DATA_DUMP: individual fetches
        // const allEntries = await stm.getLedgerOwners(); // ## NON-PAGED - x-ref check
        // assert(allEntries.length == entryCount, 'getLedgerOwnerCount / getLedgerOwners mismatch');
        // for (let i=0 ; i < ccyTypesData.ccyTypes.length; i++) { // test ccy data 
        //     const ccyType = ccyTypesData.ccyTypes[i];
            
        //     for (let j=0 ; j < entryCount; j++) { // fund, withdraw & set ledger ccy & tok type fees
        //         const entryOwner = await stm.getLedgerOwner(j);
                
        //         await stm.fund(ccyType.id, (j+1)*100+(i+1), entryOwner, { from: accounts[0] });
        //         if (entryOwner != accounts[0])
        //             curHash = await checkHashUpdate(curHash);

        //         await stm.withdraw(ccyType.id, 1, entryOwner, { from: accounts[0] });
        //         if (entryOwner != accounts[0])
        //             curHash = await checkHashUpdate(curHash);

        //         const setLedgerFeeCcy = await stm.setFee_CcyType(ccyType.id, entryOwner, { fee_fixed: i+2+j+2, fee_percBips: (i+2+j+2)*100, fee_min: (i+2+j+2), fee_max: (i+2+j+2+100) } );
        //         if (entryOwner != accounts[0])
        //             curHash = await checkHashUpdate(curHash);

        //         for (let k=0 ; k < stTypesData.tokenTypes.length; k++) {
        //             const tokType = stTypesData.tokenTypes[k];
        //             const setLedgerFeeTok = await stm.setFee_TokType(tokType.id, entryOwner, { fee_fixed: i+k+4+j+4, fee_percBips: (i+k+4+j+4)*100, fee_min: (i+k+4+j+4), fee_max: (i+k+4+j+4+100) } );
        //             if (entryOwner != accounts[0])
        //                curHash = await checkHashUpdate(curHash);
        //         }
        //     }
        // }

        // // ledger entries: iterate, read all
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

    it('data load - should be able to initialize a new contract with data from old', async () => {
        // load ccy & token types
        const curCcys = await stm_cur.getCcyTypes(), newCcys = await stm_new.getCcyTypes(), loadCcys = _.differenceWith(curCcys.ccyTypes, newCcys.ccyTypes, _.isEqual);
        _.forEach(loadCcys, async (p) => await stm_new.addCcyType(p.name, p.unit, p.decimals));

        const curToks = await stm_cur.getSecTokenTypes(), newToks = await stm_new.getSecTokenTypes(), loadToks = _.differenceWith(curToks.tokenTypes, newToks.tokenTypes, _.isEqual);
        _.forEach(loadToks, async (p) => await stm_new.addSecTokenType(p.name));

        // load whitelist
        stm_new.whitelist(accounts[555]); // simulate a new contract owner (first whitelist entry, by convention) -- i.e. we can upgrade contract with a new privkey
        const curWL = (await stm_cur.getWhitelist()), newWL = (await stm_new.getWhitelist()), loadWL = _.differenceWith(curWL.slice(1), newWL.slice(1), _.isEqual);
        _.forEach(loadWL, async (p) => await stm_new.whitelist(p));

        // load exchange fee - ccy's
        _.forEach(curCcys.ccyTypes, async (p) => await stm_new.setFee_CcyType(p.id, CONST.nullAddr, (await stm_cur.getFee(CONST.getFeeType.CCY, p.id, CONST.nullAddr))));

        // load exchange fee - tok's
        _.forEach(curToks.tokenTypes, async (p) => await stm_new.setFee_TokType(p.id, CONST.nullAddr, (await stm_cur.getFee(CONST.getFeeType.TOK, p.id, CONST.nullAddr))));

        //...

        assert(await stm_cur.getLedgerHashcode() == await stm_new.getLedgerHashcode(), 'ledger hashcode mismatch');
    });

    async function checkHashUpdate(curHash) {
        newHash = await stm_cur.getLedgerHashcode();
        assert(newHash.toString() != curHash.toString(), 'expected ledger hashcode change');
        return newHash;
    }
});
