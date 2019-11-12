const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const BN = require('bn.js');
const Big = require('big.js');

module.exports = {

    transferLedger: async ({ stm, accounts,
        ledger_A,     ledger_B, 
        qty_A,         tokenTypeId_A,
        qty_B,         tokenTypeId_B,
        ccy_amount_A, ccyTypeId_A,
        ccy_amount_B, ccyTypeId_B,
        applyFees,
    }) => {
        // ledger entries before
        var ledgerA_before, ledgerA_after;
        var ledgerB_before, ledgerB_after;
        var ledgerContractOwner_before, ledgerContractOwner_after;
        ledgerA_before = await stm.getLedgerEntry(ledger_A);
        ledgerB_before = await stm.getLedgerEntry(ledger_B);
        ledgerContractOwner_before = await stm.getLedgerEntry(accounts[0]);
        
        // global totals: transferred before
        var totalKg_tfd_before, totalKg_tfd_after;
        const totalCcy_tfd_before = [];
        const totalCcy_tfd_after = [];
        totalKg_tfd_before = await stm.getSecToken_totalTransfered.call();
        totalCcy_tfd_before[ccyTypeId_A] = await stm.getCcy_totalTransfered.call(ccyTypeId_A);
        totalCcy_tfd_before[ccyTypeId_B] = await stm.getCcy_totalTransfered.call(ccyTypeId_B);

        // global totals: fees before
        var totalKg_fees_before, totalKg_fees_after;
        const totalCcy_fees_before = [];
        const totalCcy_fees_after = [];
        totalKg_fees_before = await stm.getSecToken_totalFeesPaidQty.call();
        totalCcy_fees_before[ccyTypeId_A] = await stm.getCcy_totalFeesPaidAmount.call(ccyTypeId_A);
        totalCcy_fees_before[ccyTypeId_B] = await stm.getCcy_totalFeesPaidAmount.call(ccyTypeId_B);

        // expected net delta per currency, wrt. account A
        const deltaCcy_fromA = [];
        deltaCcy_fromA[ccyTypeId_A] = 0;
        deltaCcy_fromA[ccyTypeId_B] = 0;
        deltaCcy_fromA[ccyTypeId_A] -= ccy_amount_A;
        deltaCcy_fromA[ccyTypeId_B] += ccy_amount_B;
        
        // expected currency fees paid by A and B
        var fee_ccy_A = 0;
        if (ccy_amount_A > 0 && applyFees) {
            fee_ccy_A = Number(await stm.fee_ccyType_Fixed(ccyTypeId_A)) // ccy fee paid by A
                      + Number((ccy_amount_A / 100) * Number(await stm.fee_ccyType_Perc(ccyTypeId_A)));
            //console.log('fee_ccy_A', fee_ccy_A);
        }
        var fee_ccy_B = 0;
        if (ccy_amount_B > 0 && applyFees) {
            fee_ccy_B = Number(await stm.fee_ccyType_Fixed(ccyTypeId_B)) // ccy fee paid by B
                      + Number((ccy_amount_B / 100) * Number(await stm.fee_ccyType_Perc(ccyTypeId_B)));
            console.log('fee_ccy_B', fee_ccy_B);
        }

        // transfer
        const transferTx = await stm.transfer(
            ledger_A,     ledger_B, 
            qty_A,         tokenTypeId_A, 
            qty_B,         tokenTypeId_B, 
            ccy_amount_A, ccyTypeId_A, 
            ccy_amount_B, ccyTypeId_B, 
            applyFees, 
            { from: accounts[0] }
        );

        // ledger entries after
        ledgerA_after = await stm.getLedgerEntry(ledger_A);
        ledgerB_after = await stm.getLedgerEntry(ledger_B);
        ledgerContractOwner_after = await stm.getLedgerEntry(accounts[0]);

        // global totals: transferred after
        totalKg_tfd_after = await stm.getSecToken_totalTransfered.call();
        totalCcy_tfd_after[ccyTypeId_A] = await stm.getCcy_totalTransfered.call(ccyTypeId_A);
        totalCcy_tfd_after[ccyTypeId_B] = await stm.getCcy_totalTransfered.call(ccyTypeId_B);

        // global totals: fees after
        totalKg_fees_after = await stm.getSecToken_totalFeesPaidQty.call();
        totalCcy_fees_after[ccyTypeId_A] = await stm.getCcy_totalFeesPaidAmount.call(ccyTypeId_A);
        totalCcy_fees_after[ccyTypeId_B] = await stm.getCcy_totalFeesPaidAmount.call(ccyTypeId_B);

        // validate fees
        if (applyFees) {
            // validate ccy fee events & global totals
            const eventCcy_fees = []
            eventCcy_fees[ccyTypeId_A] = new BN(0);
            eventCcy_fees[ccyTypeId_B] = new BN(0);
            //console.log(JSON.stringify(transferTx, null, 2));
            truffleAssert.eventEmitted(transferTx, 'TransferedLedgerCcy', ev => { 
                if (ev.isFee) { 
                    //console.dir(ev);
                    //console.log(`FEE: ${ev.from} --> ${ev.to} ccyTypeId=${ev.ccyTypeId} ... amount=${Number(ev.amount)}`);
                    eventCcy_fees[ev.ccyTypeId] = eventCcy_fees[ev.ccyTypeId].add(ev.amount);
                }
                return true;
            });
            console.log('totalCcy_fees_before[ccyTypeId_A]', totalCcy_fees_before[ccyTypeId_A].toString());
            //console.log('totalCcy_fees_before[ccyTypeId_B]', totalCcy_fees_before[ccyTypeId_B].toString());
            console.log('eventCcy_fees[ccyTypeId_A]', eventCcy_fees[ccyTypeId_A].toString());
            //console.log('eventCcy_fees[ccyTypeId_B]', eventCcy_fees[ccyTypeId_B].toString());
            console.log('totalCcy_fees_after[ccyTypeId_A]', totalCcy_fees_after[ccyTypeId_A].toString());
            //console.log('totalCcy_fees_after[ccyTypeId_B]', totalCcy_fees_after[ccyTypeId_B].toString());
            assert(totalCcy_fees_after[ccyTypeId_A].sub(totalCcy_fees_before[ccyTypeId_A]).eq(eventCcy_fees[ccyTypeId_A]), `unexpected global total ccy fees before/after vs. events ccy type ${ccyTypeId_A}`);
            assert(totalCcy_fees_after[ccyTypeId_B].sub(totalCcy_fees_before[ccyTypeId_B]).eq(eventCcy_fees[ccyTypeId_B]), `unexpected global total ccy fees before/after vs. events ccy type ${ccyTypeId_B}`);

            // validate eeu fee events & global totals
            var eventKg_fees = new BN(0);
            try {
                truffleAssert.eventEmitted(transferTx, 'TransferedFullSecToken', ev => { 
                    if (ev.isFee) eventKg_fees = eventKg_fees.add(ev.qty); return true;
                });
            } catch {}
            try {
                truffleAssert.eventEmitted(transferTx, 'TransferedPartialSecToken', ev => { 
                    if (ev.isFee) eventKg_fees = eventKg_fees.add(ev.qty); return true;
                });
            } catch {}
            //console.log('totalKg_fees_before', totalKg_fees_before.toString());
            //console.log('eventKg_fees', eventKg_fees.toString());
            //console.log('totalKg_fees_after', totalKg_fees_after.toString());
            assert(totalKg_fees_after.sub(totalKg_fees_before).eq(eventKg_fees), `unexpected global total carbon fees before/after vs. events`);
        }

        // validate currency transfer events
        if (ccy_amount_A > 0 || ccy_amount_B > 0) {
            truffleAssert.eventEmitted(transferTx, 'TransferedLedgerCcy', ev => { return (
                // main transfer events - by receiver account being non-owner account
                (ccy_amount_A > 0 && ev.from == ledger_A && ev.to == ledger_B && ev.ccyTypeId == ccyTypeId_A && ev.amount == ccy_amount_A)
             || (ccy_amount_B > 0 && ev.from == ledger_B && ev.to == ledger_A && ev.ccyTypeId == ccyTypeId_B && ev.amount == ccy_amount_B)
                // fee transfer events - by receiver account being owner's account
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

            assert(A_bal_aft_ccyA.minus(A_bal_bef_ccyA).plus(Big(fee_ccy_A)).eq(Big(deltaCcy_fromA[ccyTypeId_A]).times(+1)),
                `unexpected ledger A balance ${A_bal_aft_ccyA} after transfer A -> B amount ${ccy_amount_A} ccy type ${ccyTypeId_A}`);

            assert(B_bal_aft_ccyA.minus(B_bal_bef_ccyA).eq(Big(deltaCcy_fromA[ccyTypeId_A]).times(-1)),
                `unexpected ledger B balance ${B_bal_aft_ccyA} after transfer A -> B amount ${ccy_amount_A} ccy type ${ccyTypeId_A}`);
        }

        // validate currency ledger balances are updated: B -> A
        if (ccy_amount_B > 0) {
            const B_bal_aft_ccyB = Big(ledgerB_after.ccys.find(p => p.ccyTypeId == ccyTypeId_B).balance);
            const A_bal_aft_ccyB = Big(ledgerA_after.ccys.find(p => p.ccyTypeId == ccyTypeId_B).balance);
            const B_bal_bef_ccyB = Big(ledgerB_before.ccys.find(p => p.ccyTypeId == ccyTypeId_B).balance);
            const A_bal_bef_ccyB = Big(ledgerA_before.ccys.find(p => p.ccyTypeId == ccyTypeId_B).balance);

            assert(B_bal_aft_ccyB.minus(B_bal_bef_ccyB).plus(Big(fee_ccy_B)).eq(Big(deltaCcy_fromA[ccyTypeId_B]).times(-1)),
                `unexpected ledger B balance ${B_bal_aft_ccyB} after transfer B -> A amount ${ccy_amount_B} ccy type ${ccyTypeId_B}`);

            assert(A_bal_aft_ccyB.minus(A_bal_bef_ccyB).eq(Big(deltaCcy_fromA[ccyTypeId_B]).times(+1)),
                `unexpected ledger A balance ${A_bal_aft_ccyB} after transfer B -> A amount ${ccy_amount_B} ccy type ${ccyTypeId_B}`);
        }

        // validate currency global totals
        totalCcy_tfd_after[ccyTypeId_A] = await stm.getCcy_totalTransfered.call(ccyTypeId_A);
        totalCcy_tfd_after[ccyTypeId_B] = await stm.getCcy_totalTransfered.call(ccyTypeId_B);
        const expectedCcy_tfd = []; 
        expectedCcy_tfd[ccyTypeId_A] = Number(0);
        expectedCcy_tfd[ccyTypeId_B] = Number(0);
        expectedCcy_tfd[ccyTypeId_A] = expectedCcy_tfd[ccyTypeId_A] + Number(ccy_amount_A);
        expectedCcy_tfd[ccyTypeId_B] = expectedCcy_tfd[ccyTypeId_B] + Number(ccy_amount_B);
        if (applyFees) {
            if (ccy_amount_A > 0) {
                expectedCcy_tfd[ccyTypeId_A] = Number(expectedCcy_tfd[ccyTypeId_A]) + Number(fee_ccy_A);
            }
            if (ccy_amount_B > 0) {
                expectedCcy_tfd[ccyTypeId_B] = Number(expectedCcy_tfd[ccyTypeId_B]) + Number(fee_ccy_B);
            }
        }
        // console.log('                       fee_ccy_A', fee_ccy_A.toString());
        // console.log(' totalCcy_tfd_after[ccyTypeId_A]', totalCcy_tfd_after[ccyTypeId_A].toString());
        // console.log('totalCcy_tfd_before[ccyTypeId_A]', totalCcy_tfd_before[ccyTypeId_A].toString());
        // console.log('    expectedCcy_tfd[ccyTypeId_A]', expectedCcy_tfd[ccyTypeId_A].toString());
        assert(Big(totalCcy_tfd_after[ccyTypeId_A]).minus(Big(totalCcy_tfd_before[ccyTypeId_A])).eq(Big(expectedCcy_tfd[ccyTypeId_A])),
               `unexpected total transfered delta after, ccy A`);
               
        assert(Big(totalCcy_tfd_after[ccyTypeId_B]).minus(totalCcy_tfd_before[ccyTypeId_B]).eq(Big(expectedCcy_tfd[ccyTypeId_B])),
               `unexpected total transfered delta after, ccy B`);

        // validate EEU events
        const eeuFullEvents = [];
        const eeuPartialEvents = [];
        if (qty_A > 0 || qty_B > 0) {
            //truffleAssert.prettyPrintEmittedEvents(transferTx);
            
            // we expect n full events (possibly 0), and maximum one partial event (possibly 0)
            try { truffleAssert.eventEmitted(transferTx, 'TransferedFullSecToken',    ev => { eeuFullEvents.push(ev);    return true; }); }
            catch {}
            try { truffleAssert.eventEmitted(transferTx, 'TransferedPartialSecToken', ev => { eeuPartialEvents.push(ev); return true; }); }
            catch {}

            // validate main (non-fee) EEU transfer event counts
            if (qty_A > 0) {
                assert(eeuFullEvents.filter(p => p.from == ledger_A && p.to != accounts[0]).length > 0 ||
                       eeuPartialEvents.filter(p => p.from == ledger_A && p.to != accounts[0]).length == 1,
                       'unexpected transfer full vs. partial event count after transfer for ledger A');
            }
            if (qty_B > 0) {
                assert(eeuFullEvents.filter(p => p.from == ledger_B && p.to != accounts[0]).length > 0 ||
                       eeuPartialEvents.filter(p => p.from == ledger_B && p.to != accounts[0]).length == 1,
                       'unexpected transfer full vs. partial event count after transfer for ledger B');
            }
            
            if ((qty_A > 0 && qty_B == 0) || (qty_B > 0 && qty_A == 0)) {
                assert(eeuPartialEvents.length <= (!applyFees ? 1 : 2), 'unexpected transfer partial event count after single-sided eeu transfer');
            }
            else {
                assert(eeuPartialEvents.length <= (!applyFees ? 2 : 3), 'unexpected transfer partial event count after two-sided eeu transfer');
            }
            
            // validate that total tonnage across A, B and contract owner (fee receiver) is unchanged
            assert(Number(ledgerA_before.tokens_sumQty) + Number(ledgerB_before.tokens_sumQty) + Number(ledgerContractOwner_before.tokens_sumQty) ==
                   Number(ledgerA_after.tokens_sumQty)  + Number(ledgerB_after.tokens_sumQty)  + Number(ledgerContractOwner_after.tokens_sumQty),
                  'unexpected total tonnage sum across ledger before vs. after');
        }

        // validate EEUs are moved        
        var totalKg_tfd_incFees = new BN(qty_A).add(new BN(qty_B));
        var totalqty_AllSecSecTokenTypes_fees = new BN(0);
        if (qty_A > 0) {
            var netKg_tfd = 0;
            const eeuFee_A = Number(await stm.fee_tokenType_Fixed(tokenTypeId_A)); // EEU fee paid by A
            totalKg_tfd_incFees = totalKg_tfd_incFees.add(new BN(eeuFee_A));
            totalqty_AllSecSecTokenTypes_fees = totalqty_AllSecSecTokenTypes_fees.add(new BN(eeuFee_A));
            netKg_tfd += qty_A; // transfered by A
            netKg_tfd -= qty_B; // received from B
            assert(ledgerA_after.tokens_sumQty == Number(ledgerA_before.tokens_sumQty) - netKg_tfd - eeuFee_A, 'unexpected ledger A tonnage sum after transfer A -> B');
            assert(ledgerB_after.tokens_sumQty == Number(ledgerB_before.tokens_sumQty) + netKg_tfd, 'unexpected ledger B tonnage sum after transfer A -> B');
        }
        if (qty_B > 0) {
            var netKg_tfd = 0;
            const eeuFee_B = Number(await stm.fee_tokenType_Fixed(tokenTypeId_B)); // EEU fee paid by B
            totalKg_tfd_incFees = totalKg_tfd_incFees.add(new BN(eeuFee_B));
            totalqty_AllSecSecTokenTypes_fees = totalqty_AllSecSecTokenTypes_fees.add(new BN(eeuFee_B));
            netKg_tfd += qty_B; // transfered by B
            netKg_tfd -= qty_A; // received from A
            assert(ledgerB_after.tokens_sumQty == Number(ledgerB_before.tokens_sumQty) - netKg_tfd - eeuFee_B, 'unexpected ledger B tonnage sum after transfer B -> A');
            assert(ledgerA_after.tokens_sumQty == Number(ledgerA_before.tokens_sumQty) + netKg_tfd, 'unexpected ledger A tonnage sum after transfer B -> A');
        }

        // validate carbon fee sum tonnage in contract owner
        assert(new BN(ledgerContractOwner_after.tokens_sumQty).sub(new BN(ledgerContractOwner_before.tokens_sumQty))
                .eq(totalqty_AllSecSecTokenTypes_fees), 'unexpected contract owner (fee receiver) tonnage after transfer');

        // validate carbon global totals
        assert(totalKg_tfd_after.sub(totalKg_tfd_before).eq(totalKg_tfd_incFees), 'unexpected total tonnage carbon after transfer');

        return {
            transferTx, 
            eeuFullEvents,              eeuPartialEvents,
            ledgerA_before,             ledgerA_after,  
            ledgerB_before,             ledgerB_after,
            ledgerContractOwner_before, ledgerContractOwner_after,
        };
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
        assert(softMintedSecToken.tokenTypeId == parentSplitSecToken.tokenTypeId, 'unexpected eeu type of soft-minted eeu');
        assert(softMintedSecToken.batchId == parentSplitSecToken.batchId, 'unexpected batch id of soft-minted eeu');

        assert(fullEvents.every(p => ledgerSender_before.tokens.some(p2 => p2.stId == p.stId)), 'unexpected full event eeu id(s) vs. ledger A before');
        assert(fullEvents.every(p => !ledgerSender_after.tokens.some(p2 => p2.stId == p.stId)), 'unexpected full event eeu id(s) vs. ledger A after');
        assert(fullEvents.every(p => ledgerReceiver_after.tokens.some(p2 => p2.stId == p.stId)), 'unexpected full event eeu id(s) vs. ledger B after');

        assert(ledgerSender_after.tokens.length == start_Sender_eeuCount - expectFullTransfer_eeuCount, 'unexpected eeu count ledger A after');
        
        assert(ledgerReceiver_after.tokens.length == start_Receiver_eeuCount + expectFullTransfer_eeuCount + 1, 'unexpected eeu count ledger B after'); 
    }
};