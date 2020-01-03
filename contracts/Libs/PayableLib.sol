pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";
import "./TransferLib.sol";

library PayableLib {

    // v1: multi-sub (+multi-issue...?)
    function pay(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CashflowStruct storage cashflowData,
        StructLib.FeeStruct storage globalFees, address owner
    )
    public {
        // get issuer
        require(ledgerData._batches_currentMax_id == 1, "Bad cashflow request: no minted batch");
        StructLib.SecTokenBatch storage issueBatch = ledgerData._batches[1];

        // process payment
        if (msg.sender == issueBatch.originator) {
            processIssuerPayment(ledgerData, cashflowData, issueBatch, globalFees, owner); // sender is issuer
        }
        else {
            processSubscriberPayment(ledgerData, cashflowData, issueBatch, globalFees, owner); // all other senders
        }
    }

    function processSubscriberPayment(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CashflowStruct storage cashflowData,
        StructLib.SecTokenBatch storage issueBatch,
        StructLib.FeeStruct storage globalFees, address owner
    )
    private {
        // https://medium.com/daox/three-methods-to-transfer-funds-in-ethereum-by-means-of-solidity-5719944ed6e9

        // TODO: restrict msg.value upper bound so no overflow?
        // TODO: events...

        // calculate subscription size
        uint256 qtyTokens = msg.value / cashflowData.args.wei_issuancePrice;

        // send back the difference (modulo) to payer
        uint256 weiChange = msg.value % cashflowData.args.wei_issuancePrice;
        if (weiChange > 0) {
            msg.sender.transfer(weiChange); // ... ### failing revert??
        }

        // room to subscribe in the issuance batch?
        uint256[] storage issuer_stIds = ledgerData._ledger[issueBatch.originator].tokenType_stIds[1]; // single sec-type, ID 1
        require(issuer_stIds.length == 1, "Unexpected cashflow batch originator token count");

        // fwd payment to issuer
        issueBatch.originator.transfer(msg.value - weiChange);

        // transfer tokens to payer
        TransferLib.TransferArgs memory a = TransferLib.TransferArgs({
                ledger_A: issueBatch.originator,
                ledger_B: msg.sender,
                   qty_A: qtyTokens,
           tokenTypeId_A: 1,
                   qty_B: 0,
           tokenTypeId_B: 0,
            ccy_amount_A: 0,
             ccyTypeId_A: 0,
            ccy_amount_B: 0,
             ccyTypeId_B: 0,
               applyFees: false, // TODO: issuance fees (set then clear ledgerFee?)
            feeAddrOwner: owner
        });
        TransferLib.transferOrTrade(ledgerData, globalFees, a);
    }

    function processIssuerPayment(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CashflowStruct storage cashflowData,
        StructLib.SecTokenBatch storage issueBatch,
        StructLib.FeeStruct storage globalFees, address owner
    )
    private {

    }
} 