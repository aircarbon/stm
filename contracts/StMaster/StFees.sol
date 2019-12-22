pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/StructLib.sol";
import "../Libs/FeeLib.sol";

//
// NOTE: fees are applied ON TOP OF the supplied transfer amounts to the transfer() fn.
//       i.e. transfer amounts are not inclusive of fees, they are additional
//
contract StFees is Owned, StLedger {
    // GLOBAL FEES
    StructLib.FeeStruct globalFees;

    // fees accessor (all types)
    enum GetFeeType { CCY, TOK }
    
    /**
     * @dev Define fee structure for token type - global or per ledger entry
     * @param feeType Fee type: currency or token
     * @param typeId The currencyTypeId or tokenTypeId for which to return fees
     * @param ledgerOwner If > 0x0, returns the ledger (override) fee in effect for the address, else returns the global fee
     */
    function getFee(GetFeeType feeType, uint256 typeId, address ledgerOwner)
    public view returns(StructLib.SetFeeArgs memory) {
        StructLib.FeeStruct storage fs = ledgerOwner == address(0x0) ? globalFees : ledgerData._ledger[ledgerOwner].customFees;
        mapping(uint256 => StructLib.SetFeeArgs) storage fa = feeType == GetFeeType.CCY ? fs.ccy : fs.tok;
        return StructLib.SetFeeArgs( {
               fee_fixed: fa[typeId].fee_fixed,
            fee_percBips: fa[typeId].fee_percBips,
                 fee_min: fa[typeId].fee_min,
                 fee_max: fa[typeId].fee_max
        });
    }

    /**
     * @dev Define fee structure for token type - global or per ledger entry
     * @param tokenTypeId ST type
     * @param ledgerOwner The ledger address for which to set fee structure, or 0x0 to set global fee structure
     * @param feeArgs The fee structure to assign to the supplied leder entry address, or to the global fee structure
     */
    function setFee_TokType(uint256 tokenTypeId, address ledgerOwner, StructLib.SetFeeArgs memory feeArgs)
    public onlyOwner() onlyWhenReadWrite() {
        FeeLib.setFee_TokType(ledgerData, stTypesData, globalFees, tokenTypeId, ledgerOwner, feeArgs);
    }

    /**
     * @dev Define fee structure for currecy type - global or per ledger entry
     * @param ccyTypeId currecy type
     * @param ledgerOwner The ledger address for which to set fee structure, or 0x0 to set global fee structure
     * @param feeArgs The fee structure to assign to the supplied leder entry address, or to the global fee structure
     */
    function setFee_CcyType(uint256 ccyTypeId, address ledgerOwner, StructLib.SetFeeArgs memory feeArgs)
    public onlyOwner() onlyWhenReadWrite() {
        FeeLib.setFee_CcyType(ledgerData, ccyTypesData, globalFees, ccyTypeId, ledgerOwner, feeArgs);
    }

    /**
     * @dev Returns the global total quantity of token exchange fees paid, in the contract base unit
     */
    function getSecToken_totalExchangeFeesPaidQty()
    external view onlyOwner() returns (uint256) {
        return ledgerData._tokens_total.exchangeFeesPaidQty;
    }

    /**
     * @dev Returns the global total quantity of token originator fees paid, in the contract base unit
     */
    function getSecToken_totalOriginatorFeesPaidQty()
    external view onlyOwner() returns (uint256) {
        return ledgerData._tokens_total.originatorFeesPaidQty;
    }

    /**
     * @dev Returns the global total amount of currency exchange fees paid, for the supplied currency
     */
    function getCcy_totalExchangeFeesPaid(uint256 ccyTypeId)
    external view onlyOwner() returns (uint256) {
        return ledgerData._ccyType_totalFeesPaid[ccyTypeId];
    }
}