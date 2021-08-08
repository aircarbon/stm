// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StTransferable.sol => TransferLib.sol
const st = artifacts.require('StMaster');
const Big = require('big.js');
const transferHelper = require('./transferHelper.js');
const CONST = require('../const.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
        
        await stm.whitelistMany(accounts.slice(global.TaddrNdx, global.TaddrNdx + 40));
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
            await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1, A, CONST.nullFees, 0, [], []);
            await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.thousandCcy_cents, B, 'TEST', );
            await transferHelper.transferWrapper(stm, accounts, A, B,
                1, CONST.tokenType.TOK_T2, // qty_A, tokTypeId_A, 
                0, 0,                      // qty_B, tokTypeId_B, 
                0, 0,                      // ccy_amount_A, ccyTypeId_A, 
                1, CONST.ccyType.USD,      // ccy_amount_B, ccyTypeId_B, 
            false, CONST.transferType.UNDEFINED, { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Not whitelisted (A)', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
    it(`transferring - should not allow transfer of tokens from non-whitelisted ledger entry (B)`, async () => {
        try {
            const A = accounts[global.TaddrNdx + 0], B = accounts[888];
            await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.thousandCcy_cents, A, 'TEST', );
            await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1, B, CONST.nullFees, 0, [], []);
            await transferHelper.transferWrapper(stm, accounts, A, B,
                0, 0,                      // qty_A, tokTypeId_A, 
                1, CONST.tokenType.TOK_T2, // qty_B, tokTypeId_B, 
                1, CONST.ccyType.USD,      // ccy_amount_A, ccyTypeId_A, 
                0, 0,                      // ccy_amount_B, ccyTypeId_B, 
            false, CONST.transferType.UNDEFINED, { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Not whitelisted (B)', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow non-owner to transfer across ledger entries`, async () => {
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 0, 0, 0, 0, 0, 0, 0, 0, false, CONST.transferType.UNDEFINED, { from: accounts[10] });
        } catch (ex) { 
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow a null transfer`, async () => {
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.thousandCcy_cents, accounts[global.TaddrNdx + 0], 'TEST', );
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.thousandCcy_cents, accounts[global.TaddrNdx + 1], 'TEST', );
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 0, 0, 0, 0, 0, 0, 0, 0, false, CONST.transferType.UNDEFINED, { from: accounts[0] });
        } catch (ex) {
            assert(ex.reason == 'Bad null transfer', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow transfer of invalid (2^64) quantity of token units (A)`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,  accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1], 'TEST', );
        try {
            const qty_A = Big(2).pow(64);//.minus(1);
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                qty_A.toString(),            // qty_A
                CONST.tokenType.TOK_T2,      // tokTypeId_A
                0,                           // qty_B
                0,                           // tokTypeId_B
                0,                           // ccy_amount_A
                0,                           // ccyTypeId_A
                CONST.thousandCcy_cents,     // ccy_amount_B
                CONST.ccyType.USD,           // ccyTypeId_B
                false, CONST.transferType.UNDEFINED, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad qty_A', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow transfer of invalid (2^64) quantity of token units (B)`, async () => {
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,  CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0], 'TEST', );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,   accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            const qty_A = Big(2).pow(64);//.minus(1);
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0,                           // qty_A
                0,                           // tokTypeId_A
                qty_A.toString(),            // qty_B
                CONST.tokenType.TOK_T2,      // tokTypeId_B
                CONST.thousandCcy_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                false, CONST.transferType.UNDEFINED, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad qty_B', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow single-origin multiple-asset transfers (1)`, async () => {
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,  CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0], 'TEST', );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,   accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,  CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1], 'TEST', );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,   accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                CONST.GT_CARBON,             // qty_A
                CONST.tokenType.TOK_T2,      // tokTypeId_A
                0,                           // qty_B
                0,                           // tokTypeId_B
                CONST.thousandCcy_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                false, CONST.transferType.UNDEFINED, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad transfer types', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow single-origin multiple-asset transfers (2)`, async () => {
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0], 'TEST', );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,  accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1],  'TEST', );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,  accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0,                           // qty_A
                0,                           // tokTypeId_A
                CONST.GT_CARBON,             // qty_B
                CONST.tokenType.TOK_T2,      // tokTypeId_B
                0,                           // ccy_amount_A
                0,                           // ccyTypeId_A
                CONST.thousandCcy_cents,     // ccy_amount_B
                CONST.ccyType.USD,           // ccyTypeId_B
                false, CONST.transferType.UNDEFINED, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad transfer types', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow single-origin multiple-asset transfers (3)`, async () => {
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0], 'TEST', );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,  accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1], 'TEST', );
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1,  accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                CONST.GT_CARBON,             // qty_A
                CONST.tokenType.TOK_T2,      // tokTypeId_A
                CONST.GT_CARBON,             // qty_B
                CONST.tokenType.TOK_T2,      // tokTypeId_B
                CONST.thousandCcy_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                CONST.thousandCcy_cents,     // ccy_amount_B
                CONST.ccyType.USD,           // ccyTypeId_B
                false, CONST.transferType.UNDEFINED, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad transfer types', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow transfers when contract is read only`, async () => {
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.thousandCcy_cents, accounts[global.TaddrNdx + 0], 'TEST', );
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH, CONST.oneEth_wei,        accounts[global.TaddrNdx + 1], 'TEST', );
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0, 0, 0, 0, 
                CONST.thousandCcy_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                CONST.oneEth_wei,            // ccy_amount_B
                CONST.ccyType.ETH,           // ccyTypeId_B
                false, CONST.transferType.UNDEFINED, 
                { from: accounts[0] });
        } catch (ex) { 
            await stm.setReadOnly(false, { from: accounts[0] });
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            return;
        }
        await stm.setReadOnly(false, { from: accounts[0] });
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow missing transfer type on one-sided transfers (ccy A)`, async () => {
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.thousandCcy_cents, accounts[global.TaddrNdx + 0], 'TEST', );
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0, 0, 0, 0, 
                CONST.thousandCcy_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                false, CONST.transferType.UNDEFINED, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad transferType', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });
    it(`transferring - should not allow missing transfer type on one-sided transfers (ccy B)`, async () => {
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.thousandCcy_cents, accounts[global.TaddrNdx + 0], 'TEST', );
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH, CONST.oneEth_wei,        accounts[global.TaddrNdx + 1], 'TEST', );
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0, 0, 0, 0, 
                0,                           // ccy_amount_A
                0,                           // ccyTypeId_A
                CONST.oneEth_wei,            // ccy_amount_B
                CONST.ccyType.ETH,           // ccyTypeId_B
                false, CONST.transferType.UNDEFINED, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad transferType', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });
    it(`transferring - should not allow missing transfer type on one-sided transfers (tok A)`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                CONST.GT_CARBON,             // qty_A
                CONST.tokenType.TOK_T2,      // tokTypeId_A 
                0,                           // qty_B
                0,                           // tokTypeId_B
                0, 0, 0, 0, 
                false, CONST.transferType.UNDEFINED,
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad transferType', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });    
    it(`transferring - should not allow missing transfer type on one-sided transfers (tok B)`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0,                           // qty_A
                0,                           // tokTypeId_A
                CONST.GT_CARBON,             // qty_B
                CONST.tokenType.TOK_T2,      // tokTypeId_B
                0, 0, 0, 0, 
                false, CONST.transferType.UNDEFINED,
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad transferType', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });   

    it(`transferring - should not allow mismatched ccy type/amount transfers (ccy A)`, async () => {
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.thousandCcy_cents, accounts[global.TaddrNdx + 0], 'TEST', );
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH, CONST.oneEth_wei,        accounts[global.TaddrNdx + 1], 'TEST', );
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0, 0, 0, 0, 
                CONST.thousandCcy_cents,     // ccy_amount_A
                0,                           // ccyTypeId_A --> ###
                CONST.oneEth_wei,            // ccy_amount_B
                CONST.ccyType.ETH,           // ccyTypeId_B
                false, CONST.transferType.UNDEFINED, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad ccyTypeId A', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });
    it(`transferring - should not allow mismatched ccy type/amount transfers (ccy B)`, async () => {
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.thousandCcy_cents, accounts[global.TaddrNdx + 0], 'TEST', );
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.ETH, CONST.oneEth_wei,        accounts[global.TaddrNdx + 1], 'TEST', );
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0, 0, 0, 0, 
                CONST.thousandCcy_cents,     // ccy_amount_A
                CONST.ccyType.USD,           // ccyTypeId_A
                CONST.oneEth_wei,            // ccy_amount_B
                0,                           // ccyTypeId_B --> ###
                false, CONST.transferType.UNDEFINED, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad ccyTypeId B', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });

    it(`transferring - should not allow mismatched ccy type/amount transfers (tok A)`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                CONST.GT_CARBON,             // qty_A
                0,                           // tokTypeId_A --> ###
                CONST.GT_CARBON,             // qty_B
                CONST.tokenType.TOK_T2,      // tokTypeId_B
                0, 0, 0, 0,
                false, CONST.transferType.UNDEFINED, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad tokTypeId_A', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });
    it(`transferring - should not allow mismatched ccy type/amount transfers (tok B)`, async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.GT_CARBON, 1, accounts[global.TaddrNdx + 0], CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, accounts[global.TaddrNdx + 1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await transferHelper.transferWrapper(stm, accounts, accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                CONST.GT_CARBON,             // qty_A
                CONST.tokenType.TOK_T2,      // tokTypeId_A 
                CONST.GT_CARBON,             // qty_B
                0,                           // tokTypeId_B --> ###
                0, 0, 0, 0,
                false, CONST.transferType.UNDEFINED, 
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad tokTypeId_B', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });
});