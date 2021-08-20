// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9
// Certik (AD): locked compiler version
pragma solidity 0.8.5;

import "../Interfaces/StructLib.sol";

import "../StMaster/StMaster.sol";

library SpotFeeLib {
    event SetFeeTokFix(uint256 tokTypeId, address indexed ledgerOwner, uint256 fee_tokenQty_Fixed);
    event SetFeeCcyFix(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Fixed);
    event SetFeeTokBps(uint256 tokTypeId, address indexed ledgerOwner, uint256 fee_token_PercBips);
    event SetFeeCcyBps(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_PercBips);
    event SetFeeTokMin(uint256 tokTypeId, address indexed ledgerOwner, uint256 fee_token_Min);
    event SetFeeCcyMin(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Min);
    event SetFeeTokMax(uint256 tokTypeId, address indexed ledgerOwner, uint256 fee_token_Max);
    event SetFeeCcyMax(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Max);
    event SetFeeCcyPerMillion(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_perMillion);

    function setFee_TokType(
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        StructLib.FeeStruct storage globalFees,
        uint256 tokTypeId,
        address ledgerOwner,
        StructLib.SetFeeArgs memory a)
    public {
        require(tokTypeId >= 1 && tokTypeId <= std._tt_Count, "Bad tokTypeId");
        require(std._tt_settle[tokTypeId] == StructLib.SettlementType.SPOT, "Bad token settlement type");
        require(a.ccy_perMillion == 0, "ccy_perMillion unsupported for token-type fee");
        require(a.ccy_mirrorFee == false, "ccy_mirrorFee unsupported for token-type fee");

        StructLib.FeeStruct storage feeStruct = globalFees;
        if (ledgerOwner != address(0x0)) {
            StructLib.initLedgerIfNew(ld, ledgerOwner);

            feeStruct = ld._ledger[ledgerOwner].spot_customFees;
        }

        feeStruct.tokType_Set[tokTypeId] = a.fee_fixed != 0 || a.fee_percBips != 0 || a.fee_min != 0 || a.fee_max != 0;

        // Certik: (Minor) SFL-01 | Potentially Incorrect Clauses The linked if clauses emit an event when the value is being set, however, they do so when the value is simply non-zero rendering the first conditional questionable.
        // The original intent here was: to emit event if a fee is SET, or UNSET, *or if it's SET repeatedly* to the same value
        // But, maybe that's not a good idea. So instead, let's emit only if the fee value *changes*
        if (feeStruct.tok[tokTypeId].fee_fixed != a.fee_fixed)// || a.fee_fixed != 0)
            emit SetFeeTokFix(tokTypeId, ledgerOwner, a.fee_fixed);
        feeStruct.tok[tokTypeId].fee_fixed = a.fee_fixed;

        if (feeStruct.tok[tokTypeId].fee_percBips != a.fee_percBips)// || a.fee_percBips != 0)
            emit SetFeeTokBps(tokTypeId, ledgerOwner, a.fee_percBips);
        feeStruct.tok[tokTypeId].fee_percBips = a.fee_percBips;

        if (feeStruct.tok[tokTypeId].fee_min != a.fee_min)// || a.fee_min != 0)
            emit SetFeeTokMin(tokTypeId, ledgerOwner, a.fee_min);
        feeStruct.tok[tokTypeId].fee_min = a.fee_min;

        if (feeStruct.tok[tokTypeId].fee_max != a.fee_max)// || a.fee_max != 0)
            emit SetFeeTokMax(tokTypeId, ledgerOwner, a.fee_max);
        feeStruct.tok[tokTypeId].fee_max = a.fee_max;

        if (ld.contractType == StructLib.ContractType.CASHFLOW_CONTROLLER) {
            StMaster base = StMaster(std._tt_addr[tokTypeId]);
            base.setFee_TokType(tokTypeId,ledgerOwner, a);
        }
    }

    function setFee_CcyType(
        StructLib.LedgerStruct storage ld,
        StructLib.CcyTypesStruct storage ctd,
        StructLib.FeeStruct storage globalFees,
        uint256 ccyTypeId,
        address ledgerOwner,
        StructLib.SetFeeArgs memory a)
    public {
        require(ccyTypeId >= 1 && ccyTypeId <= ctd._ct_Count, "Bad ccyTypeId");

        StructLib.FeeStruct storage feeStruct = globalFees;
        if (ledgerOwner != address(0x0)) {
            StructLib.initLedgerIfNew(ld, ledgerOwner);

            feeStruct = ld._ledger[ledgerOwner].spot_customFees;
        }

        feeStruct.ccyType_Set[ccyTypeId] = a.fee_fixed != 0 || a.fee_percBips != 0 || a.fee_min != 0 || a.fee_max != 0 || a.ccy_perMillion != 0;

        if (feeStruct.ccy[ccyTypeId].fee_fixed != a.fee_fixed)// || a.fee_fixed != 0)
            emit SetFeeCcyFix(ccyTypeId, ledgerOwner, a.fee_fixed);
        feeStruct.ccy[ccyTypeId].fee_fixed = a.fee_fixed;

        if (feeStruct.ccy[ccyTypeId].fee_percBips != a.fee_percBips)// || a.fee_percBips != 0)
            emit SetFeeCcyBps(ccyTypeId, ledgerOwner, a.fee_percBips);
        feeStruct.ccy[ccyTypeId].fee_percBips = a.fee_percBips;

        if (feeStruct.ccy[ccyTypeId].fee_min != a.fee_min)// || a.fee_min != 0)
            emit SetFeeCcyMin(ccyTypeId, ledgerOwner, a.fee_min);
        feeStruct.ccy[ccyTypeId].fee_min = a.fee_min;

        if (feeStruct.ccy[ccyTypeId].fee_max != a.fee_max)// || a.fee_max != 0)
            emit SetFeeCcyMax(ccyTypeId, ledgerOwner, a.fee_max);
        feeStruct.ccy[ccyTypeId].fee_max = a.fee_max;

        if (feeStruct.ccy[ccyTypeId].ccy_perMillion != a.ccy_perMillion)// || a.ccy_perMillion != 0)
            emit SetFeeCcyPerMillion(ccyTypeId, ledgerOwner, a.ccy_perMillion);
        feeStruct.ccy[ccyTypeId].ccy_perMillion = a.ccy_perMillion;

        // urgh ^2
        feeStruct.ccy[ccyTypeId].ccy_mirrorFee = a.ccy_mirrorFee;
    }
}
