pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";
import "./TransferLib.sol";

library PayableLib {
    event IssuanceSubscribed(address indexed subscriber, address indexed issuer, uint256 weiSent, uint256 weiChange, uint256 tokensSubscribed);

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
        // TODO: restrict msg.value upper bound so no overflow?

        // calculate subscription size
        uint256 qtyTokens = msg.value / cashflowData.args.wei_issuancePrice;

        // send back the difference (modulo) to payer
        uint256 weiChange = msg.value % cashflowData.args.wei_issuancePrice;
        if (weiChange > 0) {
            msg.sender.transfer(weiChange);
        }

        // room to subscribe in the issuance batch?
        // todo: multi-issuance: todo - walk all STs...
        uint256[] storage issuer_stIds = ledgerData._ledger[issueBatch.originator].tokenType_stIds[1]; // single sec-type, ID 1
        require(issuer_stIds.length == 1, "Unexpected cashflow batch originator token count");
        StructLib.PackedSt storage issuerSt = ledgerData._sts[issuer_stIds[0]];
        require(issuerSt.currentQty >= qtyTokens, "Insufficient remaining issuance");

        // fwd payment to issuer
        issueBatch.originator.transfer(msg.value - weiChange);

        // transfer tokens to payer
        if (qtyTokens > 0) {
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
                   applyFees: false,
                feeAddrOwner: owner
            });
            TransferLib.transferOrTrade(ledgerData, globalFees, a);
        }

        // todo: issuance fees (set then clear ledgerFee?)
        // todo: record subscribers? or no need - only care about holders? (ledgers != issuer)

        emit IssuanceSubscribed(msg.sender, issueBatch.originator, msg.value, weiChange, qtyTokens);
    }

    function processIssuerPayment(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CashflowStruct storage cashflowData,
        StructLib.SecTokenBatch storage issueBatch,
        StructLib.FeeStruct storage globalFees, address owner
    )
    private {

    }

    function getCashflowData(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CashflowStruct storage cashflowData
    )
    public view returns(StructLib.CashflowStruct memory) {
        StructLib.CashflowStruct memory ret = cashflowData;
        if (ledgerData._batches_currentMax_id == 1) { // todo: multi-issuance: todo - walk all STs...
            StructLib.SecTokenBatch storage issueBatch = ledgerData._batches[1];
            uint256[] storage issuer_stIds = ledgerData._ledger[issueBatch.originator].tokenType_stIds[1];
            StructLib.PackedSt storage issuerSt = ledgerData._sts[issuer_stIds[0]];
            ret.qty_issuanceMax = issueBatch.mintedQty; //issuerSt.mintedQty; // ### gets dec'd when split by design
            ret.qty_issuanceRemaining = issuerSt.currentQty;
        }
        return ret;
    }
}