const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const Big = require('big.js');
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

    it(`burning by id - should allow burning of multiple STs by ID`, async () => {
        const A = accounts[global.TaddrNdx];

        // mint STs for A
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], []);
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T3, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], []);

        const le_before = await stm.getLedgerEntry(A);
        const burnSts = le_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.TOK_T1); // burn all type T1...

        // burn STs by ID
        const burnStIds = burnSts.map(p => p.stId);
        //console.log(burnStIds);
        const burnTx = await stm.burnTokens(accounts[global.TaddrNdx], CONST.tokenType.TOK_T1, 0, burnStIds);
        await CONST.logGas(web3, burnTx, `Burn STs by ID [${burnStIds.join(',')}]`);

        // validate burn full ST events
        //truffleAssert.prettyPrintEmittedEvents(burnTx);
        truffleAssert.eventEmitted(burnTx, 'BurnedFullSecToken', ev => {
            return burnStIds.includes(ev.stId.toString())
                && ev.tokenTypeId == CONST.tokenType.TOK_T1
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

});
