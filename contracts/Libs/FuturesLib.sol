pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

library FuturesLib {
    event FutureOpenInterest(address indexed long, address indexed short, uint256 tokTypeId, uint256 qty, uint256 price);
    event SetInitialMargin(uint256 tokenTypeId, address indexed ledgerOwner, uint16 initMarginBips);
    event dbg(int256 deltaShort, int256 deltaLong);

    //
    // PUBLIC - get/set initial margin ledger override
    //
    function setInitMargin_TokType(
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        address ledgerOwner,
        uint256 tokTypeId,
        uint16  initMarginBips
    ) public {
        //require(ld._ledger[ledgerOwner].exists == true, "Bad ledgerOwner");
        require(tokTypeId >= 0 && tokTypeId <= std._tt_Count, "Bad tokTypeId");
        require(std._tt_Settle[tokTypeId] == StructLib.SettlementType.FUTURE, "Bad token settlement type");
        require(/*std._tt_ft[tokTypeId].varMarginBips +*/initMarginBips <= 10000, "Bad total margin");

        StructLib.initLedgerIfNew(ld, ledgerOwner);
        ld._ledger[ledgerOwner].ft_initMarginBips[tokTypeId] = initMarginBips;
        emit SetInitialMargin(tokTypeId, ledgerOwner, initMarginBips);
    }

    //
    // PUBLIC - open futures position
    //
    function openFtPos(
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        StructLib.CcyTypesStruct storage ctd,
        StructLib.FeeStruct storage globalFees,
        StructLib.FuturesPositionArgs memory a,
        address owner
    ) public {
        require(ld._contractSealed, "Contract is not sealed");
        require(a.ledger_A != a.ledger_B, "Bad transfer");
        require(a.qty_A <= 0x7FFFFFFFFFFFFFFF && a.qty_B <= 0x7FFFFFFFFFFFFFFF &&
                a.qty_A >= -0x7FFFFFFFFFFFFFFF && a.qty_B >= -0x7FFFFFFFFFFFFFFF &&
                a.qty_A != 0 && a.qty_B != 0, "Bad quantity"); // min/max signed int64, non-zero
        require(a.qty_A + a.qty_B == 0, "Quantity mismatch");
        require(a.tokTypeId >= 0 && a.tokTypeId <= std._tt_Count, "Bad tokTypeId");
        require(std._tt_Settle[a.tokTypeId] == StructLib.SettlementType.FUTURE, "Bad token settlement type");
        require(a.price <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF && a.price > 0, "Bad price"); // max signed int128, non-zero

        // apply fees
        int256 posSize = (a.qty_A < 0 ? a.qty_B : a.qty_A);
        int256 fee = std._tt_ft[a.tokTypeId].feePerContract * posSize;
        require(fee >= 0, "Unexpected fee value");
        require(StructLib.sufficientCcy(ld, a.ledger_A, std._tt_ft[a.tokTypeId].refCcyId, 0, 0, fee), "Insufficient currency A");
        require(StructLib.sufficientCcy(ld, a.ledger_B, std._tt_ft[a.tokTypeId].refCcyId, 0, 0, fee), "Insufficient currency B");
        StructLib.transferCcy(ld, StructLib.TransferCcyArgs({ from: a.ledger_A, to: owner, ccyTypeId: std._tt_ft[a.tokTypeId].refCcyId, amount: uint256(fee), transferType: StructLib.TransferType.ExchangeFee }));
        StructLib.transferCcy(ld, StructLib.TransferCcyArgs({ from: a.ledger_B, to: owner, ccyTypeId: std._tt_ft[a.tokTypeId].refCcyId, amount: uint256(fee), transferType: StructLib.TransferType.ExchangeFee }));

        // calculate margin requirements
        int256 marginRequired_A = calcPosMargin(ld, std, a.ledger_A, a.tokTypeId, a.qty_A, int128(a.price));
        int256 marginRequired_B = calcPosMargin(ld, std, a.ledger_B, a.tokTypeId, a.qty_B, int128(a.price));

        // apply margin
        int256 newReserved_A = ld._ledger[a.ledger_A].ccyType_reserved[std._tt_ft[a.tokTypeId].refCcyId] + marginRequired_A;
        int256 newReserved_B = ld._ledger[a.ledger_B].ccyType_reserved[std._tt_ft[a.tokTypeId].refCcyId] + marginRequired_B;
        StructLib.setReservedCcy(ld, ctd, a.ledger_A, std._tt_ft[a.tokTypeId].refCcyId, newReserved_A); // will revert if insufficient
        StructLib.setReservedCcy(ld, ctd, a.ledger_B, std._tt_ft[a.tokTypeId].refCcyId, newReserved_B);

        // create ledger entries as required
        StructLib.initLedgerIfNew(ld, a.ledger_A);
        StructLib.initLedgerIfNew(ld, a.ledger_B);

        // auto-mint ("batchless") a balanced ST-pair; one for each side of the position
        // (note: no global counter updates [_spot_totalMintedQty, spot_sumQtyMinted] for FT auto-mints)
        // (note: the short position is always the first/lower ST ID, the long position is the second/higher ST ID - for pair lookup later)
        uint256 newId_A = ld._tokens_currentMax_id + (a.qty_A < 0 ? 1 : 2);
        uint256 newId_B = ld._tokens_currentMax_id + (a.qty_B < 0 ? 1 : 2);

        //ld._sts[newId_A].batchId = 0; // batchless
        ld._sts[newId_A].mintedQty = int64(a.qty_A);
        ld._sts[newId_A].currentQty = int64(a.qty_A);
        ld._sts[newId_A].ft_price = int128(a.price);
        ld._sts[newId_A].ft_lastMarkPrice = -1;
        ld._sts[newId_A].ledgerOwner = a.ledger_A;

        //ld._sts[newId_B].batchId = 0;
        ld._sts[newId_B].mintedQty = int64(a.qty_B);
        ld._sts[newId_B].currentQty = int64(a.qty_B);
        ld._sts[newId_B].ft_price = int128(a.price);
        ld._sts[newId_B].ft_lastMarkPrice = -1;
        ld._sts[newId_B].ledgerOwner = a.ledger_B;

        ld._tokens_currentMax_id += 2;

        // assign STs to ledgers
        ld._ledger[a.ledger_A].tokenType_stIds[a.tokTypeId].push(newId_A);
        ld._ledger[a.ledger_B].tokenType_stIds[a.tokTypeId].push(newId_B);

        if (a.qty_A > 0)
            emit FutureOpenInterest(a.ledger_A, a.ledger_B, a.tokTypeId, uint256(a.qty_A), uint256(a.price));
        else
            emit FutureOpenInterest(a.ledger_B, a.ledger_A, a.tokTypeId, uint256(a.qty_B), uint256(a.price));
    }

    //
    // PUBLIC - take & pay a position pair (settlement)
    //
    function takePay(
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        uint256 tokTypeId,
        uint256 short_stId,
        int128  markPrice
    ) public {
        // ...todo? - recalculate margin requirement (calcPosMargin()) - i.e. allow changes of FT var-margin on open positions...

        require(tokTypeId >= 0 && tokTypeId <= std._tt_Count, "Bad tokTypeId");
        require(std._tt_Settle[tokTypeId] == StructLib.SettlementType.FUTURE, "Bad token settlement type");
        StructLib.FutureTokenTypeArgs storage fta = std._tt_ft[tokTypeId];
        require(fta.contractSize > 0, "Unexpected token type FutureTokenTypeArgs");

        StructLib.PackedSt storage shortSt = ld._sts[short_stId];
        require(shortSt.batchId == 0 && shortSt.ft_price != 0, "Bad (unexpected data) on explicit short token");
        require(shortSt.currentQty < 0, "Bad (non-short quantity) on explicit short token");
        require(shortSt.ledgerOwner != address(0x0), "Bad token ledger owner on explicit short token");

        StructLib.PackedSt storage longSt = ld._sts[short_stId + 1];
        require(longSt.batchId == 0 && longSt.ft_price != 0, "Bad (unexpected data) on implied long token");
        require(longSt.currentQty > 0, "Bad (non-short quantity) on implied long token");
        require(longSt.ledgerOwner != address(0x0), "Bad token ledger owner on implied long token");

        require(markPrice >= 0, "Bad markPrice"); // allow zero for marking

        require(tokenExistsOnLedger(ld, tokTypeId, shortSt, short_stId), "Bad or missing ledger token type on explicit short token");
        require(tokenExistsOnLedger(ld, tokTypeId, longSt, short_stId + 1), "Bad or missing ledger token type on implied long token");

        // get delta each side
        int256 deltaShort = calcTakePay(ld, fta, tokTypeId, shortSt, markPrice);
        int256 deltaLong = calcTakePay(ld, fta, tokTypeId, longSt, markPrice);
        require(deltaShort + deltaLong == 0, "Unexpected net delta short/long");
        emit dbg(deltaShort, deltaLong);

        // get OTM/ITM sides
        uint256 itm_stId = deltaShort == deltaLong ? short_stId + 0 : deltaShort > 0 ? short_stId + 0 : short_stId + 1;
        uint256 otm_stId = deltaShort == deltaLong ? short_stId + 1 :  deltaLong > 0 ? short_stId + 1 : short_stId + 0;

        // todo: detapply cap on OTM-take value... apply take/pay on physical cash (balance)
        // (note - agnostic on the liquidation effect, if any)
    }

    // returns uncapped take/pay settlment amount for the given position
    function calcTakePay(
        StructLib.LedgerStruct storage ld,
        StructLib.FutureTokenTypeArgs storage fta,
        uint256 tokTypeId,
        StructLib.PackedSt storage st,
        int128  markPrice
    ) private returns(int256) {
        int256 delta = (markPrice - (st.ft_lastMarkPrice == -1
                            ? st.ft_price
                            : st.ft_lastMarkPrice)) * fta.contractSize * st.currentQty;
        return delta;
    }

    // checks if the supplied token of supplied type is present on the supplied ledger entry
    function tokenExistsOnLedger(
        StructLib.LedgerStruct storage ld,
        uint256 tokTypeId,
        StructLib.PackedSt storage st,
        uint256 stId
    ) private returns(bool) {
        for (uint256 x = 0; x < ld._ledger[st.ledgerOwner].tokenType_stIds[tokTypeId].length ; x++) {
            if (ld._ledger[st.ledgerOwner].tokenType_stIds[tokTypeId][x] == stId) {
                return true;
            }
        }
        return false;
    }


    // return margin required for the given position
    function calcPosMargin(
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        address ledgerOwner,
        uint256 tokTypeId,
        int256 posSize,
        int128 price
    ) private returns(int256) {

        uint16 totMargin = (ld._ledger[ledgerOwner].ft_initMarginBips[tokTypeId] != 0
                                ? ld._ledger[ledgerOwner].ft_initMarginBips[tokTypeId]
                                : std._tt_ft[tokTypeId].initMarginBips)
                            + std._tt_ft[tokTypeId].varMarginBips;
        if (totMargin > 10000) {
            totMargin = 10000;
        }

        return (((int256(totMargin)
            * 1000000/*increase precision*/)
                / 10000/*basis points*/)
                * (std._tt_ft[tokTypeId].contractSize * (posSize < 0 ? posSize * -1 : posSize) * price)/*notional*/
            ) / 1000000/*decrease precision*/;
    }
}