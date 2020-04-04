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
        const ftsA_before = ledgerA_before.tokens.filter(p => p.tokenTypeId == tokTypeId);
        const ftsB_before = ledgerB_before.tokens.filter(p => p.tokenTypeId == tokTypeId);

        const openFtPosTx = await stm.openFtPos( {
            tokTypeId, ledger_A, ledger_B, qty_A, qty_B, price
        }, { from: accounts[0] });

        const ledgerA_after = await stm.getLedgerEntry(ledger_A);
        const ledgerB_after = await stm.getLedgerEntry(ledger_B);
        const ftsA_after = ledgerA_after.tokens.filter(p => p.tokenTypeId == tokTypeId);
        const ftsB_after = ledgerB_after.tokens.filter(p => p.tokenTypeId == tokTypeId);

        if (qty_A > 0 && qty_B < 0) {
            truffleAssert.eventEmitted(openFtPosTx, 'FutureOpenInterest', ev =>
                ev.long == ledger_A && ev.short == ledger_B &&ev.tokTypeId == tokTypeId && Big(ev.qty).eq(Big(qty_A)) && Big(ev.price).eq(Big(price))
            );
        }
        else if (qty_B > 0 && qty_A < 0) {
            truffleAssert.eventEmitted(openFtPosTx, 'FutureOpenInterest', ev => 
                ev.long == ledger_B && ev.short == ledger_A && ev.tokTypeId == tokTypeId && Big(ev.qty).eq(Big(qty_B)) && Big(ev.price).eq(Big(price)));
        }

        assert(ftsA_after.length == ftsA_before.length + 1, `unexpected futures ST count before vs. after (A)`);
        assert(ftsB_after.length == ftsB_before.length + 1, `unexpected futures ST count before vs. after (B)`);
        
        const ftA = _.differenceWith(ftsA_after, ftsA_before, _.isEqual)[0];
        const ftB = _.differenceWith(ftsB_after, ftsB_before, _.isEqual)[0];
        //console.log('ftA', ftA);
        //console.log('ftB', ftB);

        assert(ftA.tokenTypeId == tokTypeId && ftB.tokenTypeId == tokTypeId, 'unexpected FT token type ID');
        assert(ftA.batchId == 0 && ftB.batchId == 0, 'unexpected FT batch ID');
        assert(Big(ftA.ft_price).eq(Big(price)) && Big(ftB.ft_price).eq(Big(price)), 'unexpected FT price');
        assert(ftA.ft_lastMarkPrice == -1 && ftB.ft_lastMarkPrice == -1, 'unexpected FT last mark price');
        assert(ftA.mintedQty == ftB.mintedQty * -1, 'unexpected FT minted qty');
        assert(ftA.currentQty == ftB.currentQty * -1, 'unexpected FT minted qty');
        
        return { 
            tx: openFtPosTx
        };
    },

};