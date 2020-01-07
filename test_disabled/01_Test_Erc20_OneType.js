const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/hdkey');
const wallet = require('ethereumjs-wallet');
const CONST = require('../const.js');
const transferHelper = require('../test/transferHelper.js');

contract("StMaster", accounts => {
    var stm;

    var WHITE, GRAY_1, GRAY_2, NDX_GRAY_1, NDX_GRAY_2;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() == CONST.contractType.CASHFLOW) this.skip();

        if (!global.TaddrNdx) global.TaddrNdx = 0;   // whitelist (exchange) test addr; managed by tests
        if (!global.XaddrNdx) global.XaddrNdx = 800; // graylist (erc20) test addr; managed by tests
        
        WHITE = accounts[global.TaddrNdx + 0];
        
        NDX_GRAY_1 = global.XaddrNdx + 0;
        GRAY_1 = accounts[NDX_GRAY_1];

        NDX_GRAY_2 = global.XaddrNdx + 1;
        GRAY_2 = accounts[NDX_GRAY_2];
        
        await stm.whitelist(WHITE);
        await stm.sealContract();

        // mint with originator fee - should be ignored by ERC20
        const testFee = { fee_fixed: 1, fee_percBips: 10, fee_min: 0, fee_max: 0 };
        await stm.mintSecTokenBatch(CONST.tokenType.VCS, CONST.tonCarbon, 1, WHITE, testFee, [], [], { from: accounts[0] });

        // set exchange fee VCS - should be ignored by ERC20
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, testFee );

        // set ledger fees VCS - should be ignored by ERC20
        await stm.setFee_TokType(CONST.tokenType.VCS, WHITE,  testFee );
        
        await stm.fund(CONST.ccyType.SGD, 1, GRAY_1, { from: accounts[0] });
        await stm.setFee_TokType(CONST.tokenType.VCS, GRAY_1, testFee );

        await stm.fund(CONST.ccyType.SGD, 1, GRAY_2, { from: accounts[0] });
        await stm.setFee_TokType(CONST.tokenType.VCS, GRAY_2, testFee );
    });

    //
    // ordered tests: these need to run in this order; they assume contract state from previous test(s)
    //

    it(`erc20 - should be able to send 1 type / 1 batch from whitelist addr to graylist addr (WITHDRAW: exchange => erc20)`, async () => {
        await white_to_gray_1();
    });
    async function white_to_gray_1() {
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: WHITE,                               ledger_B: GRAY_1,
                   qty_A: CONST.tonCarbon,                tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: false,
        });

        assert(data.ledgerB_before.tokens_sumQty == 0, 'unexpected graylist ledger GRAY_1 quantity before');
        assert(data.ledgerB_after.tokens_sumQty > 0, 'unexpected graylist ledger GRAY_1 quantity after');    
    }

    it(`erc20 - should be able to send 1 type / 1 batch from graylist addr to whitelist addr (DEPOSIT: erc20 => exchange)`, async () => {
        await gray_1_to_white();
    });
    async function gray_1_to_white() {
        const fundTx = await CONST.web3_sendEthTestAddr(0, GRAY_1, "0.1"); // fund GRAY_1 for erc20 op
        const erc20Tx = await stm.transfer(WHITE, CONST.tonCarbon, { from: GRAY_1 } );
        await CONST.logGas(web3, erc20Tx, '(erc20 => exchange)');

        const GRAY_after = await stm.getLedgerEntry(GRAY_1);
        const WHITE_after = await stm.getLedgerEntry(WHITE);
        assert(GRAY_after.tokens_sumQty == 0, 'unexpected graylist ledger GRAY_1 quantity after');     
        assert(WHITE_after.tokens_sumQty == CONST.tonCarbon, 'unexpected whitelist ledger WHITE quantity after');     
    }

    it(`erc20 - should be able to send 1 type / 1 batch from graylist addr to self (erc20 => same erc20)`, async () => {
        await white_to_gray_1(); 
        await gray_1_to_gray_1();
    });
    async function gray_1_to_gray_1() {
        const fundTx = await CONST.web3_sendEthTestAddr(0, GRAY_1, "0.01"); // fund GRAY_1 for erc20 op
        const erc20Tx = await stm.transfer(GRAY_1, CONST.tonCarbon, { from: GRAY_1 } );
        await CONST.logGas(web3, erc20Tx, '(erc20 => same erc20)');
        
        const GRAY1_after = await stm.getLedgerEntry(GRAY_1);
        assert(GRAY1_after.tokens_sumQty == CONST.tonCarbon, 'unexpected graylist ledger GRAY_1 quantity after');     
    }

    it(`erc20 - should be able to send 1 type / 1 batch from graylist addr to graylist addr (erc20 => other erc20)`, async () => {
        //await white_to_gray_1(); 
        await gray_1_to_gray_2();
    });
    async function gray_1_to_gray_2() {
        const fundTx = await CONST.web3_sendEthTestAddr(0, GRAY_1, "0.01"); // fund GRAY_1 for erc20 op
        const erc20Tx = await stm.transfer(GRAY_2, CONST.tonCarbon, { from: GRAY_1 } );
        await CONST.logGas(web3, erc20Tx, '(erc20 => other erc20)');
        
        const GRAY1_after = await stm.getLedgerEntry(GRAY_1);
        const GRAY2_after = await stm.getLedgerEntry(GRAY_2);
        assert(GRAY1_after.tokens_sumQty == 0, 'unexpected graylist ledger GRAY_1 quantity after');     
        assert(GRAY2_after.tokens_sumQty == CONST.tonCarbon, 'unexpected graylist ledger GRAY_2 quantity after');     
    }
});
