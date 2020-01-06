pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";
import "./TransferLib.sol";

library PayableLib {
    event IssuanceSubscribed(address indexed subscriber, address indexed issuer, uint256 weiSent, uint256 weiChange, uint256 tokensSubscribed);

    //
    // TODO: re-entrancy guards, and .call instead of .transfer
    //  https://diligence.consensys.net/blog/2019/09/stop-using-soliditys-transfer-now/
    //

    // v1: multi-sub (+multi-issue...?)
    function pay(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CashflowStruct storage cashflowData,
        StructLib.FeeStruct storage globalFees, address owner
    )
    public {
        require(ledgerData._contractSealed, "Contract is not sealed");

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
        // TODO: restrict msg.value upper bound so no overflow

        // calculate subscription size
        uint256 qtyTokens = msg.value / cashflowData.args.wei_issuancePrice;

        // send back the difference (modulo) to payer
        uint256 weiChange = msg.value % cashflowData.args.wei_issuancePrice;
        if (weiChange > 0) {
            msg.sender.transfer(weiChange);
        }

        // room to subscribe in the issuance batch?
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

    /*
        FIXED ISSUANCE / ONGOING SALE MODEL

        I = Issuer - minted to I's account initially
        B# = amount minted in batch; total is fixed forever! no subsequent issuances
            S# = amount currently sold (subscribed) from B#
            I# = amount of B# remaining with issuer (B# - S#)

        args: P = price [EQUITY can edit, read-only for BOND]
              R = rate [only for BOND]
             SQ = sale quantity [EQUITY and BOND can edit]

        Issuer can at any time set SQ to 0 to stop ongoing sale.
        Issuer can at any time set SQ to any value <= I# to offer some or all of his holdings to the market.
        EQUITY Issuer can at any time set P to a higher or lower value - equivalent to a valuation up or down round.

        if (BOND) { // interest payments... (todo - principal repayments...)
            reject if Qty < required
                (required = S# * P * R) // P is fixed for BOND for this reason
            pro rata over S# // i.e. only paid-up bond holders receive
        }
        if (EQUITY) { // dividend payments...
            accept any amount!
            pro rata over S# && I# // i.e. equity issuer receives pro-rata on the unsold portion of B#
        }
    */

    //
    // TODO: ### caller needs to be able to specify a batch / offset (~5m gas / ~23k transfer per holder ~= 250 max holders!!)
    //
    function processIssuerPayment(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CashflowStruct storage cashflowData,
        StructLib.SecTokenBatch storage issueBatch,
        StructLib.FeeStruct storage globalFees, address owner
    )
    private {
        // TODO: restrict msg.value upper bound so no overflow -- esp. wrt. precision hack below!!

        uint256[] storage issuer_stIds = ledgerData._ledger[issueBatch.originator].tokenType_stIds[1];
        StructLib.PackedSt storage issuerSt = ledgerData._sts[issuer_stIds[0]];

        //address payable I = issueBatch.originator;
        uint256 B = issueBatch.mintedQty;
        uint256 I = issuerSt.currentQty;
        uint256 S = B - I;
        //uint256 r = cashflowData.args.bond_bps;
        //uint256 p = cashflowData.args.wei_issuancePrice;

        // TODO: fees
        // uint256 fee = ...
        // owner.transfer(msg.fee);
        // uint256 msgValueExFees = msg.value - fee
        //...

        if (cashflowData.args.cashflowType == StructLib.CashflowType.BOND) {
            // TODO: calc/switch interest vs. principal repayment...?
            // TODO: calc requiredQty; require qty >= required: need a concept of last paid block, and interest due per block? i.e. per ~15s interest interval!

            // walk all ST IDs except issuerSt...
            // pay (ST qty / S) * (msg.value - fee)...
            for (uint256 addrNdx = 0; addrNdx < ledgerData._ledgerOwners.length; addrNdx++) {
                address payable addr = address(uint160(ledgerData._ledgerOwners[addrNdx]));
                if (addr != issueBatch.originator) {
                    StructLib.Ledger storage ledger = ledgerData._ledger[addr];
                    uint256[] storage stIds = ledger.tokenType_stIds[1];
                    for (uint256 stNdx = 0; stNdx < stIds.length; stNdx++) {
                        StructLib.PackedSt storage st = ledgerData._sts[stIds[stNdx]];

                        uint256 sharePerc = S * 1000000/*precision*/ / st.currentQty;
                        uint256 shareWei = msg.value * 1000000/*precision*/ / sharePerc;

                        addr.transfer(shareWei);
                    }
                }
            }
        }
        else if (cashflowData.args.cashflowType == StructLib.CashflowType.EQUITY) {
            // TODO: ...
        }
        else revert("Unexpected cashflow type");
    }

    //
    // TODO: edit SQ, edit P
    // issueBatch.originator only...
    //...

    function getCashflowData(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CashflowStruct storage cashflowData
    )
    public view returns(StructLib.CashflowStruct memory) {
        StructLib.CashflowStruct memory ret = cashflowData;
        if (ledgerData._batches_currentMax_id == 1) {
            StructLib.SecTokenBatch storage issueBatch = ledgerData._batches[1];
            uint256[] storage issuer_stIds = ledgerData._ledger[issueBatch.originator].tokenType_stIds[1];
            StructLib.PackedSt storage issuerSt = ledgerData._sts[issuer_stIds[0]];
            ret.qty_issuanceMax = issueBatch.mintedQty;
            ret.qty_issuanceRemaining = issuerSt.currentQty;
        }
        return ret;
    }
}