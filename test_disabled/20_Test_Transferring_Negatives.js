const st = artifacts.require('StMaster');
const Big = require('big.js');
const transferHelper = require('./transferHelper.js');
const CONST = require('../const.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() == CONST.contractType.CASHFLOW) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
        
        await stm.whitelistMany(accounts.slice(global.TaddrNdx, global.TaddrNdx + 30));
        await stm.sealContract();
        await setupHelper.setDefaults({ stm, accounts });
    });
    
    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`transferring - should not allow transfer of tokens from non-whitelisted ledger entry (A)`, async () => {
        try {
            const A = accounts[888], B = accounts[global.TaddrNdx + 0];
            await stm.mintSecTokenBatch(CONST.tokenType.NATURE, CONST.GT_CARBON, 1,      A, CONST.nullFees, 0, [], []);
            await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents, B,                          );
            await transferHelper.transferWrapper(stm, accounts, A, B,
                1, CONST.tokenType.NATURE, // qty_A, tokenTypeId_A, 
                0, 0,                      // qty_B, tokenTypeId_B, 
                0, 0,                      // ccy_amount_A, ccyTypeId_A, 
                1, CONST.ccyType.USD,      // ccy_amount_B, ccyTypeId_B, 
            false, { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Not whitelisted (A)', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
    it(`transferring - should not allow transfer of tokens from non-whitelisted ledger entry (B)`, async () => {
        try {
            const A = accounts[global.TaddrNdx + 0], B = accounts[888];
            await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents, A,                          );
            await stm.mintSecTokenBatch(CONST.tokenType.NATURE, CONST.GT_CARBON, 1,      B, CONST.nullFees, 0, [], []);
            await transferHelper.transferWrapper(stm, accounts, A, B,
                0, 0,                      // qty_A, tokenTypeId_A, 
                1, CONST.tokenType.NATURE, // qty_B, tokenTypeId_B, 
                1, CONST.ccyType.USD,      // ccy_amount_A, ccyTypeId_A, 
                0, 0,                      // ccy_amount_B, ccyTypeId_B, 
            false, { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Not whitelisted (B)', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow non-owner to transfer across ledger entries`, async () => {
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 0, 0, 0, 0, 0, 0, 0, 0, false, { from: accounts[1] });
        } catch (ex) { 
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow a null transfer`, async () => {
        await stm.fund(CONST.ccyType.USD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 0, 0, 0, 0, 0, 0, 0, 0, false, { from: accounts[0] });
        } catch (ex) {
            assert(ex.reason == 'Bad null transfer', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow transfer of invalid (2^64) quantity of token units (A)`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE, CONST.GT_CARBON, 1,            accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1],                            { from: accounts[0] });
        try {
            const qty_A = Big(2).pow(64);//.minus(1);
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                qty_A.toString(),            // qty_A
                CONST.tokenType.NATURE,      // tokenTypeId_A
                0,                           // qty_B
                0,                           // tokenTypeId_B
                0,                           // ccy_amount_A
                0,                           // ccyTypeId_A
                CONST.thousandCcy_cents,     // ccy_amount_B
                CONST.ccyType.USD,           // ccyTypeId_B
                false,
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad qty_A', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow transfer of invalid (2^64) quantity of token units (B)`, async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0],                            { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE, CONST.GT_CARBON, 1,            accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            const qty_A = Big(2).pow(64);//.minus(1);
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0,                           // qty_A
                0,                           // tokenTypeId_A
                qty_A.toString(),            // qty_B
                CONST.tokenType.NATURE,      // tokenTypeId_B
                CONST.thousandCcy_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                false,
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad qty_B', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow single-origin multiple-asset transfers (1)`, async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0],                            { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE, CONST.GT_CARBON, 1,            accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1],                            { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE, CONST.GT_CARBON, 1,            accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                CONST.GT_CARBON,             // qty_A
                CONST.tokenType.NATURE,      // tokenTypeId_A
                0,                           // qty_B
                0,                           // tokenTypeId_B
                CONST.thousandCcy_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                false,
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad transfer types', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow single-origin multiple-asset transfers (2)`, async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0],                            { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE, CONST.GT_CARBON, 1,            accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1],                            { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE, CONST.GT_CARBON, 1,            accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0,                           // qty_A
                0,                           // tokenTypeId_A
                CONST.GT_CARBON,             // qty_B
                CONST.tokenType.NATURE,      // tokenTypeId_B
                0,                           // ccy_amount_A
                0,                           // ccyTypeId_A
                CONST.thousandCcy_cents,     // ccy_amount_B
                CONST.ccyType.USD,           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad transfer types', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow single-origin multiple-asset transfers (3)`, async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0],                            { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE, CONST.GT_CARBON, 1,            accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD,                   CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1],                            { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE, CONST.GT_CARBON, 1,            accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                CONST.GT_CARBON,             // qty_A
                CONST.tokenType.NATURE,      // tokenTypeId_A
                CONST.GT_CARBON,             // qty_B
                CONST.tokenType.NATURE,      // tokenTypeId_B
                CONST.thousandCcy_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                CONST.thousandCcy_cents,     // ccy_amount_B
                CONST.ccyType.USD,           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad transfer types', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });

    // DEPRECATED: allowing this, for support of ERC20 semantics (+ scp wallet uses send-to-self for estimateGas)
    // it(`transferring - should not allow transfer to self`, async () => {
    //     await stm.fund(CONST.ccyType.USD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0], { from: accounts[0] });
    //     await stm.fund(CONST.ccyType.USD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1], { from: accounts[0] });
    //     try {
    //         await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 0], 
    //             0, 0, 0, 0, 
    //             CONST.thousandCcy_cents,     // ccy_amount_A
    //             CONST.ccyType.USD,           // ccyTypeId_A
    //             0,                           // ccy_amount_B
    //             0,                           // ccyTypeId_B
    //             false,                       // applyFees
    //             { from: accounts[0] });
    //     } catch (ex) { 
    //         assert(ex.reason == 'Bad transfer', `unexpected: ${ex.reason}`);
    //         return; 
    //     }
    //     assert.fail('expected contract exception');
    // });

    it(`transferring - should not allow transfers when contract is read only`, async () => {
        await stm.fund(CONST.ccyType.USD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0],         { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.TaddrNdx + 1],         { from: accounts[0] });
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0, 0, 0, 0, 
                CONST.thousandCcy_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                CONST.oneEth_wei,            // ccy_amount_B
                CONST.ccyType.ETH,           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { 
            await stm.setReadOnly(false, { from: accounts[0] });
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            return;
        }
        await stm.setReadOnly(false, { from: accounts[0] });
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow mismatched ccy type/amount transfers (ccy A)`, async () => {
        await stm.fund(CONST.ccyType.USD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0],         { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.TaddrNdx + 1],         { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0, 0, 0, 0, 
                CONST.thousandCcy_cents,     // ccy_amount_A
                0,                           // ccyTypeId_A --> ###
                CONST.oneEth_wei,            // ccy_amount_B
                CONST.ccyType.ETH,           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad ccyTypeId A', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow mismatched ccy type/amount transfers (ccy B)`, async () => {
        await stm.fund(CONST.ccyType.USD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0],         { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.TaddrNdx + 1],         { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0, 0, 0, 0, 
                CONST.thousandCcy_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                CONST.oneEth_wei,            // ccy_amount_B
                0,                           // ccyTypeId_B --> ###
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad ccyTypeId B', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow mismatched ccy type/amount transfers (tok A)`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE, CONST.GT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.CORSIA, CONST.GT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                CONST.GT_CARBON,             // qty_A
                0,                           // tokenTypeId_A --> ###
                CONST.GT_CARBON,             // qty_B
                CONST.tokenType.NATURE,      // tokenTypeId_B
                0, 0, 0, 0,
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad tokenTypeId_A', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow mismatched ccy type/amount transfers (tok B)`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE, CONST.GT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.CORSIA, CONST.GT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                CONST.GT_CARBON,             // qty_A
                CONST.tokenType.NATURE,      // tokenTypeId_A 
                CONST.GT_CARBON,             // qty_B
                0,                           // tokenTypeId_B --> ###
                0, 0, 0, 0,
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad tokenTypeId_B', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });

    // covered by erc20 tests
    // it(`transferring - should allow a transfer to an unkown ledger entry (erc20 support) (B)`, async () => {
    //     await stm.fund(CONST.ccyType.USD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0], { from: accounts[0] });
    //     //try {
    //         await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
    //             0, 0, 0, 0, 
    //             CONST.thousandCcy_cents,     // ccy_amount_A
    //             CONST.ccyType.USD,           // ccyTypeId_A
    //             0,                           // ccy_amount_B
    //             0,                           // ccyTypeId_B
    //             false,
    //             { from: accounts[0] });
    //     // } catch (ex) { 
    //     //     assert(ex.reason == 'Bad ledger_B', `unexpected: ${ex.reason}`);
    //     //     return; 
    //     // }
    //     //assert.fail('expected contract exception');
    // });
    // it(`transferring - should allow a transfer from an unkown ledger entry (erc20 support) (A)`, async () => {
    //     await stm.fund(CONST.ccyType.USD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0], { from: accounts[0] });
    //     //try {
    //         await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
    //             0, 0, 0, 0, 
    //             CONST.thousandCcy_cents,     // ccy_amount_A
    //             CONST.ccyType.USD,           // ccyTypeId_A
    //             0,                           // ccy_amount_B
    //             0,                           // ccyTypeId_B
    //             false,                       // applyFees
    //             { from: accounts[0] });
    //     // } catch (ex) {  
    //     //     assert(ex.reason == 'Bad ledger_A', `unexpected: ${ex.reason}`);
    //     //     return;
    //     // }
    //     // assert.fail('expected contract exception');
    // });
});