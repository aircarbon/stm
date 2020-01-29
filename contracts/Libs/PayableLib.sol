pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";
import "./TransferLib.sol";
//import "./TokenLib.sol";

library PayableLib {
    event IssuanceSubscribed(address indexed subscriber, address indexed issuer, uint256 weiSent, uint256 weiChange, uint256 tokensSubscribed, uint256 weiPrice);

    //
    // TODO: re-entrancy guards, and .call instead of .transfer
    //  https://diligence.consensys.net/blog/2019/09/stop-using-soliditys-transfer-now/
    //

    function setIssuerValues(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CashflowStruct storage cashflowData,
        uint256 wei_currentPrice,
        uint256 cents_currentPrice,
        uint256 qty_saleAllocation
    ) public {
        require(ledgerData._contractSealed, "Contract is not sealed");

        require(ledgerData._batches_currentMax_id == 1, "Bad cashflow request: no minted batch");
        StructLib.SecTokenBatch storage issueBatch = ledgerData._batches[1];

        require(msg.sender == issueBatch.originator, "Bad cashflow request: access denied");

        // qty_saleAllocation is the *cummulative* amount allowable for sale;
        // i.e. it can't be set < the currently sold amount, and it can't be set > the total issuance monobatch size
        StructLib.CashflowStruct memory current = getCashflowData(ledgerData, cashflowData);
        require(qty_saleAllocation <= current.qty_issuanceMax, "Bad cashflow request: qty_saleAllocation too large");
        require(qty_saleAllocation >= current.qty_issuanceSold, "Bad cashflow request: qty_saleAllocation too small");

        // price is either in eth or in usd
        require(cents_currentPrice == 0 && wei_currentPrice > 0 ||
                cents_currentPrice > 0 && wei_currentPrice == 0, "Bad cashflow request: price either in USD or ETH");

        // we require a fixed price for bonds, because price paid is used to determine the interest due;
        // (we could have variable pricing, but only at the cost of copying the price paid into the token structure)
        if (cashflowData.args.cashflowType == StructLib.CashflowType.BOND) {
            if (wei_currentPrice > 0 &&
                ((cashflowData.wei_currentPrice != wei_currentPrice && cashflowData.wei_currentPrice != 0) ||
                 cashflowData.cents_currentPrice > 0)) {
                revert("Bad cashflow request: cannot change price for bond once set");
            }
            if (cents_currentPrice > 0 &&
                (cashflowData.wei_currentPrice > 0 ||
                 (cashflowData.cents_currentPrice != cents_currentPrice && cashflowData.cents_currentPrice != 0))) {
                revert("Bad cashflow request: cannot change price for bond once set");
            }
        }

        cashflowData.qty_saleAllocation = qty_saleAllocation;
        cashflowData.wei_currentPrice = wei_currentPrice;
        cashflowData.cents_currentPrice = cents_currentPrice;
    }

    // v1: multi-sub
    function pay(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CashflowStruct storage cashflowData,
        StructLib.FeeStruct storage globalFees, address owner,
        int256 ethSat_UsdCents
    )
    public {
        require(ledgerData.contractType == StructLib.ContractType.CASHFLOW, "Bad commodity request");
        require(ledgerData._contractSealed, "Contract is not sealed");
        require(ledgerData._batches_currentMax_id == 1, "Bad cashflow request: no minted batch");
        require(cashflowData.wei_currentPrice > 0 || cashflowData.cents_currentPrice > 0, "Bad cashflow request: no price set");
        require(cashflowData.wei_currentPrice == 0 || cashflowData.cents_currentPrice == 0, "Bad cashflow request: ambiguous price set");
        if (cashflowData.cents_currentPrice > 0) require(ethSat_UsdCents > 0, "Bad cashflow request: the end is nigh");

        // get issuer
        StructLib.SecTokenBatch storage issueBatch = ledgerData._batches[1];

        // process payment
        if (msg.sender == issueBatch.originator) {
            //processIssuerPayment(ledgerData, cashflowData, issueBatch, globalFees, owner); // sender is issuer
        }
        else {
            processSubscriberPayment(ledgerData, cashflowData, issueBatch, globalFees, owner, ethSat_UsdCents); // all other senders
        }
    }

    function processSubscriberPayment(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CashflowStruct storage cashflowData,
        StructLib.SecTokenBatch storage issueBatch,
        StructLib.FeeStruct storage globalFees, address owner,
        int256 ethSat_UsdCents
    )
    private {
        require(cashflowData.qty_saleAllocation > 0, "Bad cashflow request: nothing for sale");

        // TODO: restrict msg.value upper bound so no overflow?

        uint256 weiPrice;
        if (cashflowData.wei_currentPrice > 0) {
            weiPrice = cashflowData.wei_currentPrice;
        }
        else {
            uint256 eth_UsdCents = uint256(ethSat_UsdCents) / 1000000;
            weiPrice = (cashflowData.cents_currentPrice * 1000000000000000000) / eth_UsdCents;
        }

        // calculate subscription size
        uint256 qtyTokens = msg.value / weiPrice; //cashflowData.wei_currentPrice;
        require(cashflowData.qty_saleAllocation >= qtyTokens, "Bad cashflow request: insufficient quantity for sale");

        // send back the change to payer
        uint256 weiChange = msg.value % weiPrice; //cashflowData.wei_currentPrice;
        if (weiChange > 0) {
            msg.sender.transfer(weiChange);
        }

        // fwd payment to issuer
        issueBatch.originator.transfer(msg.value - weiChange);

        // transfer tokens to payer
        if (qtyTokens > 0) {
            StructLib.TransferArgs memory a = StructLib.TransferArgs({
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

        emit IssuanceSubscribed(msg.sender, issueBatch.originator, msg.value, weiChange, qtyTokens, weiPrice);
    }

    /*
        FIXED ISSUANCE / ONGOING SALE MODEL

        I = Issuer - minted to I's account initially
        B# = amount minted in batch; total is fixed - no subsequent issuances
            S# = amount currently sold (subscribed) from B#
            I# = amount of B# remaining with issuer (B# - S#)

        args: P = price [EQUITY can edit, write-once for BOND]
              R = rate [only for BOND]
             SQ = sale quantity [EQUITY and BOND can edit]

        Issuer can at any time set SQ to 0 to stop ongoing sale.
        Issuer can at any time set SQ to any value <= I# - offers some or all of his holdings to the market.
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
        //uint256 p = cashflowData.wei_currentPrice;

        // TODO: fees
        // uint256 fee = ...
        // owner.transfer(msg.fee);
        // uint256 msgValueExFees = msg.value - fee
        //...

        // TODO: events...

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

        if (ledgerData.contractType == StructLib.ContractType.CASHFLOW) {
            if (ledgerData._batches_currentMax_id == 1) {
                StructLib.SecTokenBatch storage issueBatch = ledgerData._batches[1]; // CFT: uni-batch
                uint256[] storage issuer_stIds = ledgerData._ledger[issueBatch.originator].tokenType_stIds[1]; // CFT: uni-type
                StructLib.PackedSt storage issuerSt = ledgerData._sts[issuer_stIds[0]];
                ret.qty_issuanceMax = issueBatch.mintedQty;
                ret.qty_issuanceRemaining = issuerSt.currentQty;
                ret.qty_issuanceSold = issueBatch.mintedQty - issuerSt.currentQty;
            }
        }
        return ret;
    }
}