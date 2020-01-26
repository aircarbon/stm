pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/IStFees.sol";

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/StructLib.sol";
import "../Libs/FeeLib.sol";

//
// NOTE: fees are applied ON TOP OF the supplied transfer amounts to the transfer() fn.
//       i.e. transfer amounts are not inclusive of fees, they are additional
//
contract StFees is IStFees,
    Owned, StLedger {

    // GLOBAL FEES
    StructLib.FeeStruct globalFees;

    function getFee(GetFeeType feeType, uint256 typeId, address ledgerOwner)
    external view onlyOwner() returns(StructLib.SetFeeArgs memory) {
        StructLib.FeeStruct storage fs = ledgerOwner == address(0x0) ? globalFees : ledgerData._ledger[ledgerOwner].customFees;
        mapping(uint256 => StructLib.SetFeeArgs) storage fa = feeType == GetFeeType.CCY ? fs.ccy : fs.tok;
        return StructLib.SetFeeArgs( {
               fee_fixed: fa[typeId].fee_fixed,
            fee_percBips: fa[typeId].fee_percBips,
                 fee_min: fa[typeId].fee_min,
                 fee_max: fa[typeId].fee_max
        });
    }

    function getSecToken_totalExchangeFeesPaidQty()
    external view onlyOwner() returns (uint256) {
        return ledgerData._tokens_total.exchangeFeesPaidQty;
    }

    function getSecToken_totalOriginatorFeesPaidQty()
    external view onlyOwner() returns (uint256) {
        return ledgerData._tokens_total.originatorFeesPaidQty;
    }

    function getCcy_totalExchangeFeesPaid(uint256 ccyTypeId)
    external view onlyOwner() returns (uint256) {
        return ledgerData._ccyType_totalFeesPaid[ccyTypeId];
    }

    function setFee_TokType(uint256 tokenTypeId, address ledgerOwner, StructLib.SetFeeArgs memory feeArgs)
    public onlyOwner() onlyWhenReadWrite() {
        FeeLib.setFee_TokType(ledgerData, stTypesData, globalFees, tokenTypeId, ledgerOwner, feeArgs);
    }

    function setFee_CcyType(uint256 ccyTypeId, address ledgerOwner, StructLib.SetFeeArgs memory feeArgs)
    public onlyOwner() onlyWhenReadWrite() {
        FeeLib.setFee_CcyType(ledgerData, ccyTypesData, globalFees, ccyTypeId, ledgerOwner, feeArgs);
    }
}