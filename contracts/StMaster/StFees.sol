// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity >=0.4.21 <=0.7.1;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/SpotFeeLib.sol";

//
// NOTE: fees are applied ON TOP OF the supplied transfer amounts to the transfer() fn.
//       i.e. transfer amounts are not inclusive of fees, they are additional
//
contract StFees is
    Owned, StLedger {

    enum GetFeeType { CCY, TOK }

    // GLOBAL FEES
    StructLib.FeeStruct globalFees;

    //constructor() public {}

    function getFee(GetFeeType feeType, uint256 typeId, address ledgerOwner)
    external view onlyOwner() returns(StructLib.SetFeeArgs memory) {
        StructLib.FeeStruct storage fs = ledgerOwner == address(0x0) ? globalFees : ld._ledger[ledgerOwner].spot_customFees;
        mapping(uint256 => StructLib.SetFeeArgs) storage fa = feeType == GetFeeType.CCY ? fs.ccy : fs.tok;
        return StructLib.SetFeeArgs( {
               fee_fixed: uint256(fa[typeId].fee_fixed),
            fee_percBips: uint256(fa[typeId].fee_percBips),
                 fee_min: uint256(fa[typeId].fee_min),
                 fee_max: uint256(fa[typeId].fee_max),
          ccy_perMillion: uint256(fa[typeId].ccy_perMillion),
           ccy_mirrorFee: fa[typeId].ccy_mirrorFee
        });
    }

    function setFee_TokType(uint256 tokTypeId, address ledgerOwner, StructLib.SetFeeArgs memory feeArgs)
    public onlyOwner() onlyWhenReadWrite() {
        SpotFeeLib.setFee_TokType(ld, std, globalFees, tokTypeId, ledgerOwner, feeArgs);
    }

    function setFee_CcyType(uint256 ccyTypeId, address ledgerOwner, StructLib.SetFeeArgs memory feeArgs)
    public onlyOwner() onlyWhenReadWrite() {
        SpotFeeLib.setFee_CcyType(ld, ctd, globalFees, ccyTypeId, ledgerOwner, feeArgs);
    }

    // 24k
    // function getSecToken_totalExchangeFeesPaidQty()
    // external view returns (uint256) {
    //     return ld._spot_total.exchangeFeesPaidQty;
    // }
    // function getSecToken_totalOriginatorFeesPaidQty()
    // external view returns (uint256) {
    //     return ld._spot_total.originatorFeesPaidQty;
    // }
    // function getCcy_totalExchangeFeesPaid(uint256 ccyTypeId)
    // external view returns (uint256) {
    //     return ld._ccyType_totalFeesPaid[ccyTypeId];
    // }

}