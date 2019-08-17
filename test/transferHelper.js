const ac = artifacts.require('AcMaster');
const truffleAssert = require('truffle-assertions');
const BN = require('bn.js');

module.exports = {

    transferLedger: async ({ acm, accounts, 
        ledger_A,     ledger_B, 
        kg_A,         eeuTypeId_A,
        kg_B,         eeuTypeId_B,   
        ccy_amount_A, ccyTypeId_A,   
        ccy_amount_B, ccyTypeId_B,   
        applyFees,
    }) => {
        var ledgerA_before, ledgerA_after;
        var ledgerB_before, ledgerB_after;
        var ledgerContractOwner_before, ledgerContractOwner_after;
        var totalKg_tfd_before, totalKg_tfd_after;
        const totalCcy_tfd_before = [];
        const totalCcy_tfd_after = [];

        ledgerA_before = await acm.getLedgerEntry(ledger_A);
        ledgerB_before = await acm.getLedgerEntry(ledger_B);
        ledgerContractOwner_before = await acm.getLedgerEntry(accounts[0]);
        totalKg_tfd_before = await acm.getTotalKgTransfered.call();
        totalCcy_tfd_before[ccyTypeId_A] = await acm.getTotalCcyTransfered.call(ccyTypeId_A);
        totalCcy_tfd_before[ccyTypeId_B] = await acm.getTotalCcyTransfered.call(ccyTypeId_B);

        // expected net delta per currency, wrt. account A
        const deltaCcy_fromA = [];
        deltaCcy_fromA[ccyTypeId_A] = 0;
        deltaCcy_fromA[ccyTypeId_B] = 0;
        deltaCcy_fromA[ccyTypeId_A] -= ccy_amount_A;
        deltaCcy_fromA[ccyTypeId_B] += ccy_amount_B;
        
        // expected currency fees paid by A and B
        var fee_ccy_A = 0;
        if (ccy_amount_A > 0 && applyFees) {
            fee_ccy_A = Number(await acm.fee_ccyType_Fixed(ccyTypeId_A)); // ccy fee paid by A
        }
        var fee_ccy_B = 0;
        if (ccy_amount_B > 0 && applyFees) {
            fee_ccy_B = Number(await acm.fee_ccyType_Fixed(ccyTypeId_B)); // ccy fee paid by B
        }

        // transfer
        const transferTx = await acm.transfer(
            ledger_A,     ledger_B, 
            kg_A,         eeuTypeId_A, 
            kg_B,         eeuTypeId_B, 
            ccy_amount_A, ccyTypeId_A, 
            ccy_amount_B, ccyTypeId_B, 
            applyFees, 
            { from: accounts[0] }
        );
        ledgerA_after = await acm.getLedgerEntry(ledger_A);
        ledgerB_after = await acm.getLedgerEntry(ledger_B);
        ledgerContractOwner_after = await acm.getLedgerEntry(accounts[0]);
        totalKg_tfd_after = await acm.getTotalKgTransfered.call();
        totalCcy_tfd_after[ccyTypeId_A] = await acm.getTotalCcyTransfered.call(ccyTypeId_A);
        totalCcy_tfd_after[ccyTypeId_B] = await acm.getTotalCcyTransfered.call(ccyTypeId_B);

        // validate currency events
        if (ccy_amount_A > 0 || ccy_amount_B > 0) {
            truffleAssert.eventEmitted(transferTx, 'TransferedLedgerCcy', ev => { return (
                // main transfer events
                (ccy_amount_A > 0 && ev.from == ledger_A && ev.to == ledger_B && ev.ccyTypeId == ccyTypeId_A && ev.amount == ccy_amount_A)
             || (ccy_amount_B > 0 && ev.from == ledger_B && ev.to == ledger_A && ev.ccyTypeId == ccyTypeId_B && ev.amount == ccy_amount_B)
                // fee transfer events
             || (ccy_amount_A > 0 && ev.from == ledger_A && ev.to == accounts[0] && ev.ccyTypeId == ccyTypeId_A)
             || (ccy_amount_B > 0 && ev.from == ledger_B && ev.to == accounts[0] && ev.ccyTypeId == ccyTypeId_B)
                );
            });
        }

        // validate currency ledger balances are updated: A -> B
        const A_bal_aft_ccyA = Number(ledgerA_after.ccys.find(p => p.typeId == ccyTypeId_A).balance);
        const B_bal_aft_ccyA = Number(ledgerB_after.ccys.find(p => p.typeId == ccyTypeId_A).balance);
        const A_bal_bef_ccyA = Number(ledgerA_before.ccys.find(p => p.typeId == ccyTypeId_A).balance);
        const B_bal_bef_ccyA = Number(ledgerB_before.ccys.find(p => p.typeId == ccyTypeId_A).balance);

        assert(A_bal_aft_ccyA - A_bal_bef_ccyA + fee_ccy_A == deltaCcy_fromA[ccyTypeId_A] * +1,
               `unexpected ledger A balance ${A_bal_aft_ccyA} after transfer A -> B amount ${ccy_amount_A} ccy type ${ccyTypeId_A}`);

        assert(B_bal_aft_ccyA - B_bal_bef_ccyA == deltaCcy_fromA[ccyTypeId_A] * -1,
               `unexpected ledger B balance ${B_bal_aft_ccyA} after transfer A -> B amount ${ccy_amount_A} ccy type ${ccyTypeId_A}`);

        // validate currency ledger balances are updated: B -> A
        const B_bal_aft_ccyB = Number(ledgerB_after.ccys.find(p => p.typeId == ccyTypeId_B).balance);
        const A_bal_aft_ccyB = Number(ledgerA_after.ccys.find(p => p.typeId == ccyTypeId_B).balance);
        const B_bal_bef_ccyB = Number(ledgerB_before.ccys.find(p => p.typeId == ccyTypeId_B).balance);
        const A_bal_bef_ccyB = Number(ledgerA_before.ccys.find(p => p.typeId == ccyTypeId_B).balance);

        // console.log('B_bal_bef_ccyB', B_bal_bef_ccyB);
        // console.log('B_bal_aft_ccyB', B_bal_aft_ccyB);
        // console.log('fee_ccy_A', fee_ccy_B);
        // console.log('deltaCcy_fromA[ccyTypeId_B]', deltaCcy_fromA[ccyTypeId_B]);
        assert(B_bal_aft_ccyB - B_bal_bef_ccyB + fee_ccy_B == deltaCcy_fromA[ccyTypeId_B] * -1,
               `unexpected ledger B balance ${B_bal_aft_ccyB} after transfer B -> A amount ${ccy_amount_B} ccy type ${ccyTypeId_B}`);

        assert(A_bal_aft_ccyB - A_bal_bef_ccyB == deltaCcy_fromA[ccyTypeId_B] * +1,
               `unexpected ledger A balance ${A_bal_aft_ccyB} after transfer B -> A amount ${ccy_amount_B} ccy type ${ccyTypeId_B}`);

        // validate currency global totals
        totalCcy_tfd_after[ccyTypeId_A] = await acm.getTotalCcyTransfered.call(ccyTypeId_A);
        totalCcy_tfd_after[ccyTypeId_B] = await acm.getTotalCcyTransfered.call(ccyTypeId_B);
        const expectedCcy_tfd = [];
        expectedCcy_tfd[ccyTypeId_A] = 0;
        expectedCcy_tfd[ccyTypeId_B] = 0;
        expectedCcy_tfd[ccyTypeId_A] += ccy_amount_A;
        expectedCcy_tfd[ccyTypeId_B] += ccy_amount_B;
        if (applyFees) {
            if (ccy_amount_A > 0) {
                expectedCcy_tfd[ccyTypeId_A] = Number(expectedCcy_tfd[ccyTypeId_A]) + Number(fee_ccy_A);
            }
            if (ccy_amount_B > 0) {
                expectedCcy_tfd[ccyTypeId_B] = Number(expectedCcy_tfd[ccyTypeId_B]) + Number(fee_ccy_B);
            }
        }

        // console.log('totalCcy_tfd_after[ccyTypeId_A]', totalCcy_tfd_after[ccyTypeId_A].toString());
        // console.log('totalCcy_tfd_before[ccyTypeId_A]', totalCcy_tfd_before[ccyTypeId_A].toString());
        // console.log('expectedCcy_tfd[ccyTypeId_A]', expectedCcy_tfd[ccyTypeId_A].toString());
        assert(totalCcy_tfd_after[ccyTypeId_A].sub(totalCcy_tfd_before[ccyTypeId_A]).eq(new BN(expectedCcy_tfd[ccyTypeId_A].toString())),
               `unexpected total transfered delta after, ccy A`);
               
        assert(totalCcy_tfd_after[ccyTypeId_B].sub(totalCcy_tfd_before[ccyTypeId_B]).eq(new BN(expectedCcy_tfd[ccyTypeId_B].toString())),
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

            // validate main (non-fee) EEU transfer event counts
            if (kg_A > 0) {
                assert(eeuFullEvents.filter(p => p.from == ledger_A && p.to != accounts[0]).length > 0 ||
                       eeuPartialEvents.filter(p => p.from == ledger_A && p.to != accounts[0]).length == 1,
                       'unexpected transfer full vs. partial event count after transfer for ledger A');
            }
            if (kg_B > 0) {
                assert(eeuFullEvents.filter(p => p.from == ledger_B && p.to != accounts[0]).length > 0 ||
                       eeuPartialEvents.filter(p => p.from == ledger_B && p.to != accounts[0]).length == 1,
                       'unexpected transfer full vs. partial event count after transfer for ledger B');
            }
            
            if ((kg_A > 0 && kg_B == 0) || (kg_B > 0 && kg_A == 0)) {
                assert(eeuPartialEvents.length <= (!applyFees ? 1 : 2), 'unexpected transfer partial event count after single-sided eeu transfer');
            }
            else {
                assert(eeuPartialEvents.length <= (!applyFees ? 2 : 3), 'unexpected transfer partial event count after two-sided eeu transfer');
            }
            
            // validate that total tonnage across A, B and contract owner (fee receiver) is unchanged
            assert(Number(ledgerA_before.eeu_sumKG) + Number(ledgerB_before.eeu_sumKG) + Number(ledgerContractOwner_before.eeu_sumKG) ==
                   Number(ledgerA_after.eeu_sumKG)  + Number(ledgerB_after.eeu_sumKG)  + Number(ledgerContractOwner_after.eeu_sumKG),
                  'unexpected total tonnage sum across ledger before vs. after');
        }

        // validate EEUs are moved        
        var totalKg_tfd_incFees = new BN(kg_A).add(new BN(kg_B));
        var totalKg_allEeuTypes_fees = new BN(0);
        if (kg_A > 0) {
            var netKg_tfd = 0;
            const eeuFee_A = Number(await acm.fee_eeuType_Fixed(eeuTypeId_A)); // EEU fee paid by A
            totalKg_tfd_incFees = totalKg_tfd_incFees.add(new BN(eeuFee_A));
            totalKg_allEeuTypes_fees = totalKg_allEeuTypes_fees.add(new BN(eeuFee_A));
            netKg_tfd += kg_A; // transfered by A
            netKg_tfd -= kg_B; // received from B
            assert(ledgerA_after.eeu_sumKG == Number(ledgerA_before.eeu_sumKG) - netKg_tfd - eeuFee_A, 'unexpected ledger A tonnage sum after transfer A -> B');
            assert(ledgerB_after.eeu_sumKG == Number(ledgerB_before.eeu_sumKG) + netKg_tfd, 'unexpected ledger B tonnage sum after transfer A -> B');
        }
        if (kg_B > 0) {
            var netKg_tfd = 0;
            const eeuFee_B = Number(await acm.fee_eeuType_Fixed(eeuTypeId_B)); // EEU fee paid by B
            totalKg_tfd_incFees = totalKg_tfd_incFees.add(new BN(eeuFee_B));
            totalKg_allEeuTypes_fees = totalKg_allEeuTypes_fees.add(new BN(eeuFee_B));
            netKg_tfd += kg_B; // transfered by B
            netKg_tfd -= kg_A; // received from A
            assert(ledgerB_after.eeu_sumKG == Number(ledgerB_before.eeu_sumKG) - netKg_tfd - eeuFee_B, 'unexpected ledger B tonnage sum after transfer B -> A');
            assert(ledgerA_after.eeu_sumKG == Number(ledgerA_before.eeu_sumKG) + netKg_tfd, 'unexpected ledger A tonnage sum after transfer B -> A');
        }

        // validate carbon fee sum tonnage in contract owner
        assert(new BN(ledgerContractOwner_after.eeu_sumKG).sub(new BN(ledgerContractOwner_before.eeu_sumKG))
                .eq(totalKg_allEeuTypes_fees), 'unexpected contract owner (fee receiver) tonnage after transfer');

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
        
        assert(ledgerReceiver_after.eeus.length == start_Receiver_eeuCount + expectFullTransfer_eeuCount + 1, 'unexpected eeu count ledger B after'); 
    }
};