/*

FUTURES - notes 26/MAR/2020

(1) new token-type: JUL_28_2020, AUG_28_2020, etc., i.e. rolling/continuously added -- > and with an expiry date <
    //
    // todo: add timestamp to tok-type, for expiry datetime
    //       no trade after expiry timestamp - must be enforced off-chain for now (but a chainlink for block->timestamp data means it could be done on-chain)
    //
    // todo: add deriv-of param for FT tok-type... i.e. UNDERLYER... (mus be a SPOT tok-type)

(2) token-type gets flag: SPOT || FUTURE
(3) token-type FUTURE can be short sold, i.e. -ve tokenQty would be ok

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