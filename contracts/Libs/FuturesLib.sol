pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

library FuturesLib {
    event FutureOpenInterest(address indexed long, address indexed short, uint256 tokTypeId, uint256 qty, uint256 price);

    //
    // PUBLIC - open futures position
    //
    function openFtPos(
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        StructLib.CcyTypesStruct storage ctd,
        StructLib.FeeStruct storage globalFees,
        StructLib.FuturesPositionArgs memory a
    ) public {
        require(ld._contractSealed, "Contract is not sealed");

        require(a.ledger_A != a.ledger_B, "Bad transfer");

        require(a.qty_A <= 0x7FFFFFFFFFFFFFFF && a.qty_B <= 0x7FFFFFFFFFFFFFFF &&
                a.qty_A >= -0x7FFFFFFFFFFFFFFF && a.qty_B >= -0x7FFFFFFFFFFFFFFF &&
                a.qty_A != 0 && a.qty_B != 0,  "Bad quantity"); // min/max signed int64, non-zero
        require(a.qty_A + a.qty_B == 0, "Quantity mismatch");

        require(a.tokTypeId >= 0 && a.tokTypeId <= std._tt_Count, "Bad tokTypeId");
        require(std._tt_Settle[a.tokTypeId] == StructLib.SettlementType.FUTURE, "Invalid (non-future) tokTypeId");

        require(a.price <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF && a.price > 0, "Bad price"); // max signed int128, non-zero

        // ****
        // WIP/TODO: need to compute margin requirement - for validation re. position opening
        //       (should be a *view* that the FuturesMaintenance job can call and reuse...)
        //      * init_margin + var_margin = tot_margin ...
        // ****
        //
        // var tot_margin = CurrentReservedBalance(); //ComputeTotalMarginOpenPositions(ledger) // view?
        // var new_margin = tot_margin + this_margin
        // if (TotalBalance(ledger) < new_margin) {
        //    SetReservedBalance(new_margin);
        //    open position...
        // }
        // else {
        //    reject()
        //}
        // so we only add to the reservedBalance on position open
        //   ...and subtract from it, on position closing/netting; (--> i.e. no need for computeAllPositions margin fn.)

        // PREP...
        // (1) SetReserved(ccyId, ledger, amount) ==> structLib...
        // (2) transferTrade -> change to check (balance-reserved)
        // (3) withdraw      -> change to check (balance-reserved)
        // TESTS...

        // create ledger entries as required
        StructLib.initLedgerIfNew(ld, a.ledger_A);
        StructLib.initLedgerIfNew(ld, a.ledger_B);

        // auto-mint ("batchless") balanced STs on each side of the position
        // (note: no global counter updates [_spot_totalMintedQty, spot_sumQtyMinted] for FT auto-mints)
        uint256 newId_A = ld._tokens_currentMax_id + 1;
        uint256 newId_B = ld._tokens_currentMax_id + 2;

        //ld._sts[newId_A].batchId = 0; // batchless
        ld._sts[newId_A].mintedQty = int64(a.qty_A);
        ld._sts[newId_A].currentQty = int64(a.qty_A);
        ld._sts[newId_A].ft_price = int128(a.price);
        ld._sts[newId_A].ft_lastMarkPrice = -1;

        //ld._sts[newId_B].batchId = 0;
        ld._sts[newId_B].mintedQty = int64(a.qty_B);
        ld._sts[newId_B].currentQty = int64(a.qty_B);
        ld._sts[newId_B].ft_price = int128(a.price);
        ld._sts[newId_B].ft_lastMarkPrice = -1;

        ld._tokens_currentMax_id += 2;

        // assign STs to ledgers
        ld._ledger[a.ledger_A].tokenType_stIds[a.tokTypeId].push(newId_A);
        ld._ledger[a.ledger_B].tokenType_stIds[a.tokTypeId].push(newId_B);

        if (a.qty_A > 0)
            emit FutureOpenInterest(a.ledger_A, a.ledger_B, a.tokTypeId, uint256(a.qty_A), uint256(a.price));
        else
            emit FutureOpenInterest(a.ledger_B, a.ledger_A, a.tokTypeId, uint256(a.qty_B), uint256(a.price));
    }
}