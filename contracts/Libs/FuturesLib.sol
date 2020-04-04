pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

library FuturesLib {

    //
    // PUBLIC - open futures position
    //
    function openFtPos(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.StTypesStruct storage stTypesData,
        StructLib.CcyTypesStruct storage ccyTypesData,
        StructLib.FeeStruct storage globalFees,
        StructLib.FuturesPositionArgs memory a
    ) public {
        require(ledgerData._contractSealed, "Contract is not sealed");

        require(a.ledger_A != a.ledger_B, "Bad transfer");

        require(a.qty_A <= 0x7FFFFFFFFFFFFFFF && a.qty_B <= 0x7FFFFFFFFFFFFFFF &&
                a.qty_A >= -0x7FFFFFFFFFFFFFFF && a.qty_B >= -0x7FFFFFFFFFFFFFFF &&
                a.qty_A != 0 && a.qty_B != 0,  "Bad quantity"); // min/max signed int64, non-zero
        require(a.qty_A + a.qty_B == 0, "Quantity mismatch");

        require(a.tokTypeId >= 0 && a.tokTypeId <= stTypesData._tt_Count, "Bad tokTypeId");
        require(stTypesData._tt_Settle[a.tokTypeId] == StructLib.SettlementType.FUTURE, "Invalid (non-future) tokTypeId");

        require(a.price > 0, "Bad price");

        // TODO: need to compute margin requirement - for validation re. position opening
        //       (should be a *view* that the FuturesMaintenance job can call and reuse...)

        // TODO: use existing mint/burn() fn's for "auto-minting" both balanced sides
        //       but in "auto" mode --> NO GLOBAL COUNTER UPDATES i.e. spot_sumQtyMinted / spot_sumQtyBurned don't update for FT mints/burns...
    }
}