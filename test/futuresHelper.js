const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const BN = require('bn.js');
const Big = require('big.js');
const CONST = require('../const.js');

const { DateTime } = require('luxon');

module.exports = {

    openFtPos: async (a) => {
        const { stm, accounts,
                tokTypeId,
                ledger_A,     ledger_B, 
                qty_A,        qty_B,   
                price,
        } = a;

        const ledgerA_before = await stm.getLedgerEntry(ledger_A);
        const ledgerB_before = await stm.getLedgerEntry(ledger_B);

        const openFtPosTx = await stm.openFtPos( {
            tokTypeId, ledger_A, ledger_B, qty_A, qty_B, price
        }, { from: accounts[0] });

        const ledgerA_after = await stm.getLedgerEntry(ledger_A);
        const ledgerB_after = await stm.getLedgerEntry(ledger_B);
        const ft_a = ledgerA_after.tokens.filter(p => p.tokenTypeId == tokTypeId);
        const ft_b = ledgerB_after.tokens.filter(p => p.tokenTypeId == tokTypeId);

        if (qty_A > 0 && qty_B < 0) {
            truffleAssert.eventEmitted(openFtPosTx, 'FutureOpenInterest', ev =>
                ev.long == ledger_A && ev.short == ledger_B &&ev.tokTypeId == tokTypeId && Big(ev.qty).eq(Big(qty_A)) && Big(ev.price).eq(Big(price))
            );
        }
        else if (qty_B > 0 && qty_A < 0) {
            truffleAssert.eventEmitted(openFtPosTx, 'FutureOpenInterest', ev => 
                ev.long == ledger_B && ev.short == ledger_A && ev.tokTypeId == tokTypeId && Big(ev.qty).eq(Big(qty_B)) && Big(ev.price).eq(Big(price)));
        }

        // console.log('ledgerA_after.tokens', ledgerA_after.tokens);
        // console.log('ledgerB_after.tokens', ledgerB_after.tokens);
        
        console.log('ft_a', ft_a);
        console.log('ft_b', ft_b);
        // TODO: test STs in correct state...

        return { 
            tx: openFtPosTx
        };
    },

};