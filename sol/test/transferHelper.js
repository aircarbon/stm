// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const BN = require('bn.js');
const Big = require('big.js');
const CONST = require('../const.js');

module.exports = {

    transferLedger: async(a) => {
        const { stm, accounts,
            ledger_A,     ledger_B, 
            qty_A,        tokTypeId_A, k_stIds_A,
            qty_B,        tokTypeId_B, k_stIds_B,
            ccy_amount_A, ccyTypeId_A,
            ccy_amount_B, ccyTypeId_B,
            applyFees,
            transferType,
        } = a;
        // console.dir(a);
        //console.log('ccyTypeId_A', ccyTypeId_A);
        //console.log('ccyTypeId_B', ccyTypeId_B);

        // ledger entries before
        var ledgerA_before, ledgerA_after;
        var ledgerB_before, ledgerB_after;
        var owner_before, owner_after;
        ledgerA_before = await stm.getLedgerEntry(ledger_A);
        ledgerB_before = await stm.getLedgerEntry(ledger_B);
        owner_before = await stm.getLedgerEntry(accounts[0]);
        
        // global totals: transferred before
        //var totalTokQty_tfd_before, totalTokQty_tfd_after;
        //const totalCcy_tfd_before = [];
        //const totalCcy_tfd_after = [];
        //totalTokQty_tfd_before = await stm.getSecToken_totalTransferedQty.call();
        //totalCcy_tfd_before[ccyTypeId_A] = await stm.getCcy_totalTransfered.call(ccyTypeId_A);
        //totalCcy_tfd_before[ccyTypeId_B] = await stm.getCcy_totalTransfered.call(ccyTypeId_B);

        // global totals: fees before
        //var totalTokQty_fees_before, totalTokQty_fees_after;
        //const totalCcy_ExFees_before = [];
        //const totalCcy_ExFees_after = [];
        //totalTokQty_fees_before = (await stm.getSecToken_totalExchangeFeesPaidQty.call())
        //                    .add(await stm.getSecToken_totalOriginatorFeesPaidQty.call());
        //totalCcy_ExFees_before[ccyTypeId_A] = await stm.getCcy_totalExchangeFeesPaid.call(ccyTypeId_A);
        //totalCcy_ExFees_before[ccyTypeId_B] = await stm.getCcy_totalExchangeFeesPaid.call(ccyTypeId_B);
        // console.log(`ccyTypeId_A=${ccyTypeId_A} totalCcy_ExFees_before[ccyTypeId_A]=${totalCcy_ExFees_before[ccyTypeId_A]}`);
        // console.log(`ccyTypeId_B=${ccyTypeId_B} totalCcy_ExFees_before[ccyTypeId_B]=${totalCcy_ExFees_before[ccyTypeId_B]}`);

        // expected net delta per currency, wrt. account A
        const deltaCcy_fromA = [];
        deltaCcy_fromA[ccyTypeId_A] = 0;
        deltaCcy_fromA[ccyTypeId_B] = 0;
        deltaCcy_fromA[ccyTypeId_A] -= ccy_amount_A;
        deltaCcy_fromA[ccyTypeId_B] += ccy_amount_B;
        
        // expected currency fees paid by A and B - (ledger fees >0 overrides global fees)
        var fee_ccy_A = 0;
        if (ccy_amount_A > 0 && applyFees && ledger_A != accounts[0]) { // fees not applied by contract if fee-sender == fee-receiver
            const gf = await stm.getFee(CONST.getFeeType.CCY, ccyTypeId_A, CONST.nullAddr);
            const lf = await stm.getFee(CONST.getFeeType.CCY, ccyTypeId_A, ledger_A);
            const fix = lf.fee_fixed > 0 ? Big(lf.fee_fixed) : Big(gf.fee_fixed);
            const bps = lf.fee_percBips > 0 ? Big(lf.fee_percBips) : Big(gf.fee_percBips); 
            const min = lf.fee_min > 0 ? Big(lf.fee_min) : Big(gf.fee_min);
            const max = lf.fee_max > 0 ? Big(lf.fee_max) : Big(gf.fee_max);
            const perMillion = lf.ccy_perMillion > 0 ? Big(lf.ccy_perMillion) : Big(gf.ccy_perMillion);
            fee_ccy_A = Big(Math.floor(fix
                .plus((Big(ccy_amount_A).div(10000)).times(bps))
                .plus(Big(/*Math.floor*/((Big(qty_B).div(1000000)))).times(perMillion))
            ));
            if (fee_ccy_A.gt(max) && max.gt(0)) fee_ccy_A = max;
            if (fee_ccy_A.lt(min) && min.gt(0)) fee_ccy_A = min;
            //console.log('fee_ccy_A', fee_ccy_A.toFixed());
        }
        
        var fee_ccy_B = 0;
        if (ccy_amount_B > 0 && applyFees && ledger_B != accounts[0]) { // fees not applied by contract if fee-sender == fee-receiver
            const gf = await stm.getFee(CONST.getFeeType.CCY, ccyTypeId_B, CONST.nullAddr);
            const lf = await stm.getFee(CONST.getFeeType.CCY, ccyTypeId_B, ledger_B);
            const fix = lf.fee_fixed > 0 ? Big(lf.fee_fixed) : Big(gf.fee_fixed);
            const bps = lf.fee_percBips > 0 ? Big(lf.fee_percBips) : Big(gf.fee_percBips);
            const min = lf.fee_min > 0 ? Big(lf.fee_min) : Big(gf.fee_min);
            const max = lf.fee_max > 0 ? Big(lf.fee_max) : Big(gf.fee_max);
            const perMillion = lf.ccy_perMillion > 0 ? Big(lf.ccy_perMillion) : Big(gf.ccy_perMillion);
            fee_ccy_B = Big(Math.floor(fix
                .plus((Big(ccy_amount_B).div(10000)).times(bps))
                .plus(Big(/*Math.floor*/((Big(qty_A).div(1000000)))).times(perMillion))
            ));
            if (fee_ccy_B.gt(max) && max.gt(0)) fee_ccy_B = max;
            if (fee_ccy_B.lt(min) && min.gt(0)) fee_ccy_B = min;
            //console.log('fee_ccy_B', fee_ccy_B.toFixed());
        }

        // fee preview
        const feesPreview = await stm.transfer_feePreview({ 
                ledger_A,                             ledger_B, 
                   qty_A: qty_A.toString(),           tokTypeId_A, 
                   qty_B: qty_B.toString(),           tokTypeId_B, 
            ccy_amount_A: ccy_amount_A.toString(),    ccyTypeId_A, 
            ccy_amount_B: ccy_amount_B.toString(),    ccyTypeId_B, 
               applyFees,
            feeAddrOwner: accounts[0],
               k_stIds_A: k_stIds_A || [],
               k_stIds_B: k_stIds_B || [],
            transferType: transferType || CONST.transferType.UNDEFINED,
        });
        for (let i = 0; i < feesPreview.length; i++) {
            const x = feesPreview[i];
            // if (i == 0 || x.origTokFee_qty > 0)
            //     console.log(`FEE PREVIEW ndx: ${i} fee_ccy_A=${x.fee_ccy_A} fee_ccy_B=${x.fee_ccy_B} fee_tok_A=${x.fee_tok_A} fee_tok_B=${x.fee_tok_B} origTokFee_batchId=${x.origTokFee_batchId} origTokFee_qty=${x.origTokFee_qty}`);
        }

        const sumFees_tok_A = feesPreview.map(p => p.fee_tok_A).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const sumFees_tok_B = feesPreview.map(p => p.fee_tok_B).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const sumFees_ccy_A = feesPreview.map(p => p.fee_ccy_A).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const sumFees_ccy_B = feesPreview.map(p => p.fee_ccy_B).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        // console.log('sumFees_tok_A', sumFees_tok_A.toFixed());
        // console.log('sumFees_tok_B', sumFees_tok_B.toFixed());
        // console.log('sumFees_ccy_A', sumFees_ccy_A.toFixed());
        // console.log('sumFees_ccy_B', sumFees_ccy_B.toFixed());
        const exchangeFee_tok_A = applyFees ? Big(feesPreview[0].fee_tok_A) : Big(0);
        const exchangeFee_tok_B = applyFees ? Big(feesPreview[0].fee_tok_B) : Big(0);
        const exchangeFee_ccy_A = applyFees ? Big(feesPreview[0].fee_ccy_A) : Big(0);
        const exchangeFee_ccy_B = applyFees ? Big(feesPreview[0].fee_ccy_B) : Big(0);
        const originatorFees_tok_A = feesPreview.slice(1).map(p => p.fee_tok_A).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const originatorFees_tok_B = feesPreview.slice(1).map(p => p.fee_tok_B).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        // console.log('originatorFees_tok_A', originatorFees_tok_A.toFixed());
        // console.log('originatorFees_tok_B', originatorFees_tok_B.toFixed());
        const originatorFeeData = feesPreview.slice(1).map(p => { return {
            fee_tok_A: p.fee_tok_A,
            fee_tok_B: p.fee_tok_B,
               fee_to: p.fee_to
        }});
        //console.log(`originatorFeeData.length=${originatorFeeData.length}`, originatorFeeData);
        for (let i = 0; i < originatorFeeData.length; i++)
            originatorFeeData[i].ledgerBefore = await stm.getLedgerEntry(originatorFeeData[i].fee_to);

        // ** TRANSFER **
        const transferTx = await transferWrapped( { stm, accounts,
                    ledger_A, ledger_B, 
                       qty_A, tokTypeId_A, 
                       qty_B, tokTypeId_B, 
                ccy_amount_A, ccyTypeId_A, 
                ccy_amount_B, ccyTypeId_B, 
                   applyFees,
                   k_stIds_A: k_stIds_A || [],
                   k_stIds_B: k_stIds_B || [],
                transferType: transferType || CONST.transferType.UNDEFINED,
            }, { from: accounts[0] }
        );
        //truffleAssert.prettyPrintEmittedEvents(transferTx);

        //await CONST.logGas(web3, transferTx, `TransferHelper`);

        // validate trade events
        if (qty_A > 0 && ccy_amount_B > 0) { // trade tokens A <--> currecncy B
            truffleAssert.eventEmitted(transferTx, 'TradedCcyTok', ev => 
                ev.ccyTypeId == ccyTypeId_B && ev.tokTypeId == tokTypeId_A && Big(ev.ccyAmount).eq(Big(ccy_amount_B)) && Big(ev.tokQty).eq(Big(qty_A)));
        }
        if (qty_B > 0 && ccy_amount_A > 0) { // trade tokens B <--> currecncy A
            truffleAssert.eventEmitted(transferTx, 'TradedCcyTok', 
                ev => ev.ccyTypeId == ccyTypeId_A && ev.tokTypeId == tokTypeId_B && Big(ev.ccyAmount).eq(Big(ccy_amount_A)) && Big(ev.tokQty).eq(Big(qty_B)));
        }

        // ledger entries after
        ledgerA_after = await stm.getLedgerEntry(ledger_A);
        ledgerB_after = await stm.getLedgerEntry(ledger_B);
        owner_after = await stm.getLedgerEntry(accounts[0]);
        for (let i = 0; i < originatorFeeData.length; i++)
            originatorFeeData[i].ledgerAfter = await stm.getLedgerEntry(originatorFeeData[i].fee_to);
        //console.log('originatorFeeData', originatorFeeData);

        // global totals: transferred after
        //totalTokQty_tfd_after = await stm.getSecToken_totalTransferedQty.call();
        //totalCcy_tfd_after[ccyTypeId_A] = await stm.getCcy_totalTransfered.call(ccyTypeId_A);
        //totalCcy_tfd_after[ccyTypeId_B] = await stm.getCcy_totalTransfered.call(ccyTypeId_B);

        // global totals: fees after
        // totalTokQty_fees_after = (await stm.getSecToken_totalExchangeFeesPaidQty())
        //                  .add(await stm.getSecToken_totalOriginatorFeesPaidQty());
        // totalCcy_ExFees_after[ccyTypeId_A] = await stm.getCcy_totalExchangeFeesPaid.call(ccyTypeId_A);
        // totalCcy_ExFees_after[ccyTypeId_B] = await stm.getCcy_totalExchangeFeesPaid.call(ccyTypeId_B);
        // console.log(`ccyTypeId_A=${ccyTypeId_A} totalCcy_ExFees_after[ccyTypeId_A]=${totalCcy_ExFees_after[ccyTypeId_A]}`);
        // console.log(`ccyTypeId_B=${ccyTypeId_B} totalCcy_ExFees_after[ccyTypeId_B]=${totalCcy_ExFees_after[ccyTypeId_B]}`);

        // validate fees
        var orig_tot_ccyFees = new BN(0);
        var orig_ccyFee_toA = new BN(0);
        var orig_ccyFee_toB = new BN(0);

        if (applyFees) {

            // validate ccy fee events & global totals
            const eventCcy_fees = []
            eventCcy_fees[ccyTypeId_A] = new BN(0);
            eventCcy_fees[ccyTypeId_B] = new BN(0);
            if (ccy_amount_A > 0 || ccy_amount_B > 0) {
                truffleAssert.eventEmitted(transferTx, 'TransferedLedgerCcy', ev => { 
                    //if (ev.transferType != CONST.transferType.USER) { 
                    if (ev.transferType == CONST.transferType.EXCHANGE_FEE) { 
                        eventCcy_fees[ev.ccyTypeId] = eventCcy_fees[ev.ccyTypeId].add(ev.amount);
                        //console.log(`EXCHANGE CCY FEE: ${ev.from} --> ${ev.to} ccyTypeId=${ev.ccyTypeId} ... amount=${Number(ev.amount)} >> eventCcy_fees[ev.ccyTypeId]=${eventCcy_fees[ev.ccyTypeId].toString()}`);
                    }

                    if (ev.transferType == CONST.transferType.ORIG_FEE) { 
                        orig_tot_ccyFees = orig_tot_ccyFees.add(ev.amount);
                        //console.log(`ORIGINATOR CCY FEE: ${ev.from} --> ${ev.to} ccyTypeId=${ev.ccyTypeId} ... amount=${Number(ev.amount)} >> orig_tot_ccyFees=${orig_tot_ccyFees.toString()}`);
                        if (ev.to == ledger_A) orig_ccyFee_toA = orig_ccyFee_toA.add(ev.amount);
                        if (ev.to == ledger_B) orig_ccyFee_toB = orig_ccyFee_toB.add(ev.amount);
                    }
                    return true;
                });
            }
            // console.log('totalCcy_ExFees_before[ccyTypeId_A]', totalCcy_ExFees_before[ccyTypeId_A].toString());
            // console.log(' totalCcy_ExFees_after[ccyTypeId_A]', totalCcy_ExFees_after[ccyTypeId_A].toString());
            // console.log('         eventCcy_fees[ccyTypeId_A]', eventCcy_fees[ccyTypeId_A].toString());
            // console.log('                  exchangeFee_ccy_A', exchangeFee_ccy_A.toString());
            // console.log('         (mirror) exchangeFee_ccy_B', exchangeFee_ccy_B.toString());
            // console.log('                        ccyTypeId_A', ccyTypeId_A.toString());
            
            // assert(totalCcy_ExFees_after[ccyTypeId_A].sub(totalCcy_ExFees_before[ccyTypeId_A]).eq(eventCcy_fees[ccyTypeId_A]),
            //     `unexpected global total ccy exchange fees before/after vs. events ccy type ${ccyTypeId_A}`);
            // if (ccy_amount_A > 0 && applyFees) {
            //     assert(exchangeFee_ccy_A
            //             .plus(exchangeFee_ccy_B) // ex ccy-fee mirror
            //             .eq(Big(totalCcy_ExFees_after[ccyTypeId_A].sub(totalCcy_ExFees_before[ccyTypeId_A]))),
            //         'unexpected global total ccy exchange fees (delta) vs. fee preview expected (A)');
            // }
    
            // console.log('totalCcy_ExFees_before[ccyTypeId_B]', totalCcy_ExFees_before[ccyTypeId_B].toString());
            // console.log(' totalCcy_ExFees_after[ccyTypeId_B]', totalCcy_ExFees_after[ccyTypeId_B].toString());
            // console.log('         eventCcy_fees[ccyTypeId_B]', eventCcy_fees[ccyTypeId_B].toString());
            // console.log('                  exchangeFee_ccy_B', exchangeFee_ccy_B.toString());
            // console.log('         (mirror) exchangeFee_ccy_A', exchangeFee_ccy_A.toString());
            // console.log('                        ccyTypeId_B', ccyTypeId_B.toString());
            
            // assert(totalCcy_ExFees_after[ccyTypeId_B].sub(totalCcy_ExFees_before[ccyTypeId_B]).eq(eventCcy_fees[ccyTypeId_B]),
            //     `unexpected global total ccy exchange fees before/after vs. events ccy type ${ccyTypeId_B}`);
            // if (ccy_amount_B > 0 && applyFees) {
            //     assert(exchangeFee_ccy_B
            //             .plus(exchangeFee_ccy_A) // ex ccy-fee mirror
            //             .eq(Big(totalCcy_ExFees_after[ccyTypeId_B].sub(totalCcy_ExFees_before[ccyTypeId_B]))),
            //         'unexpected global total ccy exchange fees (delta) vs. fee preview expected (B)');
            // }

            // validate eeu fee events & global totals
            // stack too deep - had to drop qty from event
            // var eventTokQty_fees = new BN(0);
            // try {
            //     truffleAssert.eventEmitted(transferTx, 'TransferedFullSecToken', ev => { 
            //         if (ev.transferType != CONST.transferType.USER) {
            //             //console.log(`    TransferedFullSecToken - ev.transferType=${ev.transferType}: ev.qty=${ev.qty}`);
            //             eventTokQty_fees = eventTokQty_fees.add(ev.qty); return true;
            //         }
            //     });
            // } catch {}
            // try {
            //     truffleAssert.eventEmitted(transferTx, 'TransferedPartialSecToken', ev => { 
            //         if (ev.transferType != CONST.transferType.USER) { 
            //             //console.log(`TransferedPartialSecToken - ev.transferType=${ev.transferType}: ev.qty=${ev.qty}`);
            //             eventTokQty_fees = eventTokQty_fees.add(ev.qty); return true;
            //         }
            //     });
            // } catch {}
            // // console.log('totalTokQty_fees_before', totalTokQty_fees_before.toString());
            // // console.log('       eventTokQty_fees', eventTokQty_fees.toString());
            // // console.log(' totalTokQty_fees_after', totalTokQty_fees_after.toString());
            // assert(totalTokQty_fees_after.sub(totalTokQty_fees_before).eq(eventTokQty_fees), `unexpected global total token fees before/after vs. events`);
        }

        // validate currency transfer events
        if (ccy_amount_A > 0 || ccy_amount_B > 0) {
            truffleAssert.eventEmitted(transferTx, 'TransferedLedgerCcy', ev => { 
                /*console.log(`ccy_amount_A: ${ccy_amount_A}`);
                console.log(`ccy_amount_B: ${ccy_amount_B}`);
                console.log(`ev.from: ${ev.from}`);
                console.log(`ev.to: ${ev.to}`);
                console.log(`ledger_A: ${ledger_A}`);
                console.log(`ledger_B: ${ledger_B}`);
                console.log(`ev.ccyTypeId: ${ev.ccyTypeId}`);
                console.log(`ccyTypeId_A: ${ccyTypeId_A}`);
                console.log(`ccyTypeId_B: ${ccyTypeId_B}`);
                console.log('ev.amount', ev.amount);
                console.log('ccy_amount_A', ccy_amount_A);
                console.log('ccy_amount_A', ccy_amount_B);
                console.log('---');
                console.log('ccy_amount_A > 0', ccy_amount_A > 0);
                console.log('ev.from == ledger_A', ev.from == ledger_A);
                console.log('ev.to == ledger_B', ev.to == ledger_B);
                console.log('ev.ccyTypeId == ccyTypeId_A', ev.ccyTypeId == ccyTypeId_A);
                console.log('ev.amount.eq(ccy_amount_A)', ev.amount.eq(ccy_amount_A));
                console.log('---');
                console.log('ccy_amount_B > 0', ccy_amount_B > 0);
                console.log('ev.from == ledger_B', ev.from == ledger_B);
                console.log('ev.to == ledger_A', ev.to == ledger_A);
                console.log('ev.ccyTypeId == ccyTypeId_B', ev.ccyTypeId == ccyTypeId_B);
                console.log('ev.amount.eq(ccy_amount_B)', ev.amount.eq(ccy_amount_B));*/

                return (
                // main transfer events
                (ccy_amount_A > 0 && ev.from == ledger_A && ev.to == ledger_B && ev.ccyTypeId == ccyTypeId_A && ev.amount.eq(new BN(ccy_amount_A)))
             || (ccy_amount_B > 0 && ev.from == ledger_B && ev.to == ledger_A && ev.ccyTypeId == ccyTypeId_B && ev.amount.eq(new BN(ccy_amount_B)))
                // exchange fee transfer events
             || (ccy_amount_A > 0 && ev.from == ledger_A && ev.to == accounts[0] && ev.ccyTypeId == ccyTypeId_A)
             || (ccy_amount_B > 0 && ev.from == ledger_B && ev.to == accounts[0] && ev.ccyTypeId == ccyTypeId_B)
                );
            });
        }

        // validate currency ledger balances are updated: A -> B
        if (ccy_amount_A > 0) {
            const A_bal_aft_ccyA = Big(ledgerA_after.ccys.find(p => p.ccyTypeId == ccyTypeId_A).balance);
            const B_bal_aft_ccyA = Big(ledgerB_after.ccys.find(p => p.ccyTypeId == ccyTypeId_A).balance);
            const A_bal_bef_ccyA = Big(ledgerA_before.ccys.find(p => p.ccyTypeId == ccyTypeId_A).balance);
            const B_bal_bef_ccyA = Big(ledgerB_before.ccys.find(p => p.ccyTypeId == ccyTypeId_A).balance);

            // console.log('A_bal_aft_ccyA', A_bal_aft_ccyA.toFixed());
            // console.log('A_bal_bef_ccyA', A_bal_bef_ccyA.toFixed());
            // console.log('fee_ccy_A', fee_ccy_A);
            // console.log('Big(fee_ccy_A)', Big(fee_ccy_A).toFixed());
            // console.log('deltaCcy_fromA[ccyTypeId_A]', deltaCcy_fromA[ccyTypeId_A]);
            // console.log('Big(deltaCcy_fromA[ccyTypeId_A])', Big(deltaCcy_fromA[ccyTypeId_A]).toFixed());

            assert(A_bal_aft_ccyA.minus(A_bal_bef_ccyA).plus(Big(fee_ccy_A)).eq(Big(deltaCcy_fromA[ccyTypeId_A]).times(+1)),
                `(1) unexpected ledger A balance ${A_bal_aft_ccyA.toFixed()} after transfer A -> B amount ${ccy_amount_A} ccy type ${ccyTypeId_A}`);

            // console.log('B_bal_bef_ccyA', B_bal_bef_ccyA.toFixed());
            // console.log('B_bal_aft_ccyA', B_bal_aft_ccyA.toFixed());
            // console.log('orig_ccyFee_toB', orig_ccyFee_toB.toString());
            // console.log('Big(deltaCcy_fromA[ccyTypeId_A])', Big(deltaCcy_fromA[ccyTypeId_A]).toFixed());
            // console.log('exchangeFee_ccy_B', exchangeFee_ccy_B.toString());
            assert(B_bal_aft_ccyA.minus(B_bal_bef_ccyA).eq(Big(deltaCcy_fromA[ccyTypeId_A]).times(-1)
                    .plus(Big(orig_ccyFee_toB.toString())) // orig ccy fee paid by owner to B
                    .minus(Big(exchangeFee_ccy_B.toString()))), // ex ccy-fee mirror
                `(2) unexpected ledger B balance ${B_bal_aft_ccyA.toFixed()} after transfer A -> B amount ${ccy_amount_A} ccy type ${ccyTypeId_A}`);
        }

        // validate currency ledger balances are updated: B -> A
        if (ccy_amount_B > 0) {
            const B_bal_aft_ccyB = Big(ledgerB_after.ccys.find(p => p.ccyTypeId == ccyTypeId_B).balance);
            const A_bal_aft_ccyB = Big(ledgerA_after.ccys.find(p => p.ccyTypeId == ccyTypeId_B).balance);
            const B_bal_bef_ccyB = Big(ledgerB_before.ccys.find(p => p.ccyTypeId == ccyTypeId_B).balance);
            const A_bal_bef_ccyB = Big(ledgerA_before.ccys.find(p => p.ccyTypeId == ccyTypeId_B).balance);

            // console.log('B_bal_aft_ccyB', B_bal_aft_ccyB.toString());
            // console.log('B_bal_bef_ccyB', B_bal_bef_ccyB.toString());
            // console.log('fee_ccy_B', fee_ccy_B.toString());
            // console.log('deltaCcy_fromA[ccyTypeId_B]', deltaCcy_fromA[ccyTypeId_B].toString());
            assert(B_bal_aft_ccyB.minus(B_bal_bef_ccyB).plus(Big(fee_ccy_B)).eq(Big(deltaCcy_fromA[ccyTypeId_B]).times(-1)),
                `(1) unexpected ledger B balance ${B_bal_aft_ccyB} after transfer B -> A amount ${ccy_amount_B} ccy type ${ccyTypeId_B}`);

            // console.log('A_bal_aft_ccyB', A_bal_aft_ccyB.toString());
            // console.log('A_bal_bef_ccyB', A_bal_bef_ccyB.toString());
            // console.log('deltaCcy_fromA[ccyTypeId_B]', deltaCcy_fromA[ccyTypeId_B].toString());
            // console.log('orig_ccyFee_toA', orig_ccyFee_toA.toString());
            // console.log('exchangeFee_ccy_A', exchangeFee_ccy_A.toString());
            assert(A_bal_aft_ccyB.minus(A_bal_bef_ccyB).eq(Big(deltaCcy_fromA[ccyTypeId_B]).times(+1)
                    .plus(Big(orig_ccyFee_toA.toString())) // orig ccy fee paid by owner to A
                    .minus(Big(exchangeFee_ccy_A.toString()))), // ex ccy-fee mirror
                `(2) unexpected ledger A balance ${A_bal_aft_ccyB} after transfer B -> A amount ${ccy_amount_B} ccy type ${ccyTypeId_B}`);
        }

        // validate currency global totals
        //totalCcy_tfd_after[ccyTypeId_A] = await stm.getCcy_totalTransfered.call(ccyTypeId_A);
        //totalCcy_tfd_after[ccyTypeId_B] = await stm.getCcy_totalTransfered.call(ccyTypeId_B);
        const expectedCcy_tfd = []; 
        expectedCcy_tfd[ccyTypeId_A] = Big(0);
        expectedCcy_tfd[ccyTypeId_B] = Big(0);
        expectedCcy_tfd[ccyTypeId_A] = expectedCcy_tfd[ccyTypeId_A].plus(ccy_amount_A);
        expectedCcy_tfd[ccyTypeId_B] = expectedCcy_tfd[ccyTypeId_B].plus(ccy_amount_B);
        if (applyFees) {
            if (ccy_amount_A > 0) {
                expectedCcy_tfd[ccyTypeId_A] = expectedCcy_tfd[ccyTypeId_A].plus(Big(fee_ccy_A));
                expectedCcy_tfd[ccyTypeId_A] = expectedCcy_tfd[ccyTypeId_A].plus(Big(exchangeFee_ccy_B.toString())); // ex ccy-fee mirror

                expectedCcy_tfd[ccyTypeId_A] = expectedCcy_tfd[ccyTypeId_A].plus(Big(orig_ccyFee_toA.toString())); // orig ccy fee paid by owner to A
                expectedCcy_tfd[ccyTypeId_A] = expectedCcy_tfd[ccyTypeId_A].plus(Big(orig_ccyFee_toB.toString())); // orig ccy fee paid by owner to B
            }
            if (ccy_amount_B > 0) {
                expectedCcy_tfd[ccyTypeId_B] = expectedCcy_tfd[ccyTypeId_B].plus(Big(fee_ccy_B));
                expectedCcy_tfd[ccyTypeId_B] = expectedCcy_tfd[ccyTypeId_B].plus(Big(exchangeFee_ccy_A.toString())); // ex ccy-fee mirror

                expectedCcy_tfd[ccyTypeId_B] = expectedCcy_tfd[ccyTypeId_B].plus(Big(orig_ccyFee_toA.toString())); // orig ccy fee paid by owner to A
                expectedCcy_tfd[ccyTypeId_B] = expectedCcy_tfd[ccyTypeId_B].plus(Big(orig_ccyFee_toB.toString())); // orig ccy fee paid by owner to B
            }
        }
        // console.log('                       fee_ccy_A', fee_ccy_A.toString());
        // console.log(' totalCcy_tfd_after[ccyTypeId_A]', totalCcy_tfd_after[ccyTypeId_A].toString());
        // console.log('totalCcy_tfd_before[ccyTypeId_A]', totalCcy_tfd_before[ccyTypeId_A].toString());
        // console.log('    expectedCcy_tfd[ccyTypeId_A]', expectedCcy_tfd[ccyTypeId_A].toString());

        // assert(Big(totalCcy_tfd_after[ccyTypeId_A]).minus(totalCcy_tfd_before[ccyTypeId_A]).eq(expectedCcy_tfd[ccyTypeId_A]),
        //     `unexpected total transfered delta after, ccy A`);
               
        // assert(Big(totalCcy_tfd_after[ccyTypeId_B]).minus(totalCcy_tfd_before[ccyTypeId_B]).eq(expectedCcy_tfd[ccyTypeId_B]),
        //     `unexpected total transfered delta after, ccy B`);

        // validate token events
        const tokFullEvents = [];
        const tokPartialEvents = [];
        const contractOwnerIsTransfering = ledger_A == accounts[0] || ledger_B == accounts[0];
        if (qty_A > 0 || qty_B > 0) {
            //truffleAssert.prettyPrintEmittedEvents(transferTx);
            
            // we expect n full events (possibly 0), and maximum one partial event (possibly 0)
            try { truffleAssert.eventEmitted(transferTx, 'TransferedFullSecToken',    ev => { tokFullEvents.push(ev);    return true; }); }
            catch {}
            try { truffleAssert.eventEmitted(transferTx, 'TransferedPartialSecToken', ev => { tokPartialEvents.push(ev); return true; }); }
            catch {}

            // user token events (non-fees)
            if (qty_A > 0) {
                assert(tokFullEvents.filter(p => p.from == ledger_A && (p.transferType == transferType || p.transferType == CONST.transferType.USER)).length > 0 ||
                       tokPartialEvents.filter(p => p.from == ledger_A && (p.transferType == transferType || p.transferType == CONST.transferType.USER)).length == 1,
                       'unexpected transfer full vs. partial event count after transfer for ledger A');
            }
            if (qty_B > 0) {
                assert(tokFullEvents.filter(p => p.from == ledger_B && (p.transferType == transferType || p.transferType == CONST.transferType.USER)).length > 0 ||
                       tokPartialEvents.filter(p => p.from == ledger_B && (p.transferType == transferType || p.transferType == CONST.transferType.USER)).length == 1,
                       'unexpected transfer full vs. partial event count after transfer for ledger B');
            }
            if ((qty_A > 0 && qty_B == 0) || (qty_B > 0 && qty_A == 0)) { // one-sided xfer
                assert(tokPartialEvents.filter(p => p.transferType == transferType).length <= (!applyFees ? 1 : 2), 'unexpected transfer partial event count after single-sided eeu transfer');
            }
            else { // two-sided tok swap
                assert(tokPartialEvents.filter(p => p.transferType == CONST.transferType.USER).length <= (!applyFees ? 2 : 3), 'unexpected transfer partial event count after two-sided eeu transfer');
            }

            // originator token fee events
            originatorFeeData.forEach(of => {
                if (of.fee_tok_A > 0) {
                    const expectedFeeEventCount = originatorFeeData.filter(p2 => p2.fee_to == of.fee_to && p2.fee_tok_A > 0).length;
                    const fullCount = tokFullEvents.filter(p => p.from == ledger_A && p.to == of.fee_to && p.transferType == CONST.transferType.ORIG_FEE).length;
                    const partialCount = tokPartialEvents.filter(p => p.from == ledger_A && p.to == of.fee_to && p.transferType == CONST.transferType.ORIG_FEE).length;
                    assert(fullCount > 0 || partialCount == expectedFeeEventCount,
                           'unexpected originator fee transfer full vs. partial event count after transfer for ledger A');
                }
                if (of.fee_tok_B > 0) {
                    const expectedFeeEventCount = originatorFeeData.filter(p2 => p2.fee_to == of.fee_to && p2.fee_tok_B > 0).length;
                    const fullCount = tokFullEvents.filter(p => p.from == ledger_B && p.to == of.fee_to && p.transferType == CONST.transferType.ORIG_FEE).length;
                    const partialCount = tokPartialEvents.filter(p => p.from == ledger_B && p.to == of.fee_to && p.transferType == CONST.transferType.ORIG_FEE).length;
                    // console.log('             ledger_B', ledger_B);
                    // console.log('          orig_fee.to', of.fee_to);
                    // console.log('          fullCount B', fullCount);
                    // console.log('       partialCount B', partialCount);
                    // console.log('expectedFeeEventCount', expectedFeeEventCount);
                    
                    assert(fullCount > 0 || partialCount == expectedFeeEventCount,
                           'unexpected originator fee transfer full vs. partial event count after transfer for ledger B');
                }
            });
            
            // validate that total quantity across A, B and contract owner (fee receiver) is unchanged
            // console.log('            ledgerA_before.spot_sumQty', ledgerA_before.spot_sumQty);
            // console.log('            ledgerB_before.spot_sumQty', ledgerB_before.spot_sumQty);
            // console.log('              owner_before.spot_sumQty', owner_before.spot_sumQty);

            // console.log('             ledgerA_after.spot_sumQty', ledgerA_after.spot_sumQty);
            // console.log('             ledgerB_after.spot_sumQty', ledgerB_after.spot_sumQty);
            // console.log('               owner_after.spot_sumQty', owner_after.spot_sumQty);

            // console.log('            contractOwnerIsTransfering', contractOwnerIsTransfering.toString());
            
            // console.log('       originatorFeeData(...fee_tok_A)', originatorFeeData.map(p => p.fee_tok_A).reduce((a,b) => Number(a) + Number(b), Number(0)));
            // console.log('       originatorFeeData(...fee_tok_B)', originatorFeeData.map(p => p.fee_tok_B).reduce((a,b) => Number(a) + Number(b), Number(0)));

            // don't double count sender/receiver and master contract owner, if the contract owner is on one side of the transfer
            assert(Number(ledgerA_before.spot_sumQty) + 
                   Number(ledgerB_before.spot_sumQty) + 
                   (contractOwnerIsTransfering ? 0 : Number(owner_before.spot_sumQty)) // exchange fee receiver before
                   ==
                   Number(ledgerA_after.spot_sumQty)  + 
                   Number(ledgerB_after.spot_sumQty)  + 
                   (contractOwnerIsTransfering ? 0 : Number(owner_after.spot_sumQty)) + // exchange fee receiver after
                   (contractOwnerIsTransfering ? 0 : originatorFeeData.map(p => p.fee_tok_A).reduce((a,b) => Number(a) + Number(b), Number(0))) + // originator fees paid by A
                   (contractOwnerIsTransfering ? 0 : originatorFeeData.map(p => p.fee_tok_B).reduce((a,b) => Number(a) + Number(b), Number(0)))   // originator fees paid by B
                   , 'unexpected total quantity sum across ledger before vs. after');
        }

        // validate originator token fees are moved
        originatorFeeData.forEach(p => {
            const allOriginatorFeesPaidToLedger = 
                Big(originatorFeeData.filter(p2 => p2.fee_to == p.fee_to).map(p2 => p2.fee_tok_A).reduce((a,b) => Big(a).plus(Big(b)), Big(0)))
          .plus(Big(originatorFeeData.filter(p2 => p2.fee_to == p.fee_to).map(p2 => p2.fee_tok_B).reduce((a,b) => Big(a).plus(Big(b)), Big(0))))

        //   console.log(`   p.ledgerBefore.spot_sumQty ${p.fee_to}`, p.ledgerBefore.spot_sumQty.toString());
        //   console.log(`    p.ledgerAfter.spot_sumQty ${p.fee_to}`, p.ledgerAfter.spot_sumQty.toString());
        //   console.log(`allOriginatorFeesPaidToLedger ${p.fee_to}`, allOriginatorFeesPaidToLedger.toFixed());

            // originator ledger after >= ledger before + all originator fees paid to that ledger (will be > if the fee receiver account is also the main user TX receiver account)
            assert(Big(p.ledgerAfter.spot_sumQty.toString()).gte(Big(p.ledgerBefore.spot_sumQty.toString()).plus(allOriginatorFeesPaidToLedger))
                , `unexpected originator ${p.fee_to} token sum across ledger before vs. after`);
        });

        // calculate expected exchange token fees separately from fee preview
        var gf, lf, fix, bps, min, max;
        gf = await stm.getFee(CONST.getFeeType.TOK, tokTypeId_A, CONST.nullAddr);
        lf = await stm.getFee(CONST.getFeeType.TOK, tokTypeId_A, ledger_A);
        // globalFee_Fix = Big(await stm.globalFee_tokType_Fix(tokTypeId_A));
        // ledgerFee_Fix = Big(await stm.ledgerFee_tokType_Fix(tokTypeId_A, ledger_A));
        // globalFee_Bps = Big(await stm.globalFee_tokType_Bps(tokTypeId_A));
        // ledgerFee_Bps = Big(await stm.ledgerFee_tokType_Bps(tokTypeId_A, ledger_A));
        // globalFee_Min = Big(await stm.globalFee_tokType_Min(tokTypeId_A));
        // ledgerFee_Min = Big(await stm.ledgerFee_tokType_Min(tokTypeId_A, ledger_A));
        // globalFee_Max = Big(await stm.globalFee_tokType_Max(tokTypeId_A));
        // ledgerFee_Max = Big(await stm.ledgerFee_tokType_Max(tokTypeId_A, ledger_A));
        fix = lf.fee_fixed > 0 ? Big(lf.fee_fixed) : Big(gf.fee_fixed); //ledgerFee_Fix.gt(0) ? ledgerFee_Fix : globalFee_Fix;
        bps = lf.fee_percBips > 0 ? Big(lf.fee_percBips) : Big(gf.fee_percBips); //ledgerFee_Bps.gt(0) ? ledgerFee_Bps : globalFee_Bps;
        min = lf.fee_min > 0 ? Big(lf.fee_min) : Big(gf.fee_min); //ledgerFee_Min.gt(0) ? ledgerFee_Min : globalFee_Min;
        max = lf.fee_max > 0 ? Big(lf.fee_max) : Big(gf.fee_max); //ledgerFee_Max.gt(0) ? ledgerFee_Max : globalFee_Max;
        var ex_tokFee_A = 0;
        if (ledger_A != accounts[0] && applyFees) { // fees not applied by contract if fee-sender == fee-receiver
            ex_tokFee_A = Math.floor(Number(fix) + Number((qty_A / 10000) * Number(bps)));
            if (Big(ex_tokFee_A).gt(max) && max.gt(0)) ex_tokFee_A = max.toFixed();
            if (Big(ex_tokFee_A).lt(min) && min.gt(0)) ex_tokFee_A = min.toFixed();
        }
        //console.log('ex_eeuFee_A', ex_eeuFee_A); 
        assert(exchangeFee_tok_A.eq(Big(ex_tokFee_A)), 'unexpected fee preview exchange token fee (A)');

        gf = await stm.getFee(CONST.getFeeType.TOK, tokTypeId_B, CONST.nullAddr);
        lf = await stm.getFee(CONST.getFeeType.TOK, tokTypeId_B, ledger_B);
        // globalFee_Fix = Big(await stm.globalFee_tokType_Fix(tokTypeId_B));
        // ledgerFee_Fix = Big(await stm.ledgerFee_tokType_Fix(tokTypeId_B, ledger_B));
        // globalFee_Bps = Big(await stm.globalFee_tokType_Bps(tokTypeId_B));
        // ledgerFee_Bps = Big(await stm.ledgerFee_tokType_Bps(tokTypeId_B, ledger_B));
        // globalFee_Min = Big(await stm.globalFee_tokType_Min(tokTypeId_B));
        // ledgerFee_Min = Big(await stm.ledgerFee_tokType_Min(tokTypeId_B, ledger_B));
        // globalFee_Max = Big(await stm.globalFee_tokType_Max(tokTypeId_B));
        // ledgerFee_Max = Big(await stm.ledgerFee_tokType_Max(tokTypeId_B, ledger_B));
        fix = lf.fee_fixed > 0 ? Big(lf.fee_fixed) : Big(gf.fee_fixed); //ledgerFee_Fix.gt(0) ? ledgerFee_Fix : globalFee_Fix;
        bps = lf.fee_percBips > 0 ? Big(lf.fee_percBips) : Big(gf.fee_percBips); //ledgerFee_Bps.gt(0) ? ledgerFee_Bps : globalFee_Bps;
        min = lf.fee_min > 0 ? Big(lf.fee_min) : Big(gf.fee_min); //ledgerFee_Min.gt(0) ? ledgerFee_Min : globalFee_Min;
        max = lf.fee_max > 0 ? Big(lf.fee_max) : Big(gf.fee_max); //ledgerFee_Max.gt(0) ? ledgerFee_Max : globalFee_Max;
        var ex_tokFee_B = 0;
        if (ledger_B != accounts[0] && applyFees) { // fees not applied by contract if fee-sender == fee-receiver
            ex_tokFee_B = Math.floor(Number(fix) + Number((qty_B / 10000) * Number(bps))); 
            if (Big(ex_tokFee_B).gt(max) && max.gt(0)) ex_tokFee_B = max.toFixed();
            if (Big(ex_tokFee_B).lt(min) && min.gt(0)) ex_tokFee_B = min.toFixed();                     
        }        
        //console.log('ex_eeuFee_B', ex_eeuFee_B);
        assert(exchangeFee_tok_B.eq(Big(ex_tokFee_B)), 'unexpected fee preview exchange token fee (B)');

        // validate tokens are moved       
        var totalTokQty_tfd_incFees = new BN(qty_A.toString()).add(new BN(qty_B.toString()));
        var totalqty_AllSecSecTokenTypes_fees = new BN(0);
        if (qty_A > 0) {
            var netTokQty_tfd = 0;
            totalTokQty_tfd_incFees = totalTokQty_tfd_incFees.add(new BN(ex_tokFee_A));
            totalqty_AllSecSecTokenTypes_fees = totalqty_AllSecSecTokenTypes_fees.add(new BN(ex_tokFee_A));
            netTokQty_tfd += qty_A; // transfered by A
            netTokQty_tfd -= qty_B; // received from B

            // console.log('                       qty_A', qty_A.toString());
            // console.log('                       qty_B', qty_B.toString());
            // console.log('                   netTokQty_tfd', netTokQty_tfd.toString());
            // console.log('---');
            // console.log(' ledgerA_after.spot_sumQty', ledgerA_after.spot_sumQty.toString());
            // console.log('ledgerA_before.spot_sumQty', ledgerA_before.spot_sumQty.toString());
            // console.log('                 ex_eeuFee_A', ex_eeuFee_A.toString());
            // console.log('        originatorFees_tok_A', originatorFees_tok_A.toString());
            assert(ledgerA_after.spot_sumQty == Number(ledgerA_before.spot_sumQty) - netTokQty_tfd - ex_tokFee_A - Number(originatorFees_tok_A.toFixed()), 'unexpected ledger A tokens sum after transfer A -> B');

            // console.log('---');
            // console.log(' ledgerB_after.spot_sumQty', ledgerB_after.spot_sumQty.toString());
            // console.log('ledgerB_before.spot_sumQty', ledgerB_before.spot_sumQty.toString());
            // console.log('                 ex_eeuFee_B', ex_eeuFee_B.toString());
            // console.log('        originatorFees_tok_B', originatorFees_tok_B.toString());
            if (!contractOwnerIsTransfering) {
                assert(ledgerB_after.spot_sumQty == Number(ledgerB_before.spot_sumQty) + netTokQty_tfd - ex_tokFee_B - Number(originatorFees_tok_B.toFixed()), 'unexpected ledger B quantity sum after transfer A -> B');
            }

            totalTokQty_tfd_incFees = totalTokQty_tfd_incFees.add(new BN(originatorFees_tok_A.toFixed()));
        }
        if (qty_B > 0) {
            var netTokQty_tfd = 0;
            totalTokQty_tfd_incFees = totalTokQty_tfd_incFees.add(new BN(ex_tokFee_B));
            totalqty_AllSecSecTokenTypes_fees = totalqty_AllSecSecTokenTypes_fees.add(new BN(ex_tokFee_B));
            netTokQty_tfd += qty_B; // transfered by B
            netTokQty_tfd -= qty_A; // received from A

            // console.log('ledgerB_after.spot_sumQty', ledgerB_after.spot_sumQty.toString());
            // console.log('ledgerB_before.spot_sumQty', ledgerB_before.spot_sumQty.toString());
            // console.log('netTokQty_tfd', netTokQty_tfd.toString());
            // console.log('ex_tokFee_B', ex_tokFee_B.toString());
            // console.log('originatorFees_tok_B', originatorFees_tok_B.toString());
            assert(ledgerB_after.spot_sumQty == Number(ledgerB_before.spot_sumQty) - netTokQty_tfd - ex_tokFee_B - Number(originatorFees_tok_B.toFixed()), 'unexpected ledger B quantity sum after transfer B -> A');
            
            // console.log('ledgerA_after.spot_sumQty', ledgerA_after.spot_sumQty.toString());
            // console.log('ledgerA_before.spot_sumQty', ledgerA_before.spot_sumQty.toString());
            // console.log('netTokQty_tfd', netTokQty_tfd.toString());
            // console.log('ex_tokFee_A', ex_tokFee_A.toString());
            // console.log('originatorFees_tok_A', originatorFees_tok_A.toString());
            if (!contractOwnerIsTransfering) {
                assert(ledgerA_after.spot_sumQty == Number(ledgerA_before.spot_sumQty) + netTokQty_tfd - ex_tokFee_A - Number(originatorFees_tok_A.toFixed()), 'unexpected ledger A tokens sum after transfer B -> A');
            }
            
            totalTokQty_tfd_incFees = totalTokQty_tfd_incFees.add(new BN(originatorFees_tok_B.toFixed()));
        }

        // validate token fee sum quantity in contract owner
        // console.log(' owner_after.spot_sumQty', owner_after.spot_sumQty);
        // console.log('owner_before.spot_sumQty', owner_before.spot_sumQty);
        // console.log('       totalqty_AllSecSecTokenTypes_fees', totalqty_AllSecSecTokenTypes_fees);
        if (!contractOwnerIsTransfering) {
            assert(new BN(owner_after.spot_sumQty).sub(new BN(owner_before.spot_sumQty))
                    .eq(totalqty_AllSecSecTokenTypes_fees), 'unexpected contract owner (exchange fee receiver) token quantity after transfer');
        }

        // validate token global totals
        // console.log(' totalTokQty_tfd_before', totalTokQty_tfd_before.toString());
        // console.log('  totalTokQty_tfd_after', totalTokQty_tfd_after.toString());
        // console.log('totalTokQty_tfd_incFees', totalTokQty_tfd_incFees.toString());
        //assert(totalTokQty_tfd_after.sub(totalTokQty_tfd_before).eq(totalTokQty_tfd_incFees), 'unexpected total quantity carbon after transfer');

        return {
            transferTx, 
            tokFullEvents,              tokPartialEvents,
            ledgerA_before,             ledgerA_after,  
            ledgerB_before,             ledgerB_after,
            owner_before, owner_after,
            originatorFees_tok_A,       originatorFees_tok_B,
            exchangeFee_tok_A,          exchangeFee_tok_B,
            exchangeFee_ccy_A,          exchangeFee_ccy_B,
            feesPreview,
            orig_ccyFee_toA,            orig_ccyFee_toB,
        };
    },

    transferWrapper: (stm, accounts,
        ledger_A, ledger_B, 
           qty_A, tokTypeId_A, 
           qty_B, tokTypeId_B, 
    ccy_amount_A, ccyTypeId_A, 
    ccy_amount_B, ccyTypeId_B, 
       applyFees,
    transferType,   
            from,
        ) => {
        return transferWrapped({ stm, accounts,
        ledger_A, ledger_B, 
           qty_A, tokTypeId_A, 
           qty_B, tokTypeId_B, 
    ccy_amount_A, ccyTypeId_A, 
    ccy_amount_B, ccyTypeId_B, 
       applyFees,
    transferType,
    }, from);
    },

    assert_nFull_1Partial: ({ 
        fullEvents, partialEvents,
        expectFullTransfer_eeuCount,
        ledgerSender_before,   ledgerSender_after,
        ledgerReceiver_before, ledgerReceiver_after,
    }) => {

        const start_Sender_eeuCount = ledgerSender_before.tokens.length;
        const start_Receiver_eeuCount = ledgerReceiver_before.tokens.length;

        assert(fullEvents.length == expectFullTransfer_eeuCount && partialEvents.length == 1, 'unexpected event composition');
        assert(ledgerSender_before.tokens.some(p => p.stId == partialEvents[0].splitFromSecTokenId), 'unexpected partial event parent eeu id vs. ledger A before');
        assert(ledgerReceiver_after.tokens.some(p => p.stId == partialEvents[0].newSecTokenId), 'unexpected partial event soft-minted eeu id vs. ledger B after');
        
        const softMintedSecToken = ledgerReceiver_after.tokens.find(p => p.stId == partialEvents[0].newSecTokenId);
        const parentSplitSecToken = ledgerSender_after.tokens.find(p => p.stId == partialEvents[0].splitFromSecTokenId);
        assert(softMintedSecToken.tokTypeId == parentSplitSecToken.tokTypeId, 'unexpected eeu type of soft-minted eeu');
        assert(softMintedSecToken.batchId == parentSplitSecToken.batchId, 'unexpected batch id of soft-minted eeu');

        assert(fullEvents.every(p => ledgerSender_before.tokens.some(p2 => p2.stId == p.stId)), 'unexpected full event eeu id(s) vs. ledger A before');
        assert(fullEvents.every(p => !ledgerSender_after.tokens.some(p2 => p2.stId == p.stId)), 'unexpected full event eeu id(s) vs. ledger A after');
        assert(fullEvents.every(p => ledgerReceiver_after.tokens.some(p2 => p2.stId == p.stId)), 'unexpected full event eeu id(s) vs. ledger B after');

        assert(ledgerSender_after.tokens.length == start_Sender_eeuCount - expectFullTransfer_eeuCount, 'unexpected eeu count ledger A after');
        
        assert(ledgerReceiver_after.tokens.length == start_Receiver_eeuCount + expectFullTransfer_eeuCount + 1, 'unexpected eeu count ledger B after'); 
    }
};

async function transferWrapped({
    stm, accounts,
    ledger_A,     ledger_B, 
    qty_A,        tokTypeId_A,
    qty_B,        tokTypeId_B,
    ccy_amount_A, ccyTypeId_A,
    ccy_amount_B, ccyTypeId_B,
    applyFees,
    k_stIds_A,
    k_stIds_B,
    transferType,
}, from) {
    // console.log({ 
    //         ledger_A,                          ledger_B, 
    //            qty_A: qty_A.toString(),        tokTypeId_A, 
    //            qty_B: qty_B.toString(),        tokTypeId_B, 
    //     ccy_amount_A: ccy_amount_A.toString(), ccyTypeId_A, 
    //     ccy_amount_B: ccy_amount_B.toString(), ccyTypeId_B, 
    //         applyFees,
    //     feeAddrOwner: CONST.nullAddr,
    //        k_stIds_A: k_stIds_A || [],
    //        k_stIds_B: k_stIds_B || [],
    //     transferType: transferType || CONST.transferType.UNDEFINED,
    // });
    const tx = await stm.transferOrTrade({ 
                ledger_A,                          ledger_B, 
                   qty_A: qty_A.toString(),        tokTypeId_A, 
                   qty_B: qty_B.toString(),        tokTypeId_B, 
            ccy_amount_A: ccy_amount_A.toString(), ccyTypeId_A, 
            ccy_amount_B: ccy_amount_B.toString(), ccyTypeId_B, 
               applyFees,
            feeAddrOwner: CONST.nullAddr,
               k_stIds_A: k_stIds_A || [],
               k_stIds_B: k_stIds_B || [],
            transferType: transferType || CONST.transferType.UNDEFINED,
        },
        from //{ from: accounts[0] }
    );
    //console.log('stm.transfer', tx.args);
    //console.dir(tx);
    return tx;
}