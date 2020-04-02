pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

library FuturesLib {

    //
    // PUBLIC - open position
    //
    function openPosition(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.FeeStruct storage globalFees,
        StructLib.FuturesPositionArgs memory a
    ) public {
        //
        // TODO: use existing mint/burn() fn's for "auto-minting" both balanced sides
        //       but in "auto" mode --> NO GLOBAL COUNTER UPDATES i.e. spot_sumQtyMinted / spot_sumQtyBurned don't update for FT mints/burns...

    }
}