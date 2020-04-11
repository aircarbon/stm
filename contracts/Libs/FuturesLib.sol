pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

library FuturesLib {
    event FutureOpenInterest(address indexed long, address indexed short, uint256 tokTypeId, uint256 qty, uint256 price);
    event SetInitialMargin(uint256 tokenTypeId, address indexed ledgerOwner, uint16 initMarginBips);

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
        require(initMarginBips <= 10000, "Bad initMarginBips");

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
        int256 marginRequired_A = (((int256((
                                        (ld._ledger[a.ledger_A].ft_initMarginBips[a.tokTypeId] != 0
                                            ? ld._ledger[a.ledger_A].ft_initMarginBips[a.tokTypeId]/*initial margin override*/
                                            : std._tt_ft[a.tokTypeId].initMarginBips)/*product's initial margin*/
                                         + std._tt_ft[a.tokTypeId].varMarginBips)/*totMarginBips*/)
                                    * 1000000/*increase precision*/)
                                    / 10000/*basis points*/)
                                    * (std._tt_ft[a.tokTypeId].contractSize * posSize * a.price)/*notional*/
                                ) / 1000000/*decrease precision*/;

        int256 marginRequired_B = (((int256((
                                        (ld._ledger[a.ledger_B].ft_initMarginBips[a.tokTypeId] != 0
                                            ? ld._ledger[a.ledger_B].ft_initMarginBips[a.tokTypeId]/*initial margin override*/
                                            : std._tt_ft[a.tokTypeId].initMarginBips)/*product's initial margin*/
                                         + std._tt_ft[a.tokTypeId].varMarginBips)/*totMarginBips*/)
                                    * 1000000/*increase precision*/)
                                    / 10000/*basis points*/)
                                    * (std._tt_ft[a.tokTypeId].contractSize * posSize * a.price)/*notional*/
                                ) / 1000000/*decrease precision*/;

        // apply margin
        int256 newReserved_A = ld._ledger[a.ledger_A].ccyType_reserved[std._tt_ft[a.tokTypeId].refCcyId] + marginRequired_A;
        int256 newReserved_B = ld._ledger[a.ledger_B].ccyType_reserved[std._tt_ft[a.tokTypeId].refCcyId] + marginRequired_B;
        StructLib.setReservedCcy(ld, ctd, a.ledger_A, std._tt_ft[a.tokTypeId].refCcyId, newReserved_A); // will revert if insufficient
        StructLib.setReservedCcy(ld, ctd, a.ledger_B, std._tt_ft[a.tokTypeId].refCcyId, newReserved_B);

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