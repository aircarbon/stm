pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

library FeeLib {
    event SetFeeTokFix(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_tokenQty_Fixed);
    event SetFeeCcyFix(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Fixed);
    event SetFeeTokBps(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_token_PercBips);
    event SetFeeCcyBps(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_PercBips);
    event SetFeeTokMin(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_token_Min);
    event SetFeeCcyMin(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Min);
    event SetFeeTokMax(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_token_Max);
    event SetFeeCcyMax(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Max);

    function setFee_TokType(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.StTypesStruct storage stTypesData,
        StructLib.FeeStruct storage globalFees,
        uint256 tokenTypeId,
        address ledgerOwner,
        StructLib.SetFeeArgs memory a)
    public {
        require(tokenTypeId >= 1 && tokenTypeId <= stTypesData._count_tokenTypes, "Bad tokenTypeId");

        StructLib.FeeStruct storage feeStruct = globalFees;
        if (ledgerOwner != address(0x0)) {
            require(ledgerData._ledger[ledgerOwner].exists == true, "Bad ledgerOwner");
            feeStruct = ledgerData._ledger[ledgerOwner].customFees;
        }

        feeStruct.tokType_Set[tokenTypeId] = a.fee_fixed != 0 || a.fee_percBips != 0 || a.fee_min != 0 || a.fee_max != 0;

        if (feeStruct.tok[tokenTypeId].fee_fixed != a.fee_fixed || a.fee_fixed != 0)
            emit SetFeeTokFix(tokenTypeId, ledgerOwner, a.fee_fixed);
        feeStruct.tok[tokenTypeId].fee_fixed = a.fee_fixed;

        if (feeStruct.tok[tokenTypeId].fee_percBips != a.fee_percBips || a.fee_percBips != 0)
            emit SetFeeTokBps(tokenTypeId, ledgerOwner, a.fee_percBips);
        feeStruct.tok[tokenTypeId].fee_percBips = a.fee_percBips;

        if (feeStruct.tok[tokenTypeId].fee_min != a.fee_min || a.fee_min != 0)
            emit SetFeeTokMin(tokenTypeId, ledgerOwner, a.fee_min);
        feeStruct.tok[tokenTypeId].fee_min = a.fee_min;

        if (feeStruct.tok[tokenTypeId].fee_max != a.fee_max || a.fee_max != 0)
            emit SetFeeTokMax(tokenTypeId, ledgerOwner, a.fee_max);
        feeStruct.tok[tokenTypeId].fee_max = a.fee_max;
    }

    function setFee_CcyType(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CcyTypesStruct storage ccyTypesData,
        StructLib.FeeStruct storage globalFees,
        uint256 ccyTypeId,
        address ledgerOwner,
        StructLib.SetFeeArgs memory a)
    public {
        require(ccyTypeId >= 1 && ccyTypeId <= ccyTypesData._count_ccyTypes, "Bad ccyTypeId");

        StructLib.FeeStruct storage feeStruct = globalFees;
        if (ledgerOwner != address(0x0)) {
            require(ledgerData._ledger[ledgerOwner].exists == true, "Bad ledgerOwner");
            feeStruct = ledgerData._ledger[ledgerOwner].customFees;
        }

        feeStruct.ccyType_Set[ccyTypeId] = a.fee_fixed != 0 || a.fee_percBips != 0 || a.fee_min != 0 || a.fee_max != 0;

        if (feeStruct.ccy[ccyTypeId].fee_fixed != a.fee_fixed || a.fee_fixed != 0)
            emit SetFeeCcyFix(ccyTypeId, ledgerOwner, a.fee_fixed);
        feeStruct.ccy[ccyTypeId].fee_fixed = a.fee_fixed;

        if (feeStruct.ccy[ccyTypeId].fee_percBips != a.fee_percBips || a.fee_percBips != 0)
            emit SetFeeCcyBps(ccyTypeId, ledgerOwner, a.fee_percBips);
        feeStruct.ccy[ccyTypeId].fee_percBips = a.fee_percBips;

        if (feeStruct.ccy[ccyTypeId].fee_min != a.fee_min || a.fee_min != 0)
            emit SetFeeCcyMin(ccyTypeId, ledgerOwner, a.fee_min);
        feeStruct.ccy[ccyTypeId].fee_min = a.fee_min;

        if (feeStruct.ccy[ccyTypeId].fee_max != a.fee_max || a.fee_max != 0)
            emit SetFeeCcyMax(ccyTypeId, ledgerOwner, a.fee_max);
        feeStruct.ccy[ccyTypeId].fee_max = a.fee_max;
    }
}
