const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/hdkey');
const wallet = require('ethereumjs-wallet');
const CONST = require('../const.js');
const helper = require('../test/transferHelper.js');

contract("StMaster", accounts => {
    var stm;

    beforeEach(async () => {
        stm = await st.deployed();

        if (!global.TaddrNdx) global.TaddrNdx = 0;   // whitelist (exchange) test addr; managed by tests
        if (!global.XaddrNdx) global.XaddrNdx = 800; // graylist (erc20) test addr; managed by tests

        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it('erc20 - should be able to send from whitelist addr to external addr (WITHDRAW: exchange => erc20)', async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[global.XaddrNdx + 0];
        await stm.whitelist(A);
        
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      A, CONST.nullFees, [], [], { from: accounts[0] });
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: CONST.tonCarbon,                tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
        });
        assert(data.ledgerB_before.tokens_sumQty == 0, 'unexpected ledger B ST quantity before');
        assert(data.ledgerB_after.tokens_sumQty > 0, 'unexpected ledger B ST quantity after');        
    });
    
    it('erc20 - should be able to send from graylist addr to whitelist addr (DEPOSIT: erc20 => exchange)', async () => {
        const A = accounts[global.XaddrNdx + 0];
        const B = accounts[global.TaddrNdx + 0];
        
        const tx = await stm.transfer(B, CONST.tonCarbon, { from: A } );
        console.dir(tx);
    });

    // SHOULD NOT be able to send as owner (aka internal/exchange transfer) from gray
    // SHOULD NOT be able to send from WL addr using gray's key

    // SHOULD be able to send with from gray-addr w/ gray's privkey > to another gray (erc20-erc20)
});
