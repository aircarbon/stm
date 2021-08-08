// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const BN = require('bn.js');
const Big = require('big.js');
const CONST = require('../const.js');

const { DateTime } = require('luxon');

module.exports = {

    takePay2: async (a) => {
        const { stm, accounts,
            tokTypeId,
            stId,
            markPrice,
            feePerSide
        } = a;

        const ft = (await stm.getSecTokenTypes()).tokenTypes.find(p => p.id == tokTypeId);
        var st = await stm.getSecToken(stId);
        //console.log('st', st);
        const le_before = await stm.getLedgerEntry(st.ft_ledgerOwner);
        const owner_before = await stm.getLedgerEntry(accounts[0]);
        const tx = await stm.takePay2(tokTypeId, stId, markPrice, feePerSide, { from: accounts[0] });
        //CONST.logGas(web3, tx, `takePay2`);
        var from, to, delta, done, fee;
        truffleAssert.eventEmitted(tx, 'TakePay2', ev => {
            to = ev.to;
            from = ev.from;
            delta = ev.delta;
            done = ev.done;
            fee = ev.fee;
            return true;
        });
        const le_after = await stm.getLedgerEntry(st.ft_ledgerOwner);
        const owner_after = await stm.getLedgerEntry(accounts[0]);

        //console.log('le_before', le_before);
        //console.log('le_after', le_after);
        //  console.log('done', done.toString());
        //  console.log('from', from.toString());
        //  console.log('to', to.toString());

        // refresh token, check last mark prices
        st = await stm.getSecToken(stId);
        //console.log('st.ft_lastMarkPrice', st.ft_lastMarkPrice);
        assert(st.ft_lastMarkPrice == markPrice, "unexpected token LMP");

        // check balance updates
        const le_delta = new BN(le_after.ccys.find(p => p.id == ft.refCcyId).balance)
                    .sub(new BN(le_before.ccys.find(p => p.id == ft.refCcyId).balance));
        const owner_delta = new BN(owner_after.ccys.find(p => p.id == ft.refCcyId).balance)
                       .sub(new BN(owner_before.ccys.find(p => p.id == ft.refCcyId).balance));
        
        //console.log('owner_before.bal', owner_before.ccys.find(p => p.id == ft.refCcyId).balance.toString());
        //console.log('owner_after.bal', owner_after.ccys.find(p => p.id == ft.refCcyId).balance.toString());
        //console.log('le_delta', le_delta.toString());
        
        //console.log('fee', fee.toString());
        //console.log('done', done.toString());
        //console.log('delta', delta.toString());
        //console.log('owner_delta', owner_delta.toString());
        assert(new BN(le_before.ccys.find(p => p.id == ft.refCcyId).balance).add(new BN(owner_before.ccys.find(p => p.id == ft.refCcyId).balance))
           .eq(new BN(le_after.ccys.find(p => p.id == ft.refCcyId).balance).add(new BN(owner_after.ccys.find(p => p.id == ft.refCcyId).balance))), 'not net-zero post settlement');
        
        if (from.toLowerCase() == st.ft_ledgerOwner.toLowerCase()) { // pos was OTM
            //console.log('OTM');
            assert(le_delta.abs().eq(done.add(fee)), 'unexpected token ledger balance after OTM');
            assert(owner_delta.eq(done.add(fee)), 'unexpected owner ledger balance after OTM');
        }
        else if (to.toLowerCase() == st.ft_ledgerOwner.toLowerCase()) { // pos was ITM
            //console.log('ITM');
            assert(le_delta.eq(done.sub(fee)), 'unexpected token ledger balance after ITM');
            assert(done.add(owner_delta).eq(fee), 'unexpected owner ledger balance after ITM');
        }
        else throw('Unexpected event from/to values');

        return { 
            tx, st,
            le_before, owner_before,
            le_after, owner_after,
            from, to, delta, done, fee
        };
    },

    takePay: async (a) => {
        const { stm, accounts,
            tokTypeId,
            shortStId,
            markPrice,
            feePerSide
        } = a;

        const ft = (await stm.getSecTokenTypes()).tokenTypes.find(p => p.id == tokTypeId);
        const longStId = Number(shortStId) + 1; // only a valid assumption immediately post-trade (combineFtPos() breaks this assumption)
        
        var stShort = await stm.getSecToken(shortStId);
        var stLong = await stm.getSecToken(longStId);

        //console.log('stShort', stShort);
        //console.log('stLong', stLong);
        const ledgerShort_before = await stm.getLedgerEntry(stShort.ft_ledgerOwner);
        const ledgerLong_before = await stm.getLedgerEntry(stLong.ft_ledgerOwner);
        
        const tx = await stm.takePay(tokTypeId, shortStId, markPrice, feePerSide, { from: accounts[0] });
        
        var itm, otm, delta, done;
        truffleAssert.eventEmitted(tx, 'TakePay', ev => {
            itm = ev.to;
            otm = ev.from;
            delta = ev.delta;
            done = ev.done;
            return true;
        });
        const ledgerShort_after = await stm.getLedgerEntry(stShort.ft_ledgerOwner);
        const ledgerLong_after = await stm.getLedgerEntry(stLong.ft_ledgerOwner);

        // console.log('delta', delta.toString());
        // console.log('done', done.toString());
        //console.log('itm (ev)', itm);
        //console.log('otm (ev)', otm);
        //console.log('stShort.ft_ledgerOwner', stShort.ft_ledgerOwner);
        //console.log('stLong.ft_ledgerOwner', stLong.ft_ledgerOwner);

        // refresh tokens, check last mark prices
        stShort = await stm.getSecToken(shortStId);
        stLong = await stm.getSecToken(longStId);
        //console.log('stShort.ft_lastMarkPrice', stShort.ft_lastMarkPrice);
        //console.log('stLong.ft_lastMarkPrice', stLong.ft_lastMarkPrice);
        assert(stShort.ft_lastMarkPrice == markPrice, "unexpected short LMP");
        //assert(stLong.ft_lastMarkPrice == markPrice, "unexpected long LMP");

        // check balance updates
        var itm_ccyDelta, otm_ccyDelta;
        if (itm.toLowerCase() == stShort.ft_ledgerOwner.toLowerCase()) {
            itm_ccyDelta = new BN(ledgerShort_after.ccys.find(p => p.id == ft.refCcyId).balance)
                            .sub(new BN(ledgerShort_before.ccys.find(p => p.id == ft.refCcyId).balance));

            otm_ccyDelta = new BN(ledgerLong_after.ccys.find(p => p.id == ft.refCcyId).balance)
                            .sub(new BN(ledgerLong_before.ccys.find(p => p.id == ft.refCcyId).balance));
        }
        else if (itm.toLowerCase() == stLong.ft_ledgerOwner.toLowerCase()) {
            otm_ccyDelta = new BN(ledgerShort_after.ccys.find(p => p.id == ft.refCcyId).balance)
                            .sub(new BN(ledgerShort_before.ccys.find(p => p.id == ft.refCcyId).balance));

            itm_ccyDelta = new BN(ledgerLong_after.ccys.find(p => p.id == ft.refCcyId).balance)
                            .sub(new BN(ledgerLong_before.ccys.find(p => p.id == ft.refCcyId).balance));
        }
        else throw('Unexpected ledger itm/otm values');
        //console.log('itm_ccyDelta', itm_ccyDelta.toString());
        //console.log('otm_ccyDelta', otm_ccyDelta.toString());
        assert(otm_ccyDelta.eq(done.neg().sub(new BN(feePerSide))), 'unexpected OTM ccy delta');
        assert(itm_ccyDelta.eq(done.sub(new BN(feePerSide))), 'unexpected ITM ccy delta');

        return { 
            tx, stShort, stLong,
            ledgerShort_before, ledgerLong_before,
            ledgerShort_after, ledgerLong_after,
        };
    },

    openFtPos: async (a) => {
        const { stm, accounts,
                tokTypeId,
                ledger_A,     ledger_B, 
                qty_A,        qty_B,   
                price,
        } = a;

        const ledgerO_before = await stm.getLedgerEntry(accounts[0]);
        const ledgerA_before = await stm.getLedgerEntry(ledger_A);
        const ledgerB_before = await stm.getLedgerEntry(ledger_B);
        const ftsA_before = ledgerA_before.tokens.filter(p => p.tokTypeId == tokTypeId);
        const ftsB_before = ledgerB_before.tokens.filter(p => p.tokTypeId == tokTypeId);

        // open futures position
        const st = (await stm.getSecTokenTypes()).tokenTypes.find(p => p.id == tokTypeId);
        const openFtPosTx = await stm.openFtPos( {
            tokTypeId, ledger_A, ledger_B, qty_A: qty_A.toString(), qty_B: qty_B.toString(), price: price.toString()
        }, { from: accounts[0] });

        const ledgerO_after = await stm.getLedgerEntry(accounts[0]);
        const ledgerA_after = await stm.getLedgerEntry(ledger_A);
        const ledgerB_after = await stm.getLedgerEntry(ledger_B);
        const ftsA_after = ledgerA_after.tokens.filter(p => p.tokTypeId == tokTypeId);
        const ftsB_after = ledgerB_after.tokens.filter(p => p.tokTypeId == tokTypeId);

        //console.log('ledgerA_after', ledgerA_after);
        //console.log('ledgerB_after', ledgerB_after);

        // check fees paid
        const fpcOverride_A = await stm.getFeePerContractOverride(tokTypeId, ledger_A);
        const expectedFee_A = new BN((fpcOverride_A.eq(new BN(0)) ? st.ft.feePerContract : fpcOverride_A)).mul(new BN(qty_A).abs());
        const fpcOverride_B = await stm.getFeePerContractOverride(tokTypeId, ledger_B);
        const expectedFee_B = new BN((fpcOverride_B.eq(new BN(0)) ? st.ft.feePerContract : fpcOverride_B)).mul(new BN(qty_B).abs());
        //console.log('expectedFee_A', expectedFee_A.toString());
        //console.log('expectedFee_B', expectedFee_B.toString());
        //const expectedFee = new BN(st.ft.feePerContract).mul(new BN(qty_A).abs()).mul(new BN(2));
        const expectedFee_All = expectedFee_B.add(expectedFee_A);
        assert(new BN(ledgerO_after.ccys.find(p => p.ccyTypeId == st.ft.refCcyId).balance).sub(
               new BN(ledgerO_before.ccys.find(p => p.ccyTypeId == st.ft.refCcyId).balance)).eq(expectedFee_All), "unexpected owner balance after");

        assert(new BN(ledgerA_before.ccys.find(p => p.ccyTypeId == st.ft.refCcyId).balance).sub(
               new BN(ledgerA_after.ccys.find(p => p.ccyTypeId == st.ft.refCcyId).balance)).eq(expectedFee_A), "unexpected A balance after");
 
        assert(new BN(ledgerB_before.ccys.find(p => p.ccyTypeId == st.ft.refCcyId).balance).sub(
               new BN(ledgerB_after.ccys.find(p => p.ccyTypeId == st.ft.refCcyId).balance)).eq(expectedFee_B), "unexpected B balance after");
 
        // check events
        if (qty_A > 0 && qty_B < 0) {
            truffleAssert.eventEmitted(openFtPosTx, 'FutureOpenInterest', ev =>
                ev.long == ledger_A && ev.short == ledger_B &&ev.tokTypeId == tokTypeId && Big(ev.qty).eq(Big(qty_A)) && Big(ev.price).eq(Big(price))
            );
        }
        else if (qty_B > 0 && qty_A < 0) {
            truffleAssert.eventEmitted(openFtPosTx, 'FutureOpenInterest', ev => 
                ev.long == ledger_B && ev.short == ledger_A && ev.tokTypeId == tokTypeId && Big(ev.qty).eq(Big(qty_B)) && Big(ev.price).eq(Big(price)));
        }

        // check tokens' props
        assert(ftsA_after.length == ftsA_before.length + 1, `unexpected futures ST count before vs. after (A)`);
        assert(ftsB_after.length == ftsB_before.length + 1, `unexpected futures ST count before vs. after (B)`);
        const ftA = _.differenceWith(ftsA_after, ftsA_before, _.isEqual)[0];
        const ftB = _.differenceWith(ftsB_after, ftsB_before, _.isEqual)[0];
        assert(ftA.tokTypeId == tokTypeId && ftB.tokTypeId == tokTypeId, 'unexpected FT token type ID');
        assert(ftA.batchId == 0 && ftB.batchId == 0, 'unexpected FT batch ID');
        assert(Big(ftA.ft_price).eq(Big(price)) && Big(ftB.ft_price).eq(Big(price)), 'unexpected FT price');
        assert(ftA.ft_lastMarkPrice == -1 && ftB.ft_lastMarkPrice == -1, 'unexpected FT last mark price');
        assert(ftA.mintedQty == ftB.mintedQty * -1, 'unexpected FT minted qty');
        assert(ftA.currentQty == ftB.currentQty * -1, 'unexpected FT minted qty');
        
        return { 
                  tx: openFtPosTx,
            ledger_A: ledgerA_after,
            ledger_B: ledgerB_after,
        };
    },

};