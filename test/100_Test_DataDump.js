const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;

    before(async () => {  
        stm = await st.deployed();
    });

    async function checkHashUpdate(curHash) {
        newHash = (await stm.getLedgerHashcode());
        //console.log(`curHash: ${curHash} newHash: ${newHash}`);
        assert(newHash.toString() != curHash.toString(), 'expected ledger hashcode change');
        return newHash;
    }

    //      >>     StructLib.CcyTypesStruct ccyTypesData; -- OK getCcyTypes
    //      >>     StructLib.StTypesStruct stTypesData; -- OK  getSecTokenTypes
    //      >>     StructLib.Erc20Struct erc20Data; -- OK getWhitelist
    //      >>     StructLib.FeeStruct globalFees; -- OK getFee (*n)

    //      >>     StructLib.LedgerStruct ledgerData; -- 
    //          getSecTokenBatchCount { getSecTokenBatch ... }
    //          getLedgerOwners { getLedgerEntry { getSecToken ... / stm.getFee ... } }

    it('data dump - should be able to read all contract data', async () => {
        var curHash = await stm.getLedgerHashcode();

        await stm.addCcyType('TEST_CCY_TYPE', 'TEST_UNIT', 42);
        const ccyTypesData = await stm.getCcyTypes();
        console.log(`Ccy Types: ${ccyTypesData.ccyTypes.map(p => p.name).join(', ')}`);
        curHash = await checkHashUpdate(curHash);

        await stm.addSecTokenType('NEW_TOK_TYPE', { from: accounts[0] });
        const stTypesData = await stm.getSecTokenTypes();
        console.log(`St Types: ${stTypesData.tokenTypes.map(p => p.name).join(', ')}`);
        curHash = await checkHashUpdate(curHash);

        await stm.whitelist(accounts[0]);
        await stm.whitelist(accounts[1]);
        await stm.whitelist(accounts[2]);
        const whitelist = await stm.getWhitelist();
        console.log(`Whitelist: ${whitelist.join(', ')}`);
        curHash = await checkHashUpdate(curHash);

        // exchange fee - ccy's
        for (let i=0 ; i < ccyTypesData.ccyTypes.length; i++) {
            const ccyType = ccyTypesData.ccyTypes[i];
            const setFee = await stm.setFee_CcyType(ccyType.id, CONST.nullAddr, { fee_fixed: i+1, fee_percBips: (i+1)*100, fee_min: (i+1), fee_max: (i+1+100) } );
            const x = await stm.getFee(CONST.getFeeType.CCY, ccyType.id, CONST.nullAddr);
            console.log(`Exchange Fee: ccyTypeId=${ccyType.id} { x.fee_fixed=${x.fee_fixed} / x.fee_percBips=${x.fee_percBips} / x.fee_min=${x.fee_min} / x.fee_max=${x.fee_max} }`);
            curHash = await checkHashUpdate(curHash);
        }

        // exchange fee - tok's
        for (let i=0 ; i < stTypesData.tokenTypes.length; i++) {
            const tokType = stTypesData.tokenTypes[i];
            const setFee = await stm.setFee_TokType(tokType.id, CONST.nullAddr, { fee_fixed: i+1, fee_percBips: (i+1)*100, fee_min: (i+1), fee_max: (i+1+100) } );
            const x = await stm.getFee(CONST.getFeeType.TOK, tokType.id, CONST.nullAddr);
            console.log(`Exchange Fee: tokType=${tokType.id} { x.fee_fixed=${x.fee_fixed} / x.fee_percBips=${x.fee_percBips} / x.fee_min=${x.fee_min} / x.fee_max=${x.fee_max} }`);
            curHash = await checkHashUpdate(curHash);
        }

        // ledger - batches
        const MM = [];
        for (let i=0 ; i < 3 ; i++) { // test data
            const M = accounts[i];
            MM.push(M);
            const batchFee = { fee_fixed: i+1, fee_percBips: (i+1)*100, fee_min: (i+1), fee_max: (i+1+100) };
            const metaKVPs = [
                { k: `DATADUMP_TEST_${i+1}`,        v: `${i+1}` },
                { k: `DATADUMP_TEST2_${(i+1)*100}`, v: `${(i+1)*100}` },
            ];
            const mintTx_B1 = await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, 1000 * (i+1), 1, M, batchFee,  metaKVPs.map(p => p.k), metaKVPs.map(p => p.v), { from: accounts[0] });
            const mintTx_B2 = await stm.mintSecTokenBatch(CONST.tokenType.VCS,    10000 * (i+1), 1, M, batchFee, metaKVPs.map(p => p.k), metaKVPs.map(p => p.v), { from: accounts[0] });
            curHash = await checkHashUpdate(curHash);
        }
        const batchCount = await stm.getSecTokenBatchCount.call();
        for (let i=1 ; i <= batchCount; i++) { // read all
            const x = await stm.getSecTokenBatch(i); // --> StructLib.SecTokenBatch
            console.log(`Batch Data: id=${i} mintedQty=${x.mintedQty} burnedQty=${x.burnedQty} metaKeys=${x.metaKeys.join()} metaValues=${x.metaValues.join()} { x.fee_fixed=${x.origTokFee.fee_fixed} / x.fee_percBips=${x.origTokFee.fee_percBips} / x.fee_min=${x.origTokFee.fee_min} / x.fee_max=${x.origTokFee.fee_max} }`);
        }

        // todo: post some trades so tokens get split and moved around, maybe erc20 send too
        //...

        // ledger - entries
        const entryCount = await stm.getLedgerOwnerCount(); // DATA_DUMP: individual fetches
        const allEntries = await stm.getLedgerOwners(); // ## NON-PAGED - x-ref check
        assert(allEntries.length == entryCount, 'getLedgerOwnerCount / getLedgerOwners mismatch');
        for (let i=0 ; i < ccyTypesData.ccyTypes.length; i++) { // test ccy data 
            const ccyType = ccyTypesData.ccyTypes[i];
            for (let j=0 ; j < entryCount; j++) { // fund & set ledger ccy & tok type fees
                const entryOwner = await stm.getLedgerOwner(j);
                await stm.fund(ccyType.id, (j+1)*100+(i+1), entryOwner, { from: accounts[0] });
                if (entryOwner != accounts[0])
                    curHash = await checkHashUpdate(curHash);

                const setLedgerFeeCcy = await stm.setFee_CcyType(ccyType.id, entryOwner, { fee_fixed: i+2+j+2, fee_percBips: (i+2+j+2)*100, fee_min: (i+2+j+2), fee_max: (i+2+j+2+100) } );
                if (entryOwner != accounts[0])
                    curHash = await checkHashUpdate(curHash);

                for (let k=0 ; k < stTypesData.tokenTypes.length; k++) {
                    const tokType = stTypesData.tokenTypes[k];
                    const setLedgerFeeTok = await stm.setFee_TokType(tokType.id, entryOwner, { fee_fixed: i+k+4+j+4, fee_percBips: (i+k+4+j+4)*100, fee_min: (i+k+4+j+4), fee_max: (i+k+4+j+4+100) } );
                    if (entryOwner != accounts[0])
                       curHash = await checkHashUpdate(curHash);
                }
            }
        }
        for (let i=0 ; i < entryCount; i++) {
            //const entry = entries[i]; // ## NON-PAGED
            const entryOwner = await stm.getLedgerOwner(i); // DATA_DUMP: individual fetches
            const x = await stm.getLedgerEntry(entryOwner);
            console.log(`Ledger Entry: ${entryOwner} tok.stId=[${x.tokens.map(p => p.stId).join(', ')}] ccy.bal=[${x.ccys.map(p => `{ccyId=${p.ccyTypeId} bal=${p.balance}}`).join(', ')}]`);
            
            for (let j=0 ; j < x.ccys.length; j++) { // ledger ccy type fee
                const ccy = x.ccys[j];
                const x2 = await stm.getFee(CONST.getFeeType.CCY, ccy.ccyTypeId, entryOwner);
                console.log(`\tLedger Fee: ccyId=${ccy.ccyTypeId} { x2.fee_fixed=${x2.fee_fixed} / x2.fee_percBips=${x2.fee_percBips} / x2.fee_min=${x2.fee_min} / x2.fee_max=${x2.fee_max} }`)
            }

            const stTypeIds = [];
            for (let j=0 ; j < x.tokens.length; j++) { // ledger tokens
                const st = x.tokens[j];
                if (!stTypeIds.includes(st.tokenTypeId)) stTypeIds.push(st.tokenTypeId);
                //
                // TODO: ... getSecToken (stId)
                //...
            }

            for (let j=0 ; j < stTypeIds.length; j++) { // ledger tok type fee
                const x2 = await stm.getFee(CONST.getFeeType.TOK, stTypeIds[j], entryOwner);
                console.log(`\tLedger Fee: stTypeId=${stTypeIds[j]} { x2.fee_fixed=${x2.fee_fixed} / x2.fee_percBips=${x2.fee_percBips} / x2.fee_min=${x2.fee_min} / x2.fee_max=${x2.fee_max} }`)
            }
        }
    });
});
