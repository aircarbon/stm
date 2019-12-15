const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/hdkey');
const wallet = require('ethereumjs-wallet');
const CONST = require('../const.js');
const helper = require('../test/transferHelper.js');

contract("StMaster", accounts => {
    var stm;

    var WHITE, GRAY_1, GRAY_2, NDX_GRAY_1, NDX_GRAY_2;

    beforeEach(async () => {
        //stm = await st.deployed();
    });
    
    before(async () => {
        stm = await st.deployed();
        if (!global.TaddrNdx) global.TaddrNdx = 0;   // whitelist (exchange) test addr; managed by tests
        if (!global.XaddrNdx) global.XaddrNdx = 800; // graylist (erc20) test addr; managed by tests
        
        WHITE = accounts[global.TaddrNdx + 0];
        
        NDX_GRAY_1 = global.XaddrNdx + 0;
        GRAY_1 = accounts[NDX_GRAY_1];

        NDX_GRAY_2 = global.XaddrNdx + 1;
        GRAY_2 = accounts[NDX_GRAY_2];
        
        await stm.whitelist(WHITE);
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      WHITE, CONST.nullFees, [], [], { from: accounts[0] });
    });

    //
    // ordered tests: these need to run in this order; they assume state of previous test in the contract
    //

    it('erc20 - should be able to send from whitelist addr to graylist addr (i.e. WITHDRAW: exchange => erc20)', async () => {
        await ex_to_erc20();
    }); // state: 1000 STs in GRAY_1
    async function ex_to_erc20() {
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: WHITE,                               ledger_B: GRAY_1,
                   qty_A: CONST.tonCarbon,                tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        assert(data.ledgerB_before.tokens_sumQty == 0, 'unexpected graylist ledger GRAY_1 quantity before');
        assert(data.ledgerB_after.tokens_sumQty > 0, 'unexpected graylist ledger GRAY_1 quantity after');    
    }

    //
    // TODO: use const.web3_sendEthTestAddr() to fund erc20 addr with eth for these 2:
    // (todo: get infura working)
    //
    
    // ## ropsten: "Error: insufficient funds for gas * price + value"
    it('erc20 - should be able to send from graylist addr to whitelist addr (i.e. DEPOSIT: erc20 => exchange)', async () => {
        
        const fundTx = await CONST.web3_sendEthTestAddr(0, NDX_GRAY_1, "0.1"); // fund GRAY_1 for erc20 op
        const erc20Tx = await stm.transfer(WHITE, CONST.tonCarbon, { from: GRAY_1 } );
        console.log('erc20 => exchange tx: ', erc20Tx);
        CONST.logGas(erc20Tx, '(erc20 => exchange)');

        const GRAY_after = await stm.getLedgerEntry(GRAY_1);
        const WHITE_after = await stm.getLedgerEntry(WHITE);
        assert(GRAY_after.tokens_sumQty == 0, 'unexpected graylist ledger GRAY_1 quantity after');     
        assert(WHITE_after.tokens_sumQty == CONST.tonCarbon, 'unexpected whitelist ledger WHITE quantity after');     
    }); // state: 1000 STs back to WHITE

    // ##. ropsten: "insufficient data for uint256 type (arg="fee_tok_B", coderType="uint256", value="0x00000000")"
    // ?? expecting "insufficient funds"
    it('erc20 - should be able to send from graylist addr to graylist addr (i.e. erc20 => erc20)', async () => {
        await ex_to_erc20(); // state: 1000 STs in GRAY_1
        
        const fundTx = await CONST.web3_sendEthTestAddr(0, NDX_GRAY_1, "0.01"); // fund GRAY_1 for erc20 op
        const erc20Tx = await stm.transfer(GRAY_2, CONST.tonCarbon, { from: GRAY_1 } );
        console.log('erc20 => erc20 tx: ', erc20Tx);
        
        const GRAY1_after = await stm.getLedgerEntry(GRAY_1);
        const GRAY2_after = await stm.getLedgerEntry(GRAY_2);
        assert(GRAY1_after.tokens_sumQty == 0, 'unexpected graylist ledger GRAY_1 quantity after');     
        assert(GRAY2_after.tokens_sumQty == CONST.tonCarbon, 'unexpected graylist ledger GRAY_2 quantity after');     
    });

    // SHOULD NOT have any fees on erc20.transfer() - can adapt above tests to include this
});
