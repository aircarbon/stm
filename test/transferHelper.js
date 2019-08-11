const ac = artifacts.require('AcMaster');
const truffleAssert = require('truffle-assertions');

module.exports = {

    transferLedger: async ({ acm, accounts, 
        ledger_A,     ledger_B, 
        kg_A,         eeuTypeId_A,
        kg_B,         eeuTypeId_B,
        ccy_amount_A, ccyTypeId_A,
        ccy_amount_B, ccyTypeId_B
    }) => {
        var ledgerA_before, ledgerA_after;
        var ledgerB_before, ledgerB_after;
        var getTotalKgTransfered_before, getTotalKgTransfered_after;
        const totalCcyTransfered_before = [];
        const totalCcyTransfered_after = [];

        ledgerA_before = await acm.getLedgerEntry(ledger_A);
        ledgerB_before = await acm.getLedgerEntry(ledger_B);
        getTotalKgTransfered_before = await acm.getTotalKgTransfered.call();
        totalCcyTransfered_before[ccyTypeId_A] = await acm.getTotalCcyTransfered.call(ccyTypeId_A);
        totalCcyTransfered_before[ccyTypeId_B] = await acm.getTotalCcyTransfered.call(ccyTypeId_B);

        // expected net delta per currency, wrt. account A
        const deltaCcy_fromA = [];
        deltaCcy_fromA[ccyTypeId_A] = 0;
        deltaCcy_fromA[ccyTypeId_B] = 0;
        deltaCcy_fromA[ccyTypeId_A] -= ccy_amount_A;
        deltaCcy_fromA[ccyTypeId_B] += ccy_amount_B;
        //console.dir(netDeltaCcyExpected_fromA);

        // transfer
        const transferTx = await acm.transfer(
            ledger_A,     ledger_B, 
            kg_A,         eeuTypeId_A,
            kg_B,         eeuTypeId_B,
            ccy_amount_A, ccyTypeId_A,
            ccy_amount_B, ccyTypeId_B, 
            { from: accounts[0] }
        );
        ledgerA_after = await acm.getLedgerEntry(ledger_A);
        ledgerB_after = await acm.getLedgerEntry(ledger_B);

        // validate currency events
        getTotalKgTransfered_after = await acm.getTotalKgTransfered.call();
        totalCcyTransfered_after[ccyTypeId_A] = await acm.getTotalCcyTransfered.call(ccyTypeId_A);
        totalCcyTransfered_after[ccyTypeId_B] = await acm.getTotalCcyTransfered.call(ccyTypeId_B);
        if (ccy_amount_A > 0 || ccy_amount_B > 0) {
            truffleAssert.eventEmitted(transferTx, 'TransferedLedgerCcy', ev => { return (
                (ccy_amount_A > 0 && ev.from == ledger_A && ev.to == ledger_B && ev.ccyTypeId == ccyTypeId_A && ev.amount == ccy_amount_A)
             || (ccy_amount_B > 0 && ev.from == ledger_B && ev.to == ledger_A && ev.ccyTypeId == ccyTypeId_B && ev.amount == ccy_amount_B)
                );
            });
        }

        // validate currency ledger balances are updated: A -> B
        const A_bal_aft_ccyA = Number(ledgerA_after.ccys.find(p => p.typeId == ccyTypeId_A).balance);
        const B_bal_aft_ccyA = Number(ledgerB_after.ccys.find(p => p.typeId == ccyTypeId_A).balance);
        const A_bal_bef_ccyA = Number(ledgerA_before.ccys.find(p => p.typeId == ccyTypeId_A).balance);
        const B_bal_bef_ccyA = Number(ledgerB_before.ccys.find(p => p.typeId == ccyTypeId_A).balance);

        assert(A_bal_aft_ccyA - A_bal_bef_ccyA == deltaCcy_fromA[ccyTypeId_A] * +1,
               `unexpected ledger A balance ${A_bal_aft_ccyA} after transfer A -> B amount ${ccy_amount_A} ccy type ${ccyTypeId_A}`);

        assert(B_bal_aft_ccyA - B_bal_bef_ccyA == deltaCcy_fromA[ccyTypeId_A] * -1,
               `unexpected ledger B balance ${B_bal_aft_ccyA} after transfer A -> B amount ${ccy_amount_A} ccy type ${ccyTypeId_A}`);

        // validate currency ledger balances are updated: B -> A
        const B_bal_aft_ccyB = Number(ledgerB_after.ccys.find(p => p.typeId == ccyTypeId_B).balance);
        const A_bal_aft_ccyB = Number(ledgerA_after.ccys.find(p => p.typeId == ccyTypeId_B).balance);
        const B_bal_bef_ccyB = Number(ledgerB_before.ccys.find(p => p.typeId == ccyTypeId_B).balance);
        const A_bal_bef_ccyB = Number(ledgerA_before.ccys.find(p => p.typeId == ccyTypeId_B).balance);

        assert(B_bal_aft_ccyB - B_bal_bef_ccyB == deltaCcy_fromA[ccyTypeId_B] * -1,
               `unexpected ledger B balance ${B_bal_aft_ccyB} after transfer B -> A amount ${ccy_amount_B} ccy type ${ccyTypeId_B}`);

        assert(A_bal_aft_ccyB - A_bal_bef_ccyB == deltaCcy_fromA[ccyTypeId_B] * +1,
               `unexpected ledger A balance ${A_bal_aft_ccyB} after transfer B -> A amount ${ccy_amount_B} ccy type ${ccyTypeId_B}`);

        // validate ledger balance unchanged for other ccy's
        //...

        // validate currency global totals
        totalCcyTransfered_after[ccyTypeId_A] = await acm.getTotalCcyTransfered.call(ccyTypeId_A);
        totalCcyTransfered_after[ccyTypeId_B] = await acm.getTotalCcyTransfered.call(ccyTypeId_B);
        const totalCcy_tfd = [];
        totalCcy_tfd[ccyTypeId_A] = 0;
        totalCcy_tfd[ccyTypeId_B] = 0;
        totalCcy_tfd[ccyTypeId_A] += ccy_amount_A;
        totalCcy_tfd[ccyTypeId_B] += ccy_amount_B;
        assert(totalCcyTransfered_after[ccyTypeId_A] - totalCcyTransfered_before[ccyTypeId_A] == totalCcy_tfd[ccyTypeId_A],
               `unexpected total transfered delta after, ccy A`);
        assert(totalCcyTransfered_after[ccyTypeId_B] - totalCcyTransfered_before[ccyTypeId_B] == totalCcy_tfd[ccyTypeId_B],
               `unexpected total transfered delta after, ccy B`);

        // validate EEU events
        const eeuFullEvents = [];
        const eeuPartialEvents = [];
        if (kg_A > 0 || kg_B > 0) {
            //truffleAssert.prettyPrintEmittedEvents(transferTx);
            
            // we expect n full events (possibly 0), and maximum one partial event (possibly 0)
            try { truffleAssert.eventEmitted(transferTx, 'TransferedFullEeu',    ev => { eeuFullEvents.push(ev);    return true; }); }
            catch {}
            try { truffleAssert.eventEmitted(transferTx, 'TransferedPartialEeu', ev => { eeuPartialEvents.push(ev); return true; }); }
            catch {}

            assert(eeuFullEvents.length > 0 || eeuPartialEvents.length == 1, 'unexpected transfer full vs. partial event count after transfer');
            if ((kg_A > 0 && kg_B == 0) || (kg_B > 0 && kg_A == 0)) {
                assert(eeuPartialEvents.length <= 1, 'unexpected transfer partial event count after single-sided eeu transfer');
            }
            else {
                assert(eeuPartialEvents.length <= 2, 'unexpected transfer partial event count after two-sided eeu transfer');
            }
            
            // validate that total tonnage across A and B is unchanged
            assert(Number(ledgerA_before.eeu_sumKG) + Number(ledgerB_before.eeu_sumKG) ==
                   Number(ledgerA_after.eeu_sumKG) + Number(ledgerB_after.eeu_sumKG),
                  'unexpected total tonnage sum across ledger before vs. after');
        }

        // validate EEUs are moved        
        if (kg_A > 0) {
            var netKg_tfd = 0;
            netKg_tfd += kg_A;
            netKg_tfd -= kg_B;
            assert(ledgerA_after.eeu_sumKG == Number(ledgerA_before.eeu_sumKG) - netKg_tfd, 'unexpected ledger A tonnage sum after transfer A -> B');
            assert(ledgerB_after.eeu_sumKG == Number(ledgerB_before.eeu_sumKG) + netKg_tfd, 'unexpected ledger B tonnage sum after transfer A -> B');
        }
        if (kg_B > 0) {
            var netKg_tfd = 0;
            netKg_tfd += kg_B;
            netKg_tfd -= kg_A;
            assert(ledgerB_after.eeu_sumKG == Number(ledgerB_before.eeu_sumKG) - netKg_tfd, 'unexpected ledger B tonnage sum after transfer B -> A');
            assert(ledgerA_after.eeu_sumKG == Number(ledgerA_before.eeu_sumKG) + netKg_tfd, 'unexpected ledger A tonnage sum after transfer B -> A');
        }

        return { eeuFullEvents, eeuPartialEvents,
                 ledgerA_before, ledgerA_after, ledgerB_before, ledgerB_after };
    },

    assert_nFull_1Partial: ({ 
        fullEvents, partialEvents,
        expectFullTransfer_eeuCount,
        ledgerSender_before,   ledgerSender_after,
        ledgerReceiver_before, ledgerReceiver_after,
    }) => {

        const start_Sender_eeuCount = ledgerSender_before.eeus.length;
        const start_Receiver_eeuCount = ledgerReceiver_before.eeus.length;

        assert(fullEvents.length == expectFullTransfer_eeuCount && partialEvents.length == 1, 'unexpected event composition');
        assert(ledgerSender_before.eeus.some(p => p.eeuId == partialEvents[0].splitFromEeuId), 'unexpected partial event parent eeu id vs. ledger A before');
        assert(ledgerReceiver_after.eeus.some(p => p.eeuId == partialEvents[0].newEeuId), 'unexpected partial event soft-minted eeu id vs. ledger B after');
        
        const softMintedEeu = ledgerReceiver_after.eeus.find(p => p.eeuId == partialEvents[0].newEeuId);
        const parentSplitEeu = ledgerSender_after.eeus.find(p => p.eeuId == partialEvents[0].splitFromEeuId);
        assert(softMintedEeu.eeuTypeId == parentSplitEeu.eeuTypeId, 'unexpected eeu type of soft-minted eeu');
        assert(softMintedEeu.batchId == parentSplitEeu.batchId, 'unexpected batch id of soft-minted eeu');

        assert(fullEvents.every(p => ledgerSender_before.eeus.some(p2 => p2.eeuId == p.eeuId)), 'unexpected full event eeu id(s) vs. ledger A before');
        assert(fullEvents.every(p => !ledgerSender_after.eeus.some(p2 => p2.eeuId == p.eeuId)), 'unexpected full event eeu id(s) vs. ledger A after');
        assert(fullEvents.every(p => ledgerReceiver_after.eeus.some(p2 => p2.eeuId == p.eeuId)), 'unexpected full event eeu id(s) vs. ledger B after');

        assert(ledgerSender_after.eeus.length == start_Sender_eeuCount - expectFullTransfer_eeuCount, 'unexpected eeu count ledger A after');
        
        // TODO: expect 1 when combine is done ...
        assert(ledgerReceiver_after.eeus.length == start_Receiver_eeuCount + expectFullTransfer_eeuCount + 1, 'unexpected eeu count ledger B after'); 
    }
};