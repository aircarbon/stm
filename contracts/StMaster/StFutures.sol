// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity ^0.8.0;

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

=== IMPLEMENTATION:

  PAUSED: Thom, Bill & Tom review 29th Apr ...
  ================================
     (done: FT fees per contract --> account level override)
     (done: unrealizedPL ---> new field in PackedSt: just inc/dec on each settlement cycle... (probably *needed* for position-level liquiation))

  >>> TODO: intra-day risk management --> need to be able to alter var-margin intraday, and recalc margins on all open positions <-- [i.e. triggering margin calls in response to market vol]
       >>> must be a job: setFuture_VariationMargin() on product, then must recalc margin/reserve on all open positions: NEW METHOD <<<

  >>> TODO: liquidation v1 -- *account level* ==>
      >> LiquidateAccount(addr)
         // move ALL THE POSITIONS to central (!) ...
              (1) here, it "awaits replacement" from the order book (liquidation v2) -- probably gets deleted central when it's successfully replaced
              (2) here, the pos does *not* participate in takePay any more: ITMs are short their dues, until/unless the is REPLACED
         // move ALL THE CASH to central (!!) ...

  >>> (better/later?) liquidaton v2 ??? --> *per position* --> need a sane algo to walk position and determine which ones to liquidate...?
       >> LiquidatePos(posId) { 
         // move the single position to central... (as above, awaits replacement, no longer pays out or receives)
         // move JUST THE RESERVE CASH AMOUNT *for that position* to central ... >> BUT MOVE HOW MUCH?? impossible to know how much is remaining "due to that position"
              ?? could move init_margin ... it's a known amount ???
              ?? or use the position PL value to calc how much is remaining of its init+var ???

==================================

FUTURES - notes 26/MAR/2020

done: 

(0) ADD FT
  (0.2) done: needs reference ccy to be assigned also in FT type
(1) OPEN
  (1.1) done: auto-mint both sides +ve / -ve, assign price P into both STs, assign LastMarkPrice (LMP) -1 into both STs - always new STs (NetPositions will collapse them later...)
  (1.2) done: UpdateSetAside: sum MarginRequired for *all* open positions (not just this one!) - write TotalMarginRequired[ccyId] to ledger...
  (1.3) done: initMargin ledger override


(2) SETTLE_JOB (off-chain) - POS-PAIR SETTLER... (caps ITM-pay at OTM-take: delta/default is handled off-chain...)
  (2.1) done: TakeOrPay [2 updates: LMP + CcyBalance] -- use (MP - LMP) or (MP - P) when LMP == -1
  (2.2) done: Combine (auto-burn/shrink) - should only ever be ONE net ST per FT-type after TakeOrPay
  (2.3) done: ReCalc margin - on openFtPos

 old: 

  ***** BIFURFACTION POINT: ARE WE CCP, I.E. GUARANTEEING ITM PAYOUTS? if *NOT* then probably don't need to liquidate positions at all ?! *****
    if going with "capped futures" then for sure we want a single simple view of "TOTAL LONG RESERVE LIQUIDITY" vs "TOTAL SHORT RESERVE LIQUIDITY"
    AND a view of how much is ahead of us in the queue for payout...

  (2.4) LiquidatePositions...??
      done vs delta: this captures LIQUIDATED POSITION OBLIGATIONS (ITM side to be made whole somehow off-chain...)
      >>> i.e. LIQUIDATION is a NOP...! POSITIONS STAY OPEN AND OUTPUT { DONE=0, DELTA=X }...
      then, all that remains (?) is for (post-takePay, all positions) to look at which positions have balace < reserved: these are in margin-call territory...

      ExPit == moving liquidated position to us, for temporary/replacement purposes

    PREFERRED... (SIMPLER, ELEGANT)
      they would STAY OPEN, and deplete cash all the way to zero... (done/delta starts diverging) ... 
        >> THEN MUST DEPLETE ACCOUNT CASH INTO **NEGATIVE VALUES** (keeps track of what they owe, in effect) <<
        >> -VE CASH REPRESENTS ** ACCOUNT LEVEL LIQUIDATION ** <<
        OTM POSITION/ACCOUNT CAN THEN "RECOVER", (from -ve balance into +ve) IF MARKET DIRECTION CHANGES

      if not this, then a flag on PackedSt (liquidated, bool) ==>
        (1) gets set on positions in some ordering, when (account_balance < account_reserved * 0.5)
        (2) when set on a position, prevents the position every accumulating any ITM wins - it still produces OTM take values and outputs via delta/done

      >> ?? LIQUIDATION ?? -- reserved is currently the *total* across all positions; so liquidation would be *all positions* ???
          i.e. margin call is at account level, or position level? account level easier?!

      >> margin: v1 can apply a simple flat % (e.g. 20%) - reserved margin_required = 20% * notional_size
        e.g. 1000 contracts at $1 price = $1000 notional * 20% = $200 margin_required [reserved amount] -- IT NEVER CHANGES (assuming 20% is same value on each take/pay cycle)
      >> then, after take/pay job has run (and updated cash balance) - if ledger's cash balance < margin_requried either
        (a) margin-call or (b) liquidate

===

older:

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

 /**
  * @title Security Token Futures Trading
  * @author Dominic Morris (7-of-9)
  * @notice contract for on-chain futures trading
  * <pre>   - inherits Owned ownership smart contract</pre>
  * <pre>   - inherits StLedger security token ledger contract</pre>
  * <pre>   - inherits StFees security token ledger contract</pre>
  * <pre>   - inherits StErc20 security token ledger contract</pre>
  * <pre>   - inherits StPayable security token ledger contract</pre>
  * <pre>   - uses StrudddddctLib interface library</pre>
  * <pre>   - uses FuturesLib runtime library</pre>
  * <pre>   - uses Erc20Lib runtime library</pre>
  * <pre>   - uses LedgerLib runtime library</pre>
  */
  
contract StFutures is Owned,
    StLedger, StFees, StErc20, StPayable {

//#if process.env.CONTRACT_TYPE === 'COMMODITY'

    //senum OverrideType { INIT_MARGIN, FEE_PER_CONTRACT }
    
    /**
     * @dev ledger override control
     * @param overrideType override future type<br/> 0: initial margin<br/>1: fee per contract
     * @param tokTypeId token type for futures trading
     * @param ledgerOwner account address of the ledger owner
     * @param value amount
     */
     
    function setLedgerOverride(uint256 overrideType, uint256 tokTypeId, address ledgerOwner, uint16 value)
    public onlyOwner() onlyWhenReadWrite() {
        FuturesLib.setLedgerOverride(overrideType, ld, std, tokTypeId, ledgerOwner, value);
        // if (overrideType == OverrideType.INIT_MARGIN) {
        //     FuturesLib.initMarginOverride(ld, std, tokTypeId, ledgerOwner, uint16(value));
        // }
        // else if (overrideType == OverrideType.FEE_PER_CONTRACT) {
        //     FuturesLib.feePerContractOverride(ld, std, tokTypeId, ledgerOwner, value);
        // }
    }
    // // set initial margin - ledger override
    // function initMarginOverride(
    //     uint256 tokTypeId,
    //     address ledgerOwner,
    //     uint16  initMarginBips)
    // public onlyOwner() onlyWhenReadWrite() {
    //     FuturesLib.initMarginOverride(ld, std, tokTypeId, ledgerOwner, initMarginBips);
    // }
    // // set fee per contract - ledger override
    // function feePerContractOverride(
    //     uint256 tokTypeId,
    //     address ledgerOwner,
    //     uint128 feePerContract)
    // public onlyOwner() onlyWhenReadWrite() {
    //     FuturesLib.feePerContractOverride(ld, std, tokTypeId, ledgerOwner, feePerContract);
    // }

    /**
     * @dev open futures position
     * @param futurePositionsArgs tokTypeId<br/>ledger_A<br/>ledger_B<br/>qty_A<br/>qty_B<br/>price
     */
     
    function openFtPos(StructLib.FuturesPositionArgs memory futurePositionsArgs)
    public onlyOwner() onlyWhenReadWrite() {
        // abort if opening position on a non-whitelist account
        require(erc20d._whitelisted[futurePositionsArgs.ledger_A], "Not whitelisted (A)"); 
        require(erc20d._whitelisted[futurePositionsArgs.ledger_B], "Not whitelisted (B)");

        FuturesLib.openFtPos(ld, std, ctd, futurePositionsArgs, deploymentOwner);
    }

    // ##### set var margin - per product   // ALREADY EXISTS! setFuture_VariationMargin()....
    // function updateVarMargin(  
    //     uint256 tokTypeId,
    //     uint16  varMarginBips)
    // public onlyOwner() {
    //     // TODO: needs to *re-calc* any open position reserves...
    //     //...
    // }

    /**
     * @dev futures settlement
     * @param tokTypeId token type for futures trade
     * @param stId security token identifier 
     * @param markPrice signed mark price, can be explicitly challenged offchain
     * @param feePerSide fee per each side of the futures trade
     */
    function takePay2(
        uint256 tokTypeId,
        uint256 stId,
        int128  markPrice,
        int256  feePerSide
    ) public onlyOwner() {
        FuturesLib.takePay2(ld, std,
          StructLib.TakePayArgs2({
             tokTypeId: tokTypeId,
                  stId: stId,
             markPrice: markPrice,
            feePerSide: feePerSide,
          feeAddrOwner: deploymentOwner
          }));
    }

    /**
     * @dev combine futures position
     * @param combinePositionArgs tokTypeId<br/>master_stIds<br/>child_stIds
     */
    function combineFtPos(StructLib.CombinePositionArgs memory combinePositionArgs)
    public onlyOwner() {
        FuturesLib.combineFtPos(ld, std, combinePositionArgs);
    }

    /**
     * @dev set margin variation
     * @param tokTypeId token type
     * @param varMarginBips margin variation in % (bips)
     */
    function setFuture_VariationMargin(uint256 tokTypeId, uint16 varMarginBips)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.setFuture_VariationMargin(std, tokTypeId, varMarginBips); // ### recalc all open pos margin/reserve; needs to be batched (job) - re. gas limits
    }

    /**
     * @dev set fee per contract
     * @param tokTypeId token type
     * @param feePerContract fee paid by both sides in a currency type
     */
    function setFuture_FeePerContract(uint256 tokTypeId, uint128 feePerContract)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.setFuture_FeePerContract(std, tokTypeId, feePerContract);
    }

    /**
     * @dev set reserved currency amount
     * @param ccyTypeId currency type
     * @param reservedAmount amount to be reserved
     * @param ledger account address of ledger owner
     */    
    function setReservedCcy(uint256 ccyTypeId, int256 reservedAmount, address ledger)
        public onlyOwner() onlyWhenReadWrite() {
            StructLib.setReservedCcy(ld, ctd, ledger, ccyTypeId, reservedAmount);
    }

    // VIEWS
    
    /**
     * @dev returns the initial margin
     * @param tokTypeId token type
     * @param ledgerOwner account address of ledger owner
     * @return initMargin
     * @param initMargin returns the initial margin % (bips)
     */
    function getInitMarginOverride(uint256 tokTypeId, address ledgerOwner)
    external view returns (uint16 initMargin) {
        return ld._ledger[ledgerOwner].ft_initMarginBips[tokTypeId];
    }

    /**
     * @dev returns the fee per contract
     * @param tokTypeId token type
     * @param ledgerOwner account address of ledger owner
     * @return feePerContract
     * @param feePerContract the fee paid by both sides in currency type
     */
    function getFeePerContractOverride(uint256 tokTypeId, address ledgerOwner)
    external view returns (uint128 feePerContract) {
        return ld._ledger[ledgerOwner].ft_feePerContract[tokTypeId];
    }

//#endif
}
