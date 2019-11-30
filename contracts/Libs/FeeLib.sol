pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";

library FeeLib {
    event SetFeeTokFix(uint256 tokenTypeId, address ledgerOwner, uint256 fee_tokenQty_Fixed);
    event SetFeeCcyFix(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_Fixed);

    event SetFeeTokBps(uint256 tokenTypeId, address ledgerOwner, uint256 fee_token_PercBips);
    event SetFeeCcyBps(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_PercBips);

    event SetFeeTokMin(uint256 tokenTypeId, address ledgerOwner, uint256 fee_token_Min);
    event SetFeeCcyMin(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_Min);

    event SetFeeTokMax(uint256 tokenTypeId, address ledgerOwner, uint256 fee_token_Max);
    event SetFeeCcyMax(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_Max);

    struct SetFeeArgs {
        uint256 fee_fixed;      // apply fixed a, if any
        uint256 fee_percBips;   // add a basis points a, if any - in basis points, i.e. minimum % = 1bp = 1/100 of 1% = 0.0001x
        uint256 fee_min;        // collar for a (if >0)
        uint256 fee_max;        // and cap for a, (if >0)
    }

    function setFee_TokType(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.StTypesStruct storage stTypesData,
        StructLib.FeeStruct storage globalFees,
        uint256 tokenTypeId,
        address ledgerOwner,
        SetFeeArgs memory a)
    public {
        require(tokenTypeId >= 0 && tokenTypeId < stTypesData._count_tokenTypes, "Invalid ST type");

        StructLib.FeeStruct storage feeStruct = globalFees;
        if (ledgerOwner != address(0x0)) {
            require(ledgerData._ledger[ledgerOwner].exists == true, "Invalid ledger owner");
            feeStruct = ledgerData._ledger[ledgerOwner].customFees;
            feeStruct.tokType_Set[tokenTypeId] = a.fee_fixed != 0 || a.fee_percBips != 0 || a.fee_min != 0 || a.fee_max != 0;
        }

        if (feeStruct.tokType_Fix[tokenTypeId] != a.fee_fixed || a.fee_fixed != 0)
            emit SetFeeTokFix(tokenTypeId, ledgerOwner, a.fee_fixed);
        feeStruct.tokType_Fix[tokenTypeId] = a.fee_fixed;

        if (feeStruct.tokType_Bps[tokenTypeId] != a.fee_percBips || a.fee_percBips != 0)
            emit SetFeeTokBps(tokenTypeId, ledgerOwner, a.fee_percBips);
        feeStruct.tokType_Bps[tokenTypeId] = a.fee_percBips;

        if (feeStruct.tokType_Min[tokenTypeId] != a.fee_min || a.fee_min != 0)
            emit SetFeeTokMin(tokenTypeId, ledgerOwner, a.fee_min);
        feeStruct.tokType_Min[tokenTypeId] = a.fee_min;

        if (feeStruct.tokType_Max[tokenTypeId] != a.fee_max || a.fee_max != 0)
            emit SetFeeTokMax(tokenTypeId, ledgerOwner, a.fee_max);
        feeStruct.tokType_Max[tokenTypeId] = a.fee_max;
    }

    function setFee_CcyType(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CcyTypesStruct storage ccyTypesData,
        StructLib.FeeStruct storage globalFees,
        uint256 ccyTypeId,
        address ledgerOwner,
        FeeLib.SetFeeArgs memory a)
    public {
        require(ccyTypeId >= 0 && ccyTypeId < ccyTypesData._count_ccyTypes, "Invalid currency type");

        StructLib.FeeStruct storage feeStruct = globalFees;
        if (ledgerOwner != address(0x0)) {
            require(ledgerData._ledger[ledgerOwner].exists == true, "Invalid ledger owner");
            feeStruct = ledgerData._ledger[ledgerOwner].customFees;
            feeStruct.ccyType_Set[ccyTypeId] = a.fee_fixed != 0 || a.fee_percBips != 0 || a.fee_min != 0 || a.fee_max != 0;
        }

        if (feeStruct.ccyType_Fix[ccyTypeId] != a.fee_fixed || a.fee_fixed != 0)
            emit SetFeeCcyFix(ccyTypeId, ledgerOwner, a.fee_fixed);
        feeStruct.ccyType_Fix[ccyTypeId] = a.fee_fixed;

        if (feeStruct.ccyType_Bps[ccyTypeId] != a.fee_percBips || a.fee_percBips != 0)
            emit SetFeeCcyBps(ccyTypeId, ledgerOwner, a.fee_percBips);
        feeStruct.ccyType_Bps[ccyTypeId] = a.fee_percBips;

        if (feeStruct.ccyType_Min[ccyTypeId] != a.fee_min || a.fee_min != 0)
            emit SetFeeCcyMin(ccyTypeId, ledgerOwner, a.fee_min);
        feeStruct.ccyType_Min[ccyTypeId] = a.fee_min;

        if (feeStruct.ccyType_Max[ccyTypeId] != a.fee_max || a.fee_max != 0)
            emit SetFeeCcyMax(ccyTypeId, ledgerOwner, a.fee_max);
        feeStruct.ccyType_Max[ccyTypeId] = a.fee_max;
    }
}
