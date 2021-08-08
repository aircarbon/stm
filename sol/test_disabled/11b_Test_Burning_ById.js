// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StBurnable.sol => TokenLib.sol
const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const BN = require('bn.js');
const CONST = require('../const.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        await stm.sealContract();
        await setupHelper.setDefaults({ stm, accounts });
        if (!global.TaddrNdx) global.TaddrNdx = 0;
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`burning by id - should allow full burning of specific STs by IDs`, async () => {
        const A = accounts[global.TaddrNdx];

        // mint STs for A
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], ); 
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], ); 
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], ); 
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], ); 
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], ); 
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], ); 

        const le_before = await stm.getLedgerEntry(A);

        // define tokens to burn
        const burnType = CONST.tokenType.TOK_T1;
        const burnSts = le_before.tokens.filter(p => p.tokTypeId == burnType && p.stId % 2 == 1);
        assert(burnSts.length > 0, 'bad test data');
        const burnStIds = burnSts.map(p => p.stId);
        const burnQty = burnSts.map(p => p.currentQty).reduce((a,b) => a.add(new BN(b)), new BN(0));
                        
        // burn baby
        const burnTx = await stm.burnTokens(accounts[global.TaddrNdx], burnType, burnQty.toString(), burnStIds);
        await CONST.logGas(web3, burnTx, `Burn STs of type ${burnType} IDs: [${burnStIds.join(',')}]`);

        // validate burn full ST events
        //truffleAssert.prettyPrintEmittedEvents(burnTx);
        truffleAssert.eventEmitted(burnTx, 'BurnedFullSecToken', ev => {
            return burnStIds.includes(ev.stId.toString())
                && ev.tokTypeId == burnType
                && ev.from == A
                && ev.burnedQty == CONST.GT_CARBON
            ;
        });

        // check ledger
        const le_after = await stm.getLedgerEntry(A);
        assert(le_after.tokens.length == le_before.tokens.length - burnStIds.length, 'unexpected ledger token count after burn');

        // check ledger total burned
        assert(le_after.spot_sumQtyBurned - le_before.spot_sumQtyBurned == CONST.GT_CARBON * burnStIds.length, 'unexpected spot_sumQtyBurned before vs after');

        // check batches
        for (var st of burnSts) {
            const batch = await stm.getSecTokenBatch(st.batchId);
            assert(batch.burnedQty == CONST.GT_CARBON, `unexpected batch (stid=${st.stId}) after burn`);
        }
    });

    it(`burning by id - should allow partial burning of a single specific ST by ID`, async () => {
        const A = accounts[global.TaddrNdx];

        // mint STs for A
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], ); 
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], ); 
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], ); 
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], ); 
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], ); 
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], [], ); 

        const le_before = await stm.getLedgerEntry(A);

        // define tokens to burn
        const burnType = CONST.tokenType.TOK_T3;
        const burnSts = le_before.tokens.filter(p => p.tokTypeId == burnType);
        assert(burnSts.length > 0, 'bad test data');
        //const burnType = CONST.tokenType.TOK_T3;
        //const burnSts = le_before.tokens.filter(p => p.tokTypeId == burnType);

        const burnStIds = burnSts.map(p => p.stId);
        const burnQty = burnSts.map(p => p.currentQty).reduce((a,b) => a.add(new BN(b)), new BN(0))
                        .div(new BN(2)) // partial burn - supported
                        ;
                        
        //console.log('le_before.tokens', le_before.tokens);
        //console.log('burnStIds', burnStIds);
        //console.log('burnQty.toString()', burnQty.toString());
        const burnTx = await stm.burnTokens(accounts[global.TaddrNdx], burnType, burnQty.toString(), burnStIds);
        await CONST.logGas(web3, burnTx, `Burn STs of type ${burnType} IDs: [${burnStIds.join(',')}]`);

        // validate burn full ST events
        //truffleAssert.prettyPrintEmittedEvents(burnTx);
        truffleAssert.eventEmitted(burnTx, 'BurnedPartialSecToken', ev => {
            return burnStIds.includes(ev.stId.toString())
                && ev.tokTypeId == burnType
                && ev.from == A
                && ev.burnedQty.toString() == burnQty.toString()
            ;
        });

        // check ledger
        const le_after = await stm.getLedgerEntry(A);
        //console.log('le_after.tokens', le_after.tokens);
        assert(le_after.tokens.length == le_before.tokens.length, 'unexpected ledger token count after burn');

        // check ledger total burned
        assert(le_after.spot_sumQtyBurned - le_before.spot_sumQtyBurned == burnQty.toString(), 'unexpected spot_sumQtyBurned before vs after');

        // check batches
        for (var st of burnSts) {
            const batch = await stm.getSecTokenBatch(st.batchId);
            assert(batch.burnedQty == burnQty.toString(), `unexpected batch (stid=${st.stId}) after burn`);
        }
    });
});
