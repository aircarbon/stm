// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9
pragma solidity 0.8.5;

import "./StLedger.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/SpotFeeLib.sol";

//
// NOTE: fees are applied ON TOP OF the supplied transfer amounts to the transfer() fn.
//       i.e. transfer amounts are not inclusive of fees, they are additional
//

 /**
  * @title Security Token Fee Management
  * @author Dominic Morris (7-of-9)
  * @notice contract for on-chain fee management
  * <pre>   - inherits Owned ownership smart contract</pre>
  * <pre>   - inherits StLedger security token ledger contract</pre>
  * <pre>   - uses StructLib interface library</pre>
  * <pre>   - uses SpotFeeLib runtime library</pre>
  */
  
abstract contract StFees is
    StLedger {

    enum GetFeeType { CCY, TOK }

    // GLOBAL FEES
    StructLib.FeeStruct globalFees;

    /**
     * @dev returns fee structure
     * @param feeType 0: currency fee<br/>1: token fee
     * @param typeId fee type unique identifier
     * @param ledgerOwner account address of the ledger owner
     * @return fee
     * @param fee returns the fees structure based on fee type selection args
     */
    function getFee(GetFeeType feeType, uint256 typeId, address ledgerOwner)
    external view onlyOwner() returns(StructLib.SetFeeArgs memory fee) {
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

    /**
     * @dev set fee for a token type
     * @param tokTypeId token type identifier
     * @param ledgerOwner account address of the ledger owner
     * @param feeArgs fee_fixed: fixed fee on transfer or trade</br>
     * fee_percBips: fixed fee % on transfer or trade</br>
     * fee_min: minimum fee on transfer or trade - collar/br>
     * fee_max: maximum fee on transfer or trade - cap</br>
     * ccy_perMillion: N/A</br>
     * ccy_mirrorFee: N/A
     */
    function setFee_TokType(uint256 tokTypeId, address ledgerOwner, StructLib.SetFeeArgs memory feeArgs)
    public onlyOwner() onlyWhenReadWrite() {
        SpotFeeLib.setFee_TokType(ld, std, globalFees, tokTypeId, ledgerOwner, feeArgs);
    }

//#if process.env.CONTRACT_TYPE !== 'CASHFLOW_BASE'
    /**
     * @dev set fee for a currency type
     * @param ccyTypeId currency type identifier
     * @param ledgerOwner account address of the ledger owner
     * @param feeArgs fee_fixed: fixed fee on transfer or trade</br>
     * fee_percBips: fixed fee % on transfer or trade</br>
     * fee_min: minimum fee on transfer or trade - collar/br>
     * fee_max: maximum fee on transfer or trade - cap</br>
     * ccy_perMillion: trade - fixed ccy fee per million of trade counterparty's consideration token qty</br>
     * ccy_mirrorFee: trade - apply this ccy fee structure to counterparty's ccy balance, post trade
     */
    function setFee_CcyType(uint256 ccyTypeId, address ledgerOwner, StructLib.SetFeeArgs memory feeArgs)
    public onlyOwner() onlyWhenReadWrite() {
        SpotFeeLib.setFee_CcyType(ld, ctd, globalFees, ccyTypeId, ledgerOwner, feeArgs);
    }
//#endif
}
