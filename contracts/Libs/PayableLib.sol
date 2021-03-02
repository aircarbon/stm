// Author: https://github.com/7-of-9
// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.4.21 <=0.7.1;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";
import "../Interfaces/IChainlinkAggregator.sol";

import "./TransferLib.sol";

import "./SafeMath.sol";

library PayableLib {
    using SafeMath for uint256;

    event IssuanceSubscribed(address indexed subscriber, address indexed issuer, uint256 weiSent, uint256 weiChange, uint256 tokensSubscribed, uint256 weiPrice);

    event IssuerPaymentBatchProcessed(uint256 indexed paymentId, address indexed issuer, uint256 weiSent, uint256 weiChange, uint256 batchProcessedAmount, uint256 tokTypeId);

    event IssuerPaymentProcessed(uint256 paymentId, address indexed issuer, address indexed subscriber, uint256 sharePercentage, uint256 shareWei);
    event dbg1(uint256 paymentId, address indexed issuer, string cashflowType, uint256 totalOwners, uint64 count);
    event dbg2(address indexed issuer, address indexed subscriber, string debugMsg, uint256 currentIndex, uint256 stIdCount);
    event dbg3(uint256 paymentId, address indexed issuer, address indexed subscriber, uint256 sharePercentage, uint256 shareWei);

    function get_chainlinkRefPrice(address chainlinkAggAddr) public view returns(int256) {
        //if (chainlinkAggAddr == address(0x0)) return 100000000; // $1 - cents*satoshis
        if (chainlinkAggAddr == address(0x0)) return -1;
        IChainlinkAggregator ref = IChainlinkAggregator(chainlinkAggAddr);
        return ref.latestAnswer();
    }

    //
    // TODO: re-entrancy guards, and .call instead of .transfer
    //  https://diligence.consensys.net/blog/2019/09/stop-using-soliditys-transfer-now/
    //

    function setIssuerValues(
        StructLib.LedgerStruct storage ld,
        StructLib.CashflowStruct storage cashflowData,
        uint256 wei_currentPrice,
        uint256 cents_currentPrice,
        uint256 qty_saleAllocation,
        address owner
    ) public {
        require(ld._contractSealed, "Contract is not sealed");

        require(ld._batches_currentMax_id == 1, "Bad cashflow request: no minted batch");
        StructLib.SecTokenBatch storage issueBatch = ld._batches[1]; // CFT: uni-batch

        require(msg.sender == issueBatch.originator || msg.sender == owner, "Bad cashflow request: access denied");

        // qty_saleAllocation is the *cummulative* amount allowable for sale;
        // i.e. it can't be set < the currently sold amount, and it can't be set > the total issuance uni-batch size
        StructLib.CashflowStruct memory current = getCashflowData(ld, cashflowData);
        require(qty_saleAllocation <= current.qty_issuanceMax, "Bad cashflow request: qty_saleAllocation too large");
        require(qty_saleAllocation >= current.qty_issuanceSold, "Bad cashflow request: qty_saleAllocation too small");

        // price is either in eth or in usd
        require(cents_currentPrice == 0 && wei_currentPrice > 0 || cents_currentPrice > 0 && wei_currentPrice == 0, "Bad cashflow request: price either in USD or ETH");

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
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        StructLib.CcyTypesStruct storage ctd,
        StructLib.CashflowStruct storage cashflowData,
        StructLib.FeeStruct storage globalFees, address owner,
        int256 ethSat_UsdCents,
        int256 bnbSat_UsdCents
    )
    public {
        require(ld.contractType == StructLib.ContractType.CASHFLOW_BASE, "Bad commodity request");
        require(ld._contractSealed, "Contract is not sealed");
        require(ld._batches_currentMax_id == 1, "Bad cashflow request: no minted batch");
        require(cashflowData.wei_currentPrice > 0 || cashflowData.cents_currentPrice > 0, "Bad cashflow request: no price set");
        require(cashflowData.wei_currentPrice == 0 || cashflowData.cents_currentPrice == 0, "Bad cashflow request: ambiguous price set");
        if (cashflowData.cents_currentPrice > 0) {
            require(ethSat_UsdCents != -1 || bnbSat_UsdCents != -1, "Bad usd/{eth|bnb} rate");
        }
        // get issuer
        StructLib.SecTokenBatch storage issueBatch = ld._batches[1];
        require(msg.sender != issueBatch.originator, "Issuer cannot subscribe");
        
        processSubscriberPayment(ld, std, ctd, cashflowData, issueBatch, globalFees, owner, ethSat_UsdCents, bnbSat_UsdCents);
    }

    struct ProcessPaymentVars {
        uint256 weiPrice;
        uint256 qtyTokens;
        uint256[] issuer_stIds; //storage
        StructLib.PackedSt issuerSt; //storage
        //uint256 qtyIssuanceSold;
        uint256 weiChange;
    }
    function processSubscriberPayment(
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        StructLib.CcyTypesStruct storage ctd,
        StructLib.CashflowStruct storage cashflowData,
        StructLib.SecTokenBatch storage issueBatch,
        StructLib.FeeStruct storage globalFees,
        address owner,
        int256 ethSat_UsdCents,
        int256 bnbSat_UsdCents
    )
    private {
        ProcessPaymentVars memory v;

        require(cashflowData.qty_saleAllocation > 0, "Nothing for sale");

        // TODO: restrict msg.value upper bound so no overflow?

        //uint256 weiPrice;
        if (cashflowData.wei_currentPrice > 0) {
            v.weiPrice = cashflowData.wei_currentPrice;
        }
        else {
            require(ethSat_UsdCents != -1 || bnbSat_UsdCents != -1, "Bad usd/{eth|bnb} rate");
            if (ethSat_UsdCents != -1) { // use uth/usd rate (ETH Ropsten, mainnet)
                //uint256 eth_UsdCents = uint256(ethSat_UsdCents).div(1000000);
                v.weiPrice = (cashflowData.cents_currentPrice.mul(1000000000000000000)).mul(1000000).div(uint256(ethSat_UsdCents));
            }
            else if (bnbSat_UsdCents != -1) { // use bnb/usd rate (BSC Mainnet 56 & Testnet 97)
                //uint256 bnb_UsdCents = uint256(bnbSat_UsdCents).div(1000000);
                v.weiPrice = (cashflowData.cents_currentPrice.mul(1000000000000000000)).mul(1000000).div(uint256(bnbSat_UsdCents));
            }
        }
        require(msg.value > 0, "Bad msg.value");
        require(v.weiPrice > 0, "Bad computed v.weiPrice");

        // calculate subscription size
        //v.qtyTokens = msg.value / v.weiPrice; // ## explicit round DOWN
        v.qtyTokens = msg.value.div(v.weiPrice); // ## explicit round DOWN

        // check sale allowance is not exceeded
        v.issuer_stIds = ld._ledger[issueBatch.originator].tokenType_stIds[1]; // CFT: uni-type
        v.issuerSt = ld._sts[v.issuer_stIds[0]];
        //v.qtyIssuanceSold = uint256(issueBatch.mintedQty).sub(uint256(v.issuerSt.currentQty)); // ##
        require(cashflowData.qty_saleAllocation >= 
            cashflowData.qty_issuanceSold //v.qtyIssuanceSold 
            + v.qtyTokens, "Bad cashflow request: insufficient quantity for sale");

        // send change back to payer
        //v.weiChange = (msg.value % v.weiPrice); // explicit remainder -- keep 10 Wei in the contract, tryfix...
        v.weiChange = (msg.value.mod(v.weiPrice)); // explicit remainder -- keep 10 Wei in the contract, tryfix...
        if (v.weiChange > 0) {
            msg.sender.transfer(v.weiChange);
        }

        // fwd payment to issuer
        //issueBatch.originator.transfer(msg.value - v.weiChange);
        issueBatch.originator.transfer(msg.value.sub(v.weiChange));

        // transfer tokens to payer
        if (v.qtyTokens > 0) {
            StructLib.TransferArgs memory a = StructLib.TransferArgs({
                    ledger_A: issueBatch.originator,
                    ledger_B: msg.sender,
                       qty_A: v.qtyTokens,
                   k_stIds_A: new uint256[](0),
                 tokTypeId_A: 1,
                       qty_B: 0,
                   k_stIds_B: new uint256[](0),
                 tokTypeId_B: 0,
                ccy_amount_A: 0,
                 ccyTypeId_A: 0,
                ccy_amount_B: 0,
                 ccyTypeId_B: 0,
                   applyFees: false,
                feeAddrOwner: owner,
                transferType: StructLib.TransferType.Subscription
            });
            TransferLib.transferOrTrade(ld, std, ctd, globalFees, a);
            cashflowData.qty_issuanceSold += v.qtyTokens;
        }

        // todo: issuance fees (set then clear ledgerFee?)
        // todo: record subscribers? or no need - only care about holders? (ledgers != issuer)

        emit IssuanceSubscribed(msg.sender, issueBatch.originator, msg.value, v.weiChange, v.qtyTokens, v.weiPrice);
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

    struct ProcessIssuerPaymentBatchVars {
        uint256 amountSubscribed;
        uint256 initAddrNdx;
        uint256 addrNdx;
        uint256 stNdx;
        uint256 sharePercentage;
        uint256 shareWei;
        uint256 batchProcessedAmount;
        uint256 weiChange;
    }

    // TODO: ### caller needs to be able to specify a batch / offset (~5m gas / ~23k transfer per holder ~= 250 max holders!!)

    function issuerPay(
        uint256 paymentId,
        uint64 count,
        StructLib.IssuerPaymentsStruct storage ipd,
        StructLib.LedgerStruct storage ld,
        StructLib.CashflowStruct storage cashflowData
    )
    public {
        // TODO: restrict msg.value upper bound so no overflow -- esp. wrt. precision hack below!!

        require(ld.contractType == StructLib.ContractType.CASHFLOW_BASE, "Bad commodity request");
        require(ld._contractSealed, "Contract is not sealed");
        require(ld._batches_currentMax_id == 1, "Bad cashflow request: no minted batch");
        require(msg.value <= (2 ** 128), 'Amount must be less than 2^128'); // stop any overflows
        require(paymentId > 0, "Invalid paymentId");
        require(count > 0, "Invalid count");
        // require(cashflowData.wei_currentPrice > 0 || cashflowData.cents_currentPrice > 0, "Bad cashflow request: no price set");
        // require(cashflowData.wei_currentPrice == 0 || cashflowData.cents_currentPrice == 0, "Bad cashflow request: ambiguous price set");
        
        // get issuer
        StructLib.SecTokenBatch storage issueBatch = ld._batches[1];  // CFT: uni-batch
        require(msg.sender == issueBatch.originator, "Issuer payments: only by issuer");

        // validate count
        require(count + ipd.issuerPayments[paymentId].curNdx <= ld._ledgerOwners.length, 'Count must be < remaining token holders in the payment batch');

        // disallow extra payments
        require(ipd.issuerPayments[paymentId].paymentProcessedAmount <= ipd.issuerPayments[paymentId].paymentTotalAmount, 'Extra payment(s) have been processed');
        
        // validate current payments
        if (ipd.issuerPayments[paymentId].paymentTotalAmount > 0 && ipd.issuerPayments[paymentId].curNdx > 0 && (ipd.issuerPayments[paymentId].paymentProcessedAmount == ipd.issuerPayments[paymentId].paymentTotalAmount)) { // if existing payment
            revert('All payments for this payment ID have been processed');
        }

        // initialize new payment
        if (ipd.issuerPayments[paymentId].curNdx == 0) { // if new payment
            require(ipd.issuerPayments[paymentId].paymentTotalAmount == 0, 'Duplicate payment ID found');
            ipd.issuerPayments[paymentId].paymentTotalAmount = msg.value; // caller should pass the entire payment amount on the first batch of a new payment
        }

        ProcessIssuerPaymentBatchVars memory ipv;

        uint256[] storage issuer_stIds = ld._ledger[issueBatch.originator].tokenType_stIds[1];
        StructLib.PackedSt storage issuerSt = ld._sts[issuer_stIds[0]];

        ipv.amountSubscribed = uint256(issueBatch.mintedQty) - uint256(issuerSt.currentQty); // ## breaks when we do transfers from the issuer ??

        if (cashflowData.args.cashflowType == StructLib.CashflowType.BOND) {
            // TODO: calc/switch interest vs. principal repayment...?
            // TODO: calc requiredQty; require qty >= required: need a concept of last paid block, and interest due per block? i.e. per ~15s interest interval!
            // walk all ST IDs except issuerSt...
            // pay (ST qty / S) * (msg.value - fee)...

            // Example: Count

            emit dbg1(paymentId, issueBatch.originator, "BOND", ld._ledgerOwners.length, count);

            ipv.initAddrNdx = ipd.issuerPayments[paymentId].curNdx;

            for (ipv.addrNdx = ipv.initAddrNdx; ipv.addrNdx < ipv.initAddrNdx + count ; ipv.addrNdx++) {
                address payable addr = address(uint160(ld._ledgerOwners[ipv.addrNdx]));  
                
                if (addr != issueBatch.originator) { // exclude issuer from payments
                    uint256[] storage stIds = ld._ledger[addr].tokenType_stIds[1];

                    emit dbg2(issueBatch.originator, addr, "holder is not originator", ipd.issuerPayments[paymentId].curNdx, stIds.length);

                    for (ipv.stNdx = 0; ipv.stNdx < stIds.length; ipv.stNdx++) {
                        ipv.sharePercentage = ipv.amountSubscribed * 1000000 /*precision*/ / uint256(ld._sts[stIds[ipv.stNdx]].currentQty);
                        ipv.shareWei = ipd.issuerPayments[paymentId].paymentTotalAmount * 1000000 /*precision*/ / ipv.sharePercentage;

                        // TODO: re-entrancy guards, and .call instead of .transfer
                        addr.transfer(ipv.shareWei);

                        // save payment history
                        ipv.batchProcessedAmount += ipv.shareWei;
                        ipd.issuerPayments[paymentId].paymentProcessedAmount += ipv.shareWei; 
                        emit IssuerPaymentProcessed(paymentId, issueBatch.originator, addr, ipv.sharePercentage, ipv.shareWei);
                    }
                }
                ipd.issuerPayments[paymentId].curNdx++;
            }
            ipv.weiChange = (msg.value.sub(uint256(ipv.batchProcessedAmount)));
            if (ipv.weiChange > 0) {
                msg.sender.transfer(ipv.weiChange);
            }
            emit IssuerPaymentBatchProcessed(paymentId, msg.sender, msg.value, ipv.weiChange, ipv.batchProcessedAmount, issueBatch.tokTypeId);
        }
        else if (cashflowData.args.cashflowType == StructLib.CashflowType.EQUITY) {
            // TODO: Dividend Payments
        }
        else revert("Unexpected cashflow type");
    }

    // Method to retrieve Issuer Payments History

    // function getIssuerPayments(
    //     StructLib.IssuerPayments storage issuerPaymentsData
    // )
    // public view returns(StructLib.IssuerPayments memory) {
    //     StructLib.IssuerPayments memory ret = issuerPaymentsData;
    //     return ret;
    // }

    //
    // TODO: edit SQ, edit P
    // issueBatch.originator only...
    //...

    function getCashflowData(
        StructLib.LedgerStruct storage ld,
        StructLib.CashflowStruct storage cashflowData
    )
    public view returns(StructLib.CashflowStruct memory) {
        StructLib.CashflowStruct memory ret = cashflowData;

        if (ld.contractType == StructLib.ContractType.CASHFLOW_BASE) {
            if (ld._batches_currentMax_id == 1) {
                StructLib.SecTokenBatch storage issueBatch = ld._batches[1]; // CFT: uni-batch
                uint256[] storage issuer_stIds = ld._ledger[issueBatch.originator].tokenType_stIds[1]; // CFT: uni-type
                StructLib.PackedSt storage issuerSt = ld._sts[issuer_stIds[0]];
                ret.qty_issuanceMax = issueBatch.mintedQty;

                ret.qty_issuanceRemaining = uint256(issuerSt.currentQty); 

                // ## this fails if tokens are transferred out from the issuer (demo flow)
                // instead, we udpate this field directly on each issuance sale
                //ret.qty_issuanceSold = uint256(issueBatch.mintedQty) - uint256(issuerSt.currentQty); 

                ret.issuer = issueBatch.originator;
            }
        }
        return ret;
    }

    function getIssuerPayments(
        StructLib.IssuerPaymentBatchStruct storage issuerPaymentBatchData
    )
    public pure returns(StructLib.IssuerPaymentBatchStruct memory) {
        StructLib.IssuerPaymentBatchStruct memory ret = issuerPaymentBatchData;
        return ret;
    }
}