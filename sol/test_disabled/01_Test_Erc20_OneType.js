// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StMaster.sol, StErc20.sol => Erc20Lib.sol, TransferLib.sol, LedgerLib.sol
const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');
const transferHelper = require('../test/transferHelper.js');
const setupHelper = require('../test/testSetupContract.js');

//
// tests erc20 transfers on a single token-type
//  supported by: CONTACT_TYPE=CASHFLOW_BASE || COMMODITY (i.e. not by CASHFLOW_CONTROLLER)
//
//  ### TODO:... (see: CFT_B_Test_FlowErc20.js for equivalent CASHFLOW_BASE tests)
//   (1) disallow erc20 on CFT-C
//   (2) erc20 ops on CFT-BASE types should "just work"? WL is embedded into each base, can't see any reason why not...
// ==
//   (3) add configurable token fees on erc20-transfer[From]()...
//

contract("StMaster", accounts => {
    var stm;

    var WHITE, GRAY_1, GRAY_2, NDX_GRAY_1, NDX_GRAY_2;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();

        if (!global.TaddrNdx) global.TaddrNdx = 0;   // whitelist (exchange) test addr; managed by tests
        if (!global.XaddrNdx) global.XaddrNdx = 800; // graylist (erc20) test addr; managed by tests
        
        WHITE = accounts[global.TaddrNdx + 0];
        
        NDX_GRAY_1 = global.XaddrNdx + 0;
        GRAY_1 = accounts[NDX_GRAY_1];

        NDX_GRAY_2 = global.XaddrNdx + 1;
        GRAY_2 = accounts[NDX_GRAY_2];
        
        await stm.whitelistMany([WHITE]);
        await stm.sealContract();
        await setupHelper.setDefaults({ stm, accounts });

        // mint NATURE with originator fee - should be ignored by ERC20
        const testFee = { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: 1, fee_percBips: 10, fee_min: 0, fee_max: 0 };
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2, CONST.KT_CARBON, 1, WHITE, testFee, 0, [], [], { from: accounts[0] });

        // set exchange fee NATURE - should be ignored by ERC20
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, testFee );

        // set ledger fees NATURE - should be ignored by ERC20
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, WHITE, testFee );
        
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, 1, GRAY_1, 'TEST');
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, GRAY_1, testFee );

        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, 1, GRAY_2, 'TEST');
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, GRAY_2, testFee );
    });

    //
    // ORDERED
    //

    it(`erc20/approve - whitelist (exchange) account should not be able to be an erc20-delegated approver or a spender`, async () => {
        try {
            await stm.approve(GRAY_1/*spender*/, 42, { from: WHITE/*approver(sender)*/ });
        } catch (ex) { assert(ex.reason == 'Approver is whitelisted', `unexpected: ${ex.reason}`); return; }
        try {
            await stm.approve(WHITE/*spender*/, 42, { from: GRAY_1/*approver(sender)*/ });
        } catch (ex) { assert(ex.reason == 'Spender is whitelisted', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`erc20/approve - graylist (non-exchange) account should be able to be an erc20-delegated approver and a spender`, async () => {
        await stm.approve(GRAY_2/*spender*/, 42, { from: GRAY_1/*approver(sender)*/ });
        const allowance_gray1 = await stm.allowance(GRAY_2/*sender*/, GRAY_1/*spender*/);
        assert(allowance_gray1 == 0, 'unexpected allowance');
        const allowance_gray2 = await stm.allowance(GRAY_1/*sender*/, GRAY_2/*spender*/);
        assert(allowance_gray2 == 42, 'unexpected allowance after approve');
    });

    it(`erc20/transferFrom - should not be able to do a delegated transfer when now allowance has been set`, async () => {
        try {
            await stm.transferFrom(GRAY_2/*sender*/, WHITE, 1, { from: GRAY_1/*approver(sender)*/ });
        } catch (ex) { assert(ex.reason == 'No allowance', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`erc20/transferOrTrade single-type - should be able to send 1 type / 1 batch from whitelist addr to graylist addr (WITHDRAW: exchange => erc20)`, async () => {
        await white_to_gray_1();
    });
    async function white_to_gray_1() {
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: WHITE,                               ledger_B: GRAY_1,
                   qty_A: CONST.KT_CARBON,                  tokTypeId_A: CONST.tokenType.TOK_T2,
                   qty_B: 0,                                tokTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: false,
            transferType: CONST.transferType.ADJUSTMENT
        });
        assert(data.ledgerB_before.spot_sumQty == 0, 'unexpected graylist ledger GRAY_1 quantity before');
        assert(data.ledgerB_after.spot_sumQty > 0, 'unexpected graylist ledger GRAY_1 quantity after');    
    }

    it(`erc20/transferFrom - should be able to do a delegated transfer (up to allowance) when an allowance has been set (DELEGATED DEPOSIT: erc20 => exchange)`, async () => {
        const WHITE_before = await stm.getLedgerEntry(WHITE);
        //console.log('WHITE_before.spot_sumQty', WHITE_before.spot_sumQty);
        
        await stm.transferFrom(GRAY_1/*sender*/, WHITE/*recipient*/, 1, { from: GRAY_2/*approver(spender)*/ });
        const WHITE_after1 = await stm.getLedgerEntry(WHITE);
        const GRAY_1_after1 = await stm.getLedgerEntry(GRAY_1);
        //console.log('WHITE_after1.spot_sumQty', WHITE_after1.spot_sumQty);
        //console.log('GRAY_1_after1.spot_sumQty', GRAY_1_after1.spot_sumQty);
        assert(WHITE_after1.spot_sumQty == 1, 'unexpected whitelist ledger WHITE quantity after (1)');     
        assert(GRAY_1_after1.spot_sumQty == 999999, 'unexpected graylist ledger GRAY_1 quantity after (1)');     

        await stm.transferFrom(GRAY_1/*sender*/, WHITE/*recipient*/, 41, { from: GRAY_2/*approver(spender)*/ });
        const WHITE_after2 = await stm.getLedgerEntry(WHITE);
        const GRAY_1_after2 = await stm.getLedgerEntry(GRAY_1);
        //console.log('WHITE_after2.spot_sumQty', WHITE_after2.spot_sumQty);
        //console.log('GRAY_1_after2.spot_sumQty', GRAY_1_after2.spot_sumQty);
        assert(WHITE_after2.spot_sumQty == 42, 'unexpected whitelist ledger WHITE quantity after (2)');     
        assert(GRAY_1_after2.spot_sumQty == 999958, 'unexpected graylist ledger GRAY_1 quantity after (2)');     
    });

    it(`erc20/transferFrom - should not be able to spend beyond allowance`, async () => {
        try {
            await stm.transferFrom(GRAY_1/*sender*/, WHITE/*recipient*/, 1, { from: GRAY_2/*approver(spender)*/ });
        } catch (ex) { assert(ex.reason == 'No allowance', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`erc20/transfer single-type - should be able to send 1 type / 1 batch from graylist addr to whitelist addr (DEPOSIT: erc20 => exchange)`, async () => {
        await gray_1_to_white();
    });
    async function gray_1_to_white() {
        const fundTx = await CONST.web3_sendEthTestAddr(0, GRAY_1, "0.1"); // fund GRAY_1 for erc20 op
        const GRAY_before = await stm.getLedgerEntry(GRAY_1);
        const WHITE_before = await stm.getLedgerEntry(WHITE);
        //console.log('WHITE_before.spot_sumQty', WHITE_before.spot_sumQty);
        //console.log('GRAY_before.spot_sumQty', GRAY_before.spot_sumQty);
        const erc20Tx = await stm.transfer(WHITE, CONST.KT_CARBON - 42, { from: GRAY_1 } );
        await CONST.logGas(web3, erc20Tx, '(erc20 => exchange)');

        const GRAY_after = await stm.getLedgerEntry(GRAY_1);
        const WHITE_after = await stm.getLedgerEntry(WHITE);
        //console.log('WHITE_after.spot_sumQty', WHITE_after.spot_sumQty);
        //console.log('GRAY_after.spot_sumQty', GRAY_after.spot_sumQty);
        assert(WHITE_after.spot_sumQty == CONST.KT_CARBON, 'unexpected whitelist ledger WHITE quantity after');     
        assert(GRAY_after.spot_sumQty == 0, 'unexpected graylist ledger GRAY_1 quantity after');     
    }

    it(`erc20/transfer single-type - should be able to send 1 type / 1 batch from graylist addr to self (TRANSFER: erc20 => self)`, async () => {
        await white_to_gray_1();  // withdraw
        await gray_1_to_gray_1(); // erc20: send to self
    });
    async function gray_1_to_gray_1() {
        const fundTx = await CONST.web3_sendEthTestAddr(0, GRAY_1, "0.01"); // fund GRAY_1 for erc20 op
        const erc20Tx = await stm.transfer(GRAY_1, CONST.KT_CARBON, { from: GRAY_1 } );
        await CONST.logGas(web3, erc20Tx, '(erc20 => self)');
        
        const GRAY1_after = await stm.getLedgerEntry(GRAY_1);
        assert(GRAY1_after.spot_sumQty == CONST.KT_CARBON, 'unexpected graylist ledger GRAY_1 quantity after');     
    }

    it(`erc20/transfer single-type - should be able to send 1 type / 1 batch from graylist addr to graylist addr (TRANSFER: erc20 => erc20)`, async () => {
        await gray_1_to_gray_2(); // erc20: send to other
    });
    async function gray_1_to_gray_2() {
        const fundTx = await CONST.web3_sendEthTestAddr(0, GRAY_1, "0.01"); // fund GRAY_1 for erc20 op
        const erc20Tx = await stm.transfer(GRAY_2, CONST.KT_CARBON, { from: GRAY_1 } );
        await CONST.logGas(web3, erc20Tx, '(erc20 => other erc20)');
        
        const GRAY1_after = await stm.getLedgerEntry(GRAY_1);
        const GRAY2_after = await stm.getLedgerEntry(GRAY_2);
        assert(GRAY1_after.spot_sumQty == 0, 'unexpected graylist ledger GRAY_1 quantity after');     
        assert(GRAY2_after.spot_sumQty == CONST.KT_CARBON, 'unexpected graylist ledger GRAY_2 quantity after');     
    }
});
