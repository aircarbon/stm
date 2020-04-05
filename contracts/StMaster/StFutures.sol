pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/IStFutures.sol";

import "./Owned.sol";
import "./StLedger.sol";
import "./StFees.sol";
import "./StErc20.sol";
import "./StPayable.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/FuturesLib.sol";
import "../Libs/Erc20Lib.sol";
import "../Libs/LedgerLib.sol";

/*

BREAKING: getLedgerEntry / LedgerCcyReturn: balance ==> { balance, reserved, } // HX+admin should limit spot BUYs to (balance-reserved)

TODO: no open of positions on FT types after expiry timestamp - ** must be enforced off-chain ** (a chainlink for block->timestamp mapping could let it be done on-chain)

====

FUTURES - notes 26/MAR/2020

(1) new token-type: JUL_28_2020, AUG_28_2020, etc., i.e. rolling/continuously added -- > and with an expiry date <
    // done: add timestamp to tok-type, for expiry datetime
    // done: add deriv-of param for FT tok-type... i.e. UNDERLYER... (mus be a SPOT tok-type)
(2) done: token-type gets flag: SPOT || FUTURE

(3) token-type FUTURE can be short sold, i.e. -ve tokenQty would be ok
   // done: refactor ST internals to allow -ve qty (inc. bounds check[s] changes)

   >> STs would "auto-mint" on position opening -- price would be a property of the ST ...
        (no "swap" of STs/ccy would take place: a -ve qty ST would balance out a +ve qty ST on the other side (same priced ST -ve qty)... NOT A "TRADE")

   >> same ledger: can be long FT1 and short FT1 at same time, with different prices
   optimization: if both positions are processed (taken/paid) then they can be netted solely on the basis of qty -
     i.e. entry_price is ONLY relevant on the FIRST take/pay cycle...

   >> margin: v1 can apply a simple flat % (e.g. 20%) - reserved margin_required = 20% * notional_size
   e.g. 1000 contracts at $1 price = $1000 notional * 20% = $200 margin_required [reserved amount] -- IT NEVER CHANGES (assuming 20% is same value on each take/pay cycle)

   >> then, after take/pay job has run (and updated cash balance) - if ledger's cash balance < margin_requried either (a) margin-call or (b) liquidate

=== IMPLEMENTATION:

(0) ADD FT
  (0.2) done: needs reference ccy to be assigned also in FT type
(1) OPEN
  (1.1) done: auto-mint both sides +ve / -ve, assign price P into both STs, assign LastMarkPrice (LMP) -1 into both STs - always new STs (NetPositions will collapse them later...)
  (1.2) WIP/TODO: UpdateSetAside: sum MarginRequired for *all* open positions (not just this one!) - write TotalMarginRequired[ccyId] to ledger...

(2) MARK (param: ftTypeId, MarkPrice [MP]) -- SettleFutures()
  (2.1) TakeOrPay [2 updates: LMP + Ccy] - use (MP - LMP) or (MP - P) when LMP == -1
  (2.2) NetPositions (auto-burn/shrink) - should only ever be ONE net ST per FT-type after TakeOrPay
  (2.3) LiquidatePositions

 >> JS test framework, with various price series and event series (position opens/closes)

===

(4) "open interest" = when first trade done on FUTURE token-type
(5) trade mechancics are same as CASH token-type, except that:
  (a) "initial margin" e.g. 7% is required (statutory requirement)
  (b) "variation margin" e.g. 10% is required in top (exchange VAR/vol based additional protection)
  (c) can be sold short

(6) initial_margin + variation_margin (for all open positions) = "locked_balance" --> new concept
(7) avail_balance = balance - locked_balance --> new concept

(8) "clearing" = any post-trade activity, i.e. includes "margin maintenance"
(9) margin maintenance - ideally continuous, but e.g. 2-3 times per day:
  (a) recalculate var_margin on all open positions
  (b) handle margin_call, e.g. margin < init_margin + var_margin / 2
  (c) handle margin_liquidation e.g. margin < init_margin

  (d) "take or pay" for each open position/trade:
     * get current "reference price" = P0
     * P1 = last ref price used for the position/trade OR entry price of the position/trade (if first time being marked for take or pay)
     * delta D_REF = P0 - P1 = "take or pay" amount
     * then add/sub D_REF from the cash balance
     * the net/net D_REF across all open positions should be zero (each trade has a corresponding counter-trade)

>> NEED POSITION MANAGEMENT, i.e. list of open positions
>> NEED TRADE-LEVEL DATA, i.e. entry price for each trade of each position

>> COULD KEEP BOTH IN CONTRACT DATA, IF WE PURGE AFTER POSITION CLOSE? (events would give the historic values?)
*/

contract StFutures is Owned,
    IStFutures,
    StLedger, StFees, StErc20, StPayable {

    function openFtPos(StructLib.FuturesPositionArgs memory a)
    public onlyOwner() onlyWhenReadWrite() {
      FuturesLib.openFtPos(ledgerData, stTypesData, ccyTypesData, globalFees, a);
    }
}
