const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const _ = require('lodash');
const { DateTime } = require('luxon');

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
        const ctd = await stm_cur.getCcyTypes();
        const std = await stm_cur.getSecTokenTypes();
        const whitelist = await stm_cur.getWhitelist();
        const allLedgerOwners = await stm_cur.getLedgerOwners();
        const ledgerEntry = await stm_cur.getLedgerEntry(accounts[0]);
        const cashflowData = await stm_cur.getCashflowData();
    });

    it(`data dump - should be able to set (and then read) all contract data`, async function () {
        if (await stm_cur.getContractType() == CONST.contractType.CASHFLOW) this.skip();

        const WHITELIST_COUNT = 11;
        const TEST_ADDR_COUNT = 2;
        var curHash = await stm_cur.getLedgerHashcode();

        // ccy types
        await stm_cur.addCcyType('TEST_CCY_TYPE', 'TEST_UNIT', 42);
        const ccyTypes = await stm_cur.getCcyTypes();
        console.log(`Ccy Types: ${ccyTypes.ccyTypes.map(p => p.name).join(', ')}`);
        curHash = await checkHashUpdate(curHash);

        // token types (spot & future)
        const tokTypes = await stm_cur.getSecTokenTypes();
        console.log(`St Types: ${tokTypes.tokenTypes.map(p => p.name).join(', ')}`);
        var FT;
        if (await stm_cur.getContractType() == CONST.contractType.COMMODITY) {
            
            // add spot type
            await stm_cur.addSecTokenType('NEW_TOK_SPOT_TYPE', CONST.settlementType.SPOT, CONST.nullFutureArgs, { from: accounts[0] });
            
            // FT - add future type
            const spotTypes = tokTypes.tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
            const ccyTypes = (await stm_cur.getCcyTypes()).ccyTypes;
            await stm_cur.addSecTokenType('NEW_TOK_FT_TYPE', CONST.settlementType.FUTURE, {
                expiryTimestamp: DateTime.local().toMillis(),
                underlyerTypeId: spotTypes[0].id, 
                       refCcyId: ccyTypes[0].id,
                 initMarginBips: 1000,
                  varMarginBips: 500,
                   contractSize: 1,
                 feePerContract: 0,
            });
            curHash = await checkHashUpdate(curHash);
            FT = (await stm_cur.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.FUTURE)[0];

            // FT - update future variation margin
            await stm_cur.setFuture_VariationMargin(FT.id, 600);
            curHash = await checkHashUpdate(curHash);

            // FT - update future fee per contract
            await stm_cur.setFuture_FeePerContract(FT.id, 1);
            curHash = await checkHashUpdate(curHash);
        }

        // whitelist
        for (let i=0 ; i < WHITELIST_COUNT + 1; i++)
            await stm_cur.whitelist(accounts[i]);
        const whitelist = await stm_cur.getWhitelist();
        console.log(`Whitelist: ${whitelist.join(', ')}`);
        curHash = await checkHashUpdate(curHash);
        stm_cur.sealContract();

        // allocate next whitelist entry
        const wl = await stm_cur.getWhitelistNext();
        await stm_cur.incWhitelistNext();

        // exchange fee - ccy's
        for (let i=0 ; i < ccyTypes.ccyTypes.length; i++) {
            const ccyType = ccyTypes.ccyTypes[i];
            const setFee = await stm_cur.setFee_CcyType(ccyType.id, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: i+1, fee_percBips: (i+1)*100, fee_min: (i+1), fee_max: (i+1+100) } );
            const x = await stm_cur.getFee(CONST.getFeeType.CCY, ccyType.id, CONST.nullAddr);
            console.log(`Exchange Fee: ccyTypeId=${ccyType.id} { x.fee_fixed=${x.fee_fixed} / x.fee_percBips=${x.fee_percBips} / x.fee_min=${x.fee_min} / x.fee_max=${x.fee_max} }`);
            curHash = await checkHashUpdate(curHash);
        }

        // exchange fee - tok's
        for (let i=0 ; i < tokTypes.tokenTypes.length; i++) {
            const tokType = tokTypes.tokenTypes[i];
            const setFee = await stm_cur.setFee_TokType(tokType.id, CONST.nullAddr, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: i+1, fee_percBips: (i+1)*100, fee_min: (i+1), fee_max: (i+1+100) } );
            const x = await stm_cur.getFee(CONST.getFeeType.TOK, tokType.id, CONST.nullAddr);
            console.log(`Exchange Fee: tokType=${tokType.id} { x.fee_fixed=${x.fee_fixed} / x.fee_percBips=${x.fee_percBips} / x.fee_min=${x.fee_min} / x.fee_max=${x.fee_max} }`);
            curHash = await checkHashUpdate(curHash);
        }

        //
        // populate test data: spot minting/burning, batch fees & transfers
        //
        const MM = [];
        for (let i=1 ; i <= TEST_ADDR_COUNT ; i++) {

            const M = accounts[i];
            console.log('minting, setting fees, trading & burning: for account... ', M);

            MM.push(M);
            const batchFee = { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: i+1, fee_percBips: (i+1)*100, fee_min: (i+1), fee_max: (i+1+100) };
            const metaKVPs = [
                { k: `DATADUMP_TEST_${i+1}`,        v: `${i+1}` },
                { k: `DATADUMP_TEST2_${(i+1)*100}`, v: `${(i+1)*100}` },
            ];
            
            // mint
            const mintTx_B1 = await stm_cur.mintSecTokenBatch(CONST.tokenType.CORSIA, 1000 * (i+1), 1, M, batchFee, 100, metaKVPs.map(p => p.k), metaKVPs.map(p => p.v), );
            curHash = await checkHashUpdate(curHash);
            if (await stm_cur.getContractType() == CONST.contractType.COMMODITY) {
                const mintTx_B2 = await stm_cur.mintSecTokenBatch(CONST.tokenType.NATURE, 10000 * (i+1), 1, M, batchFee, 100, metaKVPs.map(p => p.k), metaKVPs.map(p => p.v), );
                curHash = await checkHashUpdate(curHash);
            }
            const batchId = (await stm_cur.getSecTokenBatchCount.call()).toNumber();
            
            // add batch metadata
            const addBatchKvpTx = await stm_cur.addMetaSecTokenBatch(batchId, "NEW_KEY", "NEW_VALUE");
            curHash = await checkHashUpdate(curHash);

            // modify batch token fee
            const modifiedBatchFee = _.cloneDeep(batchFee);
            modifiedBatchFee.fee_percBips = batchFee.fee_percBips / 2;
            const modifyBatchTokenFeeTx = await stm_cur.setOriginatorFeeTokenBatch(batchId, modifiedBatchFee);
            curHash = await checkHashUpdate(curHash);

            // modify batch ccy fee
            const modifyBatchCcyFeeTx = await stm_cur.setOriginatorFeeCurrencyBatch(batchId, 50);
            curHash = await checkHashUpdate(curHash);

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
            const x = await stm_cur.getSecTokenBatch(i);
            console.log(`Batch Data: id=${i} mintedQty=${x.mintedQty} burnedQty=${x.burnedQty} metaKeys=${x.metaKeys.join()} metaValues=${x.metaValues.join()} { x.fee_fixed=${x.origTokFee.fee_fixed} / x.fee_percBips=${x.origTokFee.fee_percBips} / x.fee_min=${x.origTokFee.fee_min} / x.fee_max=${x.origTokFee.fee_max} }`);
        }

        //
        // populate test data 2: fund, withdraw, ccy & tok fees, futures
        //
        const entryCount = await stm_cur.getLedgerOwnerCount(); // DATA_DUMP: individual fetches
        const allEntries = await stm_cur.getLedgerOwners(); // ## NON-PAGED - x-ref check
        assert(allEntries.length == entryCount, 'getLedgerOwnerCount / getLedgerOwners mismatch');
        for (let j=0 ; j < entryCount; j++) {
            const entryOwner = await stm_cur.getLedgerOwner(j);
            console.log('funding, withdrawing, setting ledger ccy, token fees & future init margin override, spot trading & opening futures positions: for account... ', entryOwner);

            // for all ccy types
            for (let i=0 ; i < ccyTypes.ccyTypes.length; i++) { // test ccy data 
                const ccyType = ccyTypes.ccyTypes[i];
            
                const FUND = (j+1)*100000+(i+1), RESERVE = Math.ceil(FUND / 2), WITHDRAW = Math.ceil(FUND / 4);

                // fund 
                await stm_cur.fund(ccyType.id, FUND, entryOwner);
                if (entryOwner != accounts[0]) curHash = await checkHashUpdate(curHash);

                // reserve 
                await stm_cur.setReservedCcy(ccyType.id, RESERVE, entryOwner);
                if (entryOwner != accounts[0]) curHash = await checkHashUpdate(curHash);

                // withdraw 
                await stm_cur.withdraw(ccyType.id, WITHDRAW, entryOwner);
                if (entryOwner != accounts[0]) curHash = await checkHashUpdate(curHash);

                // set ledger ccy fee
                await stm_cur.setFee_CcyType(ccyType.id, entryOwner, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: i+2+j+2, fee_percBips: (i+2+j+2)*100, fee_min: (i+2+j+2), fee_max: (i+2+j+2+100) } );
                if (entryOwner != accounts[0]) curHash = await checkHashUpdate(curHash);
            }

            // spot trade
            if (entryOwner != accounts[0]) {
                 const tradeTx = await stm_cur.transferOrTrade({ 
                        ledger_A: entryOwner,                   ledger_B: accounts[0], 
                           qty_A: 1,                       tokenTypeId_A: CONST.tokenType.CORSIA, 
                           qty_B: 0,                       tokenTypeId_B: 0, 
                    ccy_amount_A: 0,                         ccyTypeId_A: 0, 
                    ccy_amount_B: CONST.ccyType.USD,         ccyTypeId_B: 1,
                       applyFees: true,
                    feeAddrOwner: CONST.nullAddr,
                });
                //truffleAssert.prettyPrintEmittedEvents(tradeTx);
                curHash = await checkHashUpdate(curHash);
            }

            // for all token types
            for (let k=0 ; k < tokTypes.tokenTypes.length; k++) {
                // set ledger token fee
                const tokType = tokTypes.tokenTypes[k];
                
                if (tokType.settlementType == CONST.settlementType.SPOT) {
                    await stm_cur.setFee_TokType(tokType.id, entryOwner, { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: k+4+j+4, fee_percBips: (k+4+j+4)*100, fee_min: (k+4+j+4), fee_max: (k+4+j+4+100) } );
                    if (entryOwner != accounts[0]) curHash = await checkHashUpdate(curHash);
                }
            }

            if (entryOwner != accounts[0]) {
                // FT - override initial margin
                await stm_cur.setInitMargin_TokType(FT.id, entryOwner, j+1);
                curHash = await checkHashUpdate(curHash);

                // FT - open futures position
                const openFtPosTx = await stm_cur.openFtPos({ 
                    tokTypeId: FT.id,
                     ledger_A: entryOwner,
                     ledger_B: accounts[0],
                        qty_A: +1, // * ((j+1) * 10),
                        qty_B: -1, // * ((j+1) * 10),
                        price: j+1,
                });
                //truffleAssert.prettyPrintEmittedEvents(openFtPosTx);
                curHash = await checkHashUpdate(curHash);
            }
        }
    });

    it(`data load - should be able to initialize a new contract with data from old`, async () => {

        //
        // cashflow data: args are set in new contract ctor()
        // todo: remaining cashflow data (need StDataLoadable support...)
        //...

        // load ccy & token types
        const curCcys = await stm_cur.getCcyTypes(), newCcys = await stm_new.getCcyTypes(), loadCcys = _.differenceWith(curCcys.ccyTypes, newCcys.ccyTypes, _.isEqual);
        _.forEach(loadCcys, async (p) => await stm_new.addCcyType(p.name, p.unit, p.decimals));

        const curToks = await stm_cur.getSecTokenTypes(), newToks = await stm_new.getSecTokenTypes(), loadToks = _.differenceWith(curToks.tokenTypes, newToks.tokenTypes, _.isEqual);
        _.forEach(loadToks, async (p) => await stm_new.addSecTokenType(p.name, p.settlementType, p.ft));

        // load whitelist
        stm_new.whitelist(accounts[555]); // simulate a new contract owner (first whitelist entry, by convention) -- i.e. we can upgrade contract with a new privkey
        const curWL = (await stm_cur.getWhitelist()), newWL = (await stm_new.getWhitelist()), loadWL = _.differenceWith(curWL.slice(1), newWL.slice(1), _.isEqual);
        _.forEach(loadWL, async (p) => await stm_new.whitelist(p));

        // set whitelist index
        stm_new.setWhitelistNextNdx(await stm_cur.getWhitelistNextNdx());

        // currencies - load exchange fees, set total funded & withdrawn
        _.forEach(curCcys.ccyTypes, async (p) => { 
            await stm_new.setFee_CcyType(p.id, CONST.nullAddr, (await stm_cur.getFee(CONST.getFeeType.CCY, p.id, CONST.nullAddr)));
            
            await stm_new.setCcyTotals(p.id, 
                (await stm_cur.getTotalCcyFunded(p.id)),
                (await stm_cur.getTotalCcyWithdrawn(p.id)),
                (await stm_cur.getCcy_totalTransfered(p.id)),
                (await stm_cur.getCcy_totalExchangeFeesPaid(p.id)));
        });

        // spot tokens - load exchange fees
        _.forEach(curToks.tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT), async (p) => { 
            await stm_new.setFee_TokType(p.id, CONST.nullAddr, (await stm_cur.getFee(CONST.getFeeType.TOK, p.id, CONST.nullAddr)));
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
            await stm_new.createLedgerEntry(curEntryOwner, curEntry.ccys, curEntry.spot_sumQtyMinted, curEntry.spot_sumQtyBurned);

            // set ledger ccy fees
            for (p of curCcys.ccyTypes) await stm_new.setFee_CcyType(p.id, curEntryOwner, (await stm_cur.getFee(CONST.getFeeType.CCY, p.id, curEntryOwner)));

            // set ledger spot token fees
            for (p of curToks.tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT)) await stm_new.setFee_TokType(p.id, curEntryOwner, (await stm_cur.getFee(CONST.getFeeType.TOK, p.id, curEntryOwner)));

            // set ledger future token margin overrides
            for (p of curToks.tokenTypes.filter(p => p.settlementType == CONST.settlementType.FUTURE)) await stm_new.setInitMargin_TokType(p.id, curEntryOwner, (await stm_cur.getInitMargin(p.id, curEntryOwner)));

            // add tokens to ledger
            for (let p of curEntry.tokens) {
                await stm_new.addSecToken(curEntryOwner, 
                    p.batchId,
                    p.stId,
                    p.tokenTypeId,
                    p.mintedQty,
                    p.currentQty,
                    p.ft_price,
                    p.ft_lastMarkPrice,
                    p.ft_ledgerOwner
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
