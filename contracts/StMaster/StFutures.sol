pragma solidity >=0.4.21 <=0.6.6;
pragma experimental ABIEncoderV2;

//import "../Interfaces/IStFutures.sol";

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

BREAKING-ISH: getLedgerEntry / LedgerCcyReturn: balance ==> { balance, reserved, } // HX+admin should limit spot BUYs to (balance-reserved)

TODO: no open of positions on FT types after expiry timestamp - ** must be enforced off-chain ** (a chainlink for block->timestamp mapping could let it be done on-chain)

=========

FUTURES - notes 26/MAR/2020

=== IMPLEMENTATION:

(0) ADD FT
  (0.2) done: needs reference ccy to be assigned also in FT type
(1) OPEN
  (1.1) done: auto-mint both sides +ve / -ve, assign price P into both STs, assign LastMarkPrice (LMP) -1 into both STs - always new STs (NetPositions will collapse them later...)
  (1.2) done: UpdateSetAside: sum MarginRequired for *all* open positions (not just this one!) - write TotalMarginRequired[ccyId] to ledger...
  (1.3) done: initMargin ledger override


(2) SETTLE_JOB (off-chain) - POS-PAIR SETTLER... (caps ITM-pay at OTM-take: delta/default is handled off-chain...)
  (2.1) done: TakeOrPay [2 updates: LMP + CcyBalance] -- use (MP - LMP) or (MP - P) when LMP == -1

  (2.2) >>> NetPositions (auto-burn/shrink) - should only ever be ONE net ST per FT-type after TakeOrPay...

  (2.3) LiquidatePositions

      >> ?? LIQUIDATION ?? -- reserved is currently the *total* across all positions; so liquidation would be *all positions* ???
          i.e. margin call is at account level, or position level? account level easier?!

      >> margin: v1 can apply a simple flat % (e.g. 20%) - reserved margin_required = 20% * notional_size
        e.g. 1000 contracts at $1 price = $1000 notional * 20% = $200 margin_required [reserved amount] -- IT NEVER CHANGES (assuming 20% is same value on each take/pay cycle)
      >> then, after take/pay job has run (and updated cash balance) - if ledger's cash balance < margin_requried either
        (a) margin-call or (b) liquidate

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

abstract // solc 0.6
contract StFutures is Owned,
    //IStFutures,
    StLedger, StFees, StErc20, StPayable {

    function openFtPos(StructLib.FuturesPositionArgs memory a)
    public onlyOwner() onlyWhenReadWrite() {
        FuturesLib.openFtPos(ld, std, ctd, a, owner);
    }

    function setInitMargin_TokType(
        uint256 tokTypeId,
        address ledgerOwner,
        uint16  initMarginBips)
    public onlyOwner() onlyWhenReadWrite() {
        FuturesLib.setInitMargin_TokType(ld, std, ledgerOwner, tokTypeId, initMarginBips);
    }
    
    // SETTLEMENT CYCLE: TakePay + Combine
    function takePay(
        uint256 tokTypeId,
        uint256 short_stId,
        int128  markPrice,
        int256  feePerSide
    ) public onlyOwner() {
        FuturesLib.takePay(ld, std,
          StructLib.TakePayArgs({
             tokTypeId: tokTypeId,
            short_stId: short_stId,
             markPrice: markPrice,
            feePerSide: feePerSide,
          feeAddrOwner: owner
          }));
    }
    function combineFtPos(StructLib.CombinePositionArgs memory a)
    public onlyOwner() {
      FuturesLib.combineFtPos(ld, std, a);
    }

    function getInitMargin(uint256 tokTypeId, address ledgerOwner)
    external view returns (uint16) {
        return ld._ledger[ledgerOwner].ft_initMarginBips[tokTypeId];
    }
}
