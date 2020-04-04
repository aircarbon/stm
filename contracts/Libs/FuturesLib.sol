pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

library FuturesLib {
    event FutureOpenInterest(address indexed long, address indexed short, uint256 tokTypeId, uint256 qty, uint256 price);

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

        require(a.price <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF && a.price > 0, "Bad price"); // max signed int128, non-zero

        // ****
        // TODO: need to compute margin requirement - for validation re. position opening
        //       (should be a *view* that the FuturesMaintenance job can call and reuse...)
        //      * init_margin + var_margin = tot_margin ...
        //          (%) --> record/set against FT-tok-type...
        //
        //          addSecTokType() FT        ==> +initMarginBps [required]
        //          setFutureVarationMargin() ==> +varMarginBps  [def: 0]
        //
        // ****

        // create ledger entries as required
        StructLib.initLedgerIfNew(ledgerData, a.ledger_A);
        StructLib.initLedgerIfNew(ledgerData, a.ledger_B);

        // auto-mint ("batchless") balanced STs on each side of the position
        // (note: no global counter updates [_spot_totalMintedQty, spot_sumQtyMinted] for FT auto-mints)
        uint256 newId_A = ledgerData._tokens_currentMax_id + 1;
        uint256 newId_B = ledgerData._tokens_currentMax_id + 2;

        //ledgerData._sts[newId_A].batchId = 0; // batchless
        ledgerData._sts[newId_A].mintedQty = int64(a.qty_A);
        ledgerData._sts[newId_A].currentQty = int64(a.qty_A);
        ledgerData._sts[newId_A].ft_price = int128(a.price);
        ledgerData._sts[newId_A].ft_lastMarkPrice = -1;

        //ledgerData._sts[newId_B].batchId = 0;
        ledgerData._sts[newId_B].mintedQty = int64(a.qty_B);
        ledgerData._sts[newId_B].currentQty = int64(a.qty_B);
        ledgerData._sts[newId_B].ft_price = int128(a.price);
        ledgerData._sts[newId_B].ft_lastMarkPrice = -1;

        ledgerData._tokens_currentMax_id += 2;

        // assign STs to ledgers
        ledgerData._ledger[a.ledger_A].tokenType_stIds[a.tokTypeId].push(newId_A);
        ledgerData._ledger[a.ledger_B].tokenType_stIds[a.tokTypeId].push(newId_B);

        if (a.qty_A > 0)
            emit FutureOpenInterest(a.ledger_A, a.ledger_B, a.tokTypeId, uint256(a.qty_A), uint256(a.price));
        else
            emit FutureOpenInterest(a.ledger_B, a.ledger_A, a.tokTypeId, uint256(a.qty_B), uint256(a.price));
    }
}