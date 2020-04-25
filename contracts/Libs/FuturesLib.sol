pragma solidity >=0.4.21 <=0.6.6;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

library FuturesLib {
    event FutureOpenInterest(address indexed long, address indexed short, uint256 shortStId, uint256 tokTypeId, uint256 qty, uint256 price);
    event SetInitialMargin(uint256 tokenTypeId, address indexed ledgerOwner, uint16 initMarginBips);
    event TakePay(address indexed from, address indexed to, uint256 delta, uint256 done, address indexed feeTo, uint256 otmFee, uint256 itmFee, uint256 feeCcyId);
    event TakePay2(address indexed from, address indexed to, uint256 ccyId, uint256 delta, uint256 done, uint256 fee);

    event Combine(address indexed to, uint256 masterStId, uint256 countTokensCombined);

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
    struct OpenPosVars {
        int256 posSize;
        int256 fee;
        int256 marginRequired_A;
        int256 marginRequired_B;
        int256 newReserved_A;
        int256 newReserved_B;
        uint256 newId_A;
        uint256 newId_B;
    }
    function openFtPos(
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        StructLib.CcyTypesStruct storage ctd,
        StructLib.FuturesPositionArgs memory a,
        address owner
    ) public {
        OpenPosVars memory v;
        require(ld._contractSealed, "Contract is not sealed");
        require(a.ledger_A != a.ledger_B, "Bad transfer");
        require(a.qty_A <= 0x7FFFFFFFFFFFFFFF && a.qty_B <= 0x7FFFFFFFFFFFFFFF && a.qty_A >= -0x7FFFFFFFFFFFFFFF && a.qty_B >= -0x7FFFFFFFFFFFFFFF && a.qty_A != 0 && a.qty_B != 0, "Bad quantity"); // min/max signed int64, non-zero
        require(a.qty_A + a.qty_B == 0, "Quantity mismatch");
        require(a.tokTypeId >= 0 && a.tokTypeId <= std._tt_Count, "Bad tokTypeId");
        require(std._tt_Settle[a.tokTypeId] == StructLib.SettlementType.FUTURE, "Bad token settlement type");
        require(a.price <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF && a.price > 0, "Bad price"); // max signed int128, non-zero

        // apply fees
        v.posSize = (a.qty_A < 0 ? a.qty_B : a.qty_A);
        v.fee = std._tt_ft[a.tokTypeId].feePerContract * v.posSize;
        require(v.fee >= 0, "Unexpected fee value");
        require(StructLib.sufficientCcy(ld, a.ledger_A, std._tt_ft[a.tokTypeId].refCcyId, 0, 0, v.fee), "Insufficient currency A");
        require(StructLib.sufficientCcy(ld, a.ledger_B, std._tt_ft[a.tokTypeId].refCcyId, 0, 0, v.fee), "Insufficient currency B");
        StructLib.transferCcy(ld, StructLib.TransferCcyArgs({ from: a.ledger_A, to: owner, ccyTypeId: std._tt_ft[a.tokTypeId].refCcyId, amount: uint256(v.fee), transferType: StructLib.TransferType.ExchangeFee }));
        StructLib.transferCcy(ld, StructLib.TransferCcyArgs({ from: a.ledger_B, to: owner, ccyTypeId: std._tt_ft[a.tokTypeId].refCcyId, amount: uint256(v.fee), transferType: StructLib.TransferType.ExchangeFee }));

        // calculate margin requirements
        v.marginRequired_A = calcPosMargin(ld, std, a.ledger_A, a.tokTypeId, a.qty_A, int128(a.price));
        v.marginRequired_B = calcPosMargin(ld, std, a.ledger_B, a.tokTypeId, a.qty_B, int128(a.price));

        // apply margin
        v.newReserved_A = ld._ledger[a.ledger_A].ccyType_reserved[std._tt_ft[a.tokTypeId].refCcyId] + v.marginRequired_A;
        v.newReserved_B = ld._ledger[a.ledger_B].ccyType_reserved[std._tt_ft[a.tokTypeId].refCcyId] + v.marginRequired_B;
        StructLib.setReservedCcy(ld, ctd, a.ledger_A, std._tt_ft[a.tokTypeId].refCcyId, v.newReserved_A); // will revert if insufficient
        StructLib.setReservedCcy(ld, ctd, a.ledger_B, std._tt_ft[a.tokTypeId].refCcyId, v.newReserved_B);

        // create ledger entries as required
        StructLib.initLedgerIfNew(ld, a.ledger_A);
        StructLib.initLedgerIfNew(ld, a.ledger_B);

        // auto-mint ("batchless") a balanced ST-pair; one for each side of the position
        // (note: no global counter updates [_spot_totalMintedQty, spot_sumQtyMinted] for FT auto-mints)
        // (note: the short position is always the first/lower ST ID, the long position is the second/higher ST ID - for pair lookup later)
        v.newId_A = ld._tokens_currentMax_id + (a.qty_A < 0 ? 1 : 2);
        v.newId_B = ld._tokens_currentMax_id + (a.qty_B < 0 ? 1 : 2);

        //ld._sts[v.newId_A].batchId = 0; // batchless
        ld._sts[v.newId_A].mintedQty = int64(a.qty_A);
        ld._sts[v.newId_A].currentQty = int64(a.qty_A);
        ld._sts[v.newId_A].ft_price = int128(a.price);
        ld._sts[v.newId_A].ft_lastMarkPrice = -1;
        ld._sts[v.newId_A].ft_ledgerOwner = a.ledger_A;

        //ld._sts[v.newId_B].batchId = 0;
        ld._sts[v.newId_B].mintedQty = int64(a.qty_B);
        ld._sts[v.newId_B].currentQty = int64(a.qty_B);
        ld._sts[v.newId_B].ft_price = int128(a.price);
        ld._sts[v.newId_B].ft_lastMarkPrice = -1;
        ld._sts[v.newId_B].ft_ledgerOwner = a.ledger_B;

        ld._tokens_currentMax_id += 2;

        // assign STs to ledgers
        ld._ledger[a.ledger_A].tokenType_stIds[a.tokTypeId].push(v.newId_A);
        ld._ledger[a.ledger_B].tokenType_stIds[a.tokTypeId].push(v.newId_B);

        if (a.qty_A > 0)
            emit FutureOpenInterest(a.ledger_A, a.ledger_B, ld._tokens_currentMax_id - 1, a.tokTypeId, uint256(a.qty_A), uint256(a.price));
        else
            emit FutureOpenInterest(a.ledger_B, a.ledger_A, ld._tokens_currentMax_id - 1, a.tokTypeId, uint256(a.qty_B), uint256(a.price));
    }

    //
    // PUBLIC - SETTLEMENT: take & pay - v1 - position pair, bilateral balanced
    //
    struct TakePayVars {
        StructLib.PackedSt st;
        int256 delta;
        int256 bal;
        int256 fee;
        int256 take;
    }
    function takePay(
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        StructLib.TakePayArgs memory a
    ) public {

        // #### need to change from bilateral model to unilateral????
        // i.e. all OTM swept to central store, then all ITM swept from store (FIFO) ... more gas cost!

        // #### id+1 assumption is broken by posCombine -- so for sure we remove from here, once we switch to unilateral model

        // #### id+1 assumption usage in ft_job...?

        // ...todo? - recalculate margin requirement (calcPosMargin()) - i.e. allow changes of FT var-margin on open positions...

        //require(a.tokTypeId >= 0 && a.tokTypeId <= std._tt_Count, "Bad tokTypeId");
        require(std._tt_Settle[a.tokTypeId] == StructLib.SettlementType.FUTURE, "Bad token settlement type");
        StructLib.FutureTokenTypeArgs storage fta = std._tt_ft[a.tokTypeId];
        //require(fta.contractSize > 0, "Unexpected token type FutureTokenTypeArgs");

        //uint256 long_stId = a.short_stId + 1;

        StructLib.PackedSt storage shortSt = ld._sts[a.short_stId];
        //require(shortSt.batchId == 0 && shortSt.ft_price != 0, "Bad (unexpected data) on explicit short token");
        require(shortSt.currentQty < 0, "Bad (non-short quantity) on explicit short token");
        //require(shortSt.ft_ledgerOwner != address(0x0), "Bad token ledger owner on explicit short token");

        StructLib.PackedSt storage longSt = ld._sts[a.short_stId + 1];
        require(longSt.batchId == 0 && longSt.ft_price != 0, "Bad (unexpected data) on implied long token");
        //require(longSt.currentQty > 0, "Bad (non-short quantity) on implied long token");
        //require(longSt.ft_ledgerOwner != address(0x0), "Bad token ledger owner on implied long token");

        require(a.markPrice >= 0, "Bad markPrice"); // allow zero for marking

        // require(tokenExistsOnLedger(ld, a.tokTypeId, shortSt.ft_ledgerOwner, a.short_stId), "Bad or missing ledger token type on explicit short token");
        // require(tokenExistsOnLedger(ld, a.tokTypeId, longSt.ft_ledgerOwner, a.short_stId + 1), "Bad or missing ledger token type on implied long token");

        require(a.feePerSide >= 0, "Bad feePerSide");

        // get delta each side
        int256 short_Delta = calcTakePay(fta, shortSt, a.markPrice, shortSt.ft_lastMarkPrice);
        int256 long_Delta = calcTakePay(fta, longSt, a.markPrice, longSt.ft_lastMarkPrice); // (gas - could only use short side's last mark price)
        //require(short_Delta + long_Delta == 0, "Unexpected net delta short/long");

        // get OTM/ITM sides
        TakePayVars memory itm;
        TakePayVars memory otm;
        if (short_Delta == long_Delta || short_Delta > 0) {
            itm = TakePayVars({ st: shortSt, delta: short_Delta, bal: ld._ledger[shortSt.ft_ledgerOwner].ccyType_balance[fta.refCcyId], fee: 0, take: 0 });
            otm = TakePayVars({  st: longSt, delta: long_Delta,  bal: ld._ledger[longSt.ft_ledgerOwner].ccyType_balance[fta.refCcyId],  fee: 0, take: 0 });
        }
        else {
            itm = TakePayVars({  st: longSt, delta: long_Delta,  bal: ld._ledger[longSt.ft_ledgerOwner].ccyType_balance[fta.refCcyId],  fee: 0, take: 0 });
            otm = TakePayVars({ st: shortSt, delta: short_Delta, bal: ld._ledger[shortSt.ft_ledgerOwner].ccyType_balance[fta.refCcyId], fee: 0, take: 0 });
        }

        // apply settlement fees
        otm.fee = otm.bal >= a.feePerSide ? a.feePerSide : 0;
        itm.fee = itm.bal >= a.feePerSide ? a.feePerSide : 0;
        if (otm.fee + itm.fee > 0) {
            ld._ledger[a.feeAddrOwner].ccyType_balance[fta.refCcyId] += otm.fee + itm.fee;

            StructLib.emitTransferedLedgerCcy(StructLib.TransferCcyArgs({
                from: otm.st.ft_ledgerOwner, to: a.feeAddrOwner, ccyTypeId: fta.refCcyId, amount: uint256(otm.fee), transferType: StructLib.TransferType.TakePayFee }));

            StructLib.emitTransferedLedgerCcy(StructLib.TransferCcyArgs({
                from: itm.st.ft_ledgerOwner, to: a.feeAddrOwner, ccyTypeId: fta.refCcyId, amount: uint256(itm.fee), transferType: StructLib.TransferType.TakePayFee }));
        }
        otm.bal -= otm.fee;
        itm.bal -= itm.fee;

        // update last mark price
        // (gas - we could only update & use the short side's last price; but at the cost of weakening the validation on combineFtPos)
        shortSt.ft_lastMarkPrice = a.markPrice;
        longSt.ft_lastMarkPrice = a.markPrice; // (gas - could remove [with changes in combineFtPos validation])

        // cap OTM side at physical balance
        otm.take = otm.delta * -1;
        if (otm.take > otm.bal) {
            otm.take = otm.bal;
        }

        // apply take/pay currency movement
        // NOTE: balanced
        ld._ledger[otm.st.ft_ledgerOwner].ccyType_balance[fta.refCcyId] = otm.bal - (otm.take);
        ld._ledger[itm.st.ft_ledgerOwner].ccyType_balance[fta.refCcyId] = itm.bal + (otm.take);

        StructLib.emitTransferedLedgerCcy(StructLib.TransferCcyArgs({
           from: otm.st.ft_ledgerOwner, to: itm.st.ft_ledgerOwner, ccyTypeId: fta.refCcyId, amount: uint256(otm.take), transferType: StructLib.TransferType.TakePay }));

        emit TakePay(otm.st.ft_ledgerOwner, itm.st.ft_ledgerOwner, uint256(itm.delta), uint256(otm.take), a.feeAddrOwner, uint256(otm.fee), uint256(itm.fee), fta.refCcyId);
    }

    //
    // PUBLIC - SETTLEMENT: take & pay - v2 - central sweeping, unilateral unbalanced
    //
    struct TakePayVars2 {
        StructLib.PackedSt st;
        int256 delta;
        int256 bal;
        int256 fee;
        int256 take;
    }
    function takePay2(
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        StructLib.TakePayArgs2 memory a
    ) public {
        require(std._tt_Settle[a.tokTypeId] == StructLib.SettlementType.FUTURE, "Bad token settlement type");
        StructLib.FutureTokenTypeArgs storage fta = std._tt_ft[a.tokTypeId];
        //require(fta.contractSize > 0, "Unexpected token type FutureTokenTypeArgs");
        StructLib.PackedSt storage st = ld._sts[a.stId];
        //require(shortSt.batchId == 0 && shortSt.ft_price != 0, "Bad (unexpected data) on explicit short token");
        //require(shortSt.ft_ledgerOwner != address(0x0), "Bad token ledger owner on explicit short token");
        require(a.markPrice >= 0, "Bad markPrice"); // allow zero for marking
        // require(tokenExistsOnLedger(ld, a.tokTypeId, st.ft_ledgerOwner, a.stId), "Bad or missing ledger token type on supplied token");
        require(a.feePerSide >= 0, "Bad feePerSide");

        // get delta
        int256 delta = calcTakePay(fta, st, a.markPrice, st.ft_lastMarkPrice);

        // set vars
        TakePayVars2 memory v;
        v = TakePayVars2({ st: st, delta: delta, bal: ld._ledger[st.ft_ledgerOwner].ccyType_balance[fta.refCcyId], fee: 0, take: 0 });

        // apply settlement fee
        v.fee = v.bal >= a.feePerSide ? a.feePerSide : 0;
        v.bal -= v.fee;

        // update last mark price
        st.ft_lastMarkPrice = a.markPrice;

        // if pos is OTM, sweep take to central + fee
        // if pos is ITM, sweep from central - fee
        // NOTE: *** unbalanced *** ! (capped for take, uncapped for pay)
        if (v.delta < 0) {
            v.take = v.delta * -1;
            if (v.take > v.bal) { // *capped* OTM take at physical balance
                v.take = v.bal;
            }

            // take from OTM, sweep to central
            ld._ledger[v.st.ft_ledgerOwner].ccyType_balance[fta.refCcyId] = v.bal - (v.take);
            ld._ledger[a.feeAddrOwner].ccyType_balance[fta.refCcyId] += v.take + v.fee;

            StructLib.emitTransferedLedgerCcy(StructLib.TransferCcyArgs({
                from: v.st.ft_ledgerOwner, to: a.feeAddrOwner, ccyTypeId: fta.refCcyId, amount: uint256(v.take), transferType: StructLib.TransferType.SettleTake }));

            StructLib.emitTransferedLedgerCcy(StructLib.TransferCcyArgs({
                from: v.st.ft_ledgerOwner, to: a.feeAddrOwner, ccyTypeId: fta.refCcyId, amount: uint256(v.fee), transferType: StructLib.TransferType.TakePayFee }));

            emit TakePay2(v.st.ft_ledgerOwner, a.feeAddrOwner, fta.refCcyId, uint256(abs256(delta)), uint256(v.take), uint256(v.fee));
        }
        else if (v.delta > 0) { // *uncapped* ITM pay

            // TODO: ### how to handle central not enough funds!!!? surely must revert/abort...

            // sweep from central, pay to OTM
            ld._ledger[v.st.ft_ledgerOwner].ccyType_balance[fta.refCcyId] = v.bal + (v.take);
            ld._ledger[a.feeAddrOwner].ccyType_balance[fta.refCcyId] -= v.take - v.fee;

            StructLib.emitTransferedLedgerCcy(StructLib.TransferCcyArgs({
                from: a.feeAddrOwner, to: v.st.ft_ledgerOwner, ccyTypeId: fta.refCcyId, amount: uint256(v.take), transferType: StructLib.TransferType.SettlePay }));

            StructLib.emitTransferedLedgerCcy(StructLib.TransferCcyArgs({
                from: a.feeAddrOwner, to: v.st.ft_ledgerOwner, ccyTypeId: fta.refCcyId, amount: uint256(v.fee), transferType: StructLib.TransferType.TakePayFee }));

            emit TakePay2(a.feeAddrOwner, v.st.ft_ledgerOwner, fta.refCcyId, uint256(abs256(delta)), uint256(v.take), uint256(v.fee));
        }
        else { // null settlement

            // sweep fee only to central
            ld._ledger[v.st.ft_ledgerOwner].ccyType_balance[fta.refCcyId] = v.bal;
            ld._ledger[a.feeAddrOwner].ccyType_balance[fta.refCcyId] += v.fee;

            emit TakePay2(a.feeAddrOwner, v.st.ft_ledgerOwner, fta.refCcyId, 0, 0, uint256(v.fee));
        }
    }

    //
    // PUBLIC - SETTLEMENT: (optimization) combine n down to 1 positions; for execution post-settlement (take/pay)
    //
    // struct CombineFuturePosVars {
    // }
    function combineFtPos(
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        StructLib.CombinePositionArgs memory a
    ) public {
        require(std._tt_Settle[a.tokTypeId] == StructLib.SettlementType.FUTURE, "Bad token settlement type");
        //StructLib.FutureTokenTypeArgs storage fta = std._tt_ft[a.tokTypeId];

        int64 totQtyAbs = 0;
        int256 totPriceQtyAbs = 0;
        StructLib.PackedSt storage masterSt = ld._sts[a.master_StId];
        require(masterSt.batchId == 0 && masterSt.ft_price != 0, "Bad (unexpected data) on master token");
        require(masterSt.ft_lastMarkPrice != -1, "Bad last mark price on master token");
        require(tokenExistsOnLedger(ld, a.tokTypeId, masterSt.ft_ledgerOwner, a.master_StId), "Bad or missing ledger token type on master token");
        require(masterSt.mintedQty == masterSt.currentQty, "Unexpected quantity on master token");
        totQtyAbs += abs64(masterSt.currentQty);
        totPriceQtyAbs += abs64(masterSt.currentQty) * masterSt.ft_price;

        // delete child tokens from the master list
        int64 childQty = 0;
        for (uint256 x = 0; x < a.child_StIds.length ; x++) {
            StructLib.PackedSt storage childSt = ld._sts[a.child_StIds[x]];
            require(childSt.batchId == 0 && childSt.ft_price != 0, "Bad (unexpected data) on child token");
            require(childSt.ft_ledgerOwner == masterSt.ft_ledgerOwner, "Token ledger owner mismatch");
            require(childSt.ft_lastMarkPrice != -1, "Bad last mark price on child token");
            require(tokenExistsOnLedger(ld, a.tokTypeId, masterSt.ft_ledgerOwner, a.child_StIds[x]), "Bad or missing ledger token type on child token");
            require(childSt.ft_lastMarkPrice == masterSt.ft_lastMarkPrice, "Last mark price mismatch");
            require(childSt.mintedQty == childSt.currentQty, "Unexpected quantity on child token");

            childQty += childSt.currentQty;

            totQtyAbs += abs64(childSt.currentQty);
            totPriceQtyAbs += abs64(childSt.currentQty) * childSt.ft_price;
            delete ld._sts[a.child_StIds[x]];
        }

        // resize (grow/shrink) the master token
        // NOTE: we retain a closed position for record keeping (net zero currentQty)
        masterSt.mintedQty += childQty;
        masterSt.currentQty += childQty;
        masterSt.ft_price = int128(totPriceQtyAbs / totQtyAbs); // weighted average price of combined tokens

        // resize: recreate ledger entry tokenType list, with a single combined token
        delete ld._ledger[masterSt.ft_ledgerOwner].tokenType_stIds[a.tokTypeId];
        ld._ledger[masterSt.ft_ledgerOwner].tokenType_stIds[a.tokTypeId].push(a.master_StId);

        emit Combine(masterSt.ft_ledgerOwner, a.master_StId, a.child_StIds.length);
    }

    // returns uncapped take/pay settlment amount for the given position
    function calcTakePay(
        StructLib.FutureTokenTypeArgs storage fta,
        StructLib.PackedSt memory st,
        int128  markPrice,
        int128  ft_lastMarkPrice
    ) private view returns(int256) {
        int256 delta = (markPrice - (ft_lastMarkPrice == -1
                            ? st.ft_price
                            : ft_lastMarkPrice)) * fta.contractSize * st.currentQty;
        return delta;
    }

    // checks if the supplied token of supplied type is present on the supplied ledger entry
    function tokenExistsOnLedger(
        StructLib.LedgerStruct storage ld,
        uint256 tokTypeId,
        //StructLib.PackedSt memory st,
        address ledgerOwner,
        uint256 stId
    ) private view returns(bool) {
        for (uint256 x = 0; x < ld._ledger[ledgerOwner].tokenType_stIds[tokTypeId].length ; x++) {
            if (ld._ledger[ledgerOwner].tokenType_stIds[tokTypeId][x] == stId) {
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
    ) private view returns(int256) {

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
                * (std._tt_ft[tokTypeId].contractSize * (abs256(posSize)) * price)/*notional*/
            ) / 1000000/*decrease precision*/;
    }

    function abs256(int256 x) private pure returns(int256) { return x < 0 ? x * -1 : x; }
    function abs64(int64 x) private pure returns(int64) { return x < 0 ? x * -1 : x; }
}