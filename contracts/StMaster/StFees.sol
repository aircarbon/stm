pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/StructLib.sol";

contract StFees is Owned, StLedger {
    event SetFeeTokFix(uint256 tokenTypeId, address ledgerOwner, uint256 fee_tokenQty_Fixed);
    event SetFeeCcyFix(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_Fixed);

    event SetFeeTokBps(uint256 tokenTypeId, address ledgerOwner, uint256 fee_token_PercBips);
    event SetFeeCcyBps(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_PercBips);

    event SetFeeTokMin(uint256 tokenTypeId, address ledgerOwner, uint256 fee_token_Min);
    event SetFeeCcyMin(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_Min);

    event SetFeeTokMax(uint256 tokenTypeId, address ledgerOwner, uint256 fee_token_Max);
    event SetFeeCcyMax(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_Max);

    //
    // PRI 1
    // TODO: fees - ledger fees: read in transferLib
    // TODO: test clearing ledger fees
    // TODO: ledger fees one side, global fees other side
    //
    // TODO: UI/UX in admin...
    //
    // TODO: fees - getFees (for pre-trade)...
    // TODO: fees - additional set of fees to originator on each trade (i.e. data on batch struct)...
    //

    // GLOBAL FEES
    StructLib.FeeStruct globalFees;

    // accessors - global fees (can't return mappings)
    function globalFee_tokType_Fix(uint256 tokenTypeId) public  view returns (uint256) { return globalFees.tokType_Fix[tokenTypeId]; }
    function globalFee_tokType_Bps(uint256 tokenTypeId) public  view returns (uint256) { return globalFees.tokType_Bps[tokenTypeId]; }
    function globalFee_tokType_Min(uint256 tokenTypeId) public  view returns (uint256) { return globalFees.tokType_Min[tokenTypeId]; }
    function globalFee_tokType_Max(uint256 tokenTypeId) public  view returns (uint256) { return globalFees.tokType_Max[tokenTypeId]; }
    function globalFee_ccyType_Fix(uint256 ccyTypeId)   public  view returns (uint256) { return globalFees.ccyType_Fix[ccyTypeId]; }
    function globalFee_ccyType_Bps(uint256 ccyTypeId)   public  view returns (uint256) { return globalFees.ccyType_Bps[ccyTypeId]; }
    function globalFee_ccyType_Min(uint256 ccyTypeId)   public  view returns (uint256) { return globalFees.ccyType_Min[ccyTypeId]; }
    function globalFee_ccyType_Max(uint256 ccyTypeId)   public  view returns (uint256) { return globalFees.ccyType_Max[ccyTypeId]; }

    // accessors - ledger owner fees (can't return mappings)
    function ledgerFee_tokType_Fix(uint256 tokenTypeId, address ledgerOwner) public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.tokType_Fix[tokenTypeId]; }
    function ledgerFee_tokType_Bps(uint256 tokenTypeId, address ledgerOwner) public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.tokType_Bps[tokenTypeId]; }
    function ledgerFee_tokType_Min(uint256 tokenTypeId, address ledgerOwner) public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.tokType_Min[tokenTypeId]; }
    function ledgerFee_tokType_Max(uint256 tokenTypeId, address ledgerOwner) public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.tokType_Max[tokenTypeId]; }
    function ledgerFee_ccyType_Fix(uint256 ccyTypeId, address ledgerOwner)   public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.ccyType_Fix[ccyTypeId]; }
    function ledgerFee_ccyType_Bps(uint256 ccyTypeId, address ledgerOwner)   public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.ccyType_Bps[ccyTypeId]; }
    function ledgerFee_ccyType_Min(uint256 ccyTypeId, address ledgerOwner)   public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.ccyType_Min[ccyTypeId]; }
    function ledgerFee_ccyType_Max(uint256 ccyTypeId, address ledgerOwner)   public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.ccyType_Max[ccyTypeId]; }

    struct FeeArgs {
        uint256 fee_fixed;      // apply fixed fee, if any
        uint256 fee_percBips;   // add a basis points fee, if any - in basis points, i.e. minimum % = 1bp = 1/100 of 1% = 0.0001x
        uint256 fee_min;        // collar for fee (if >0)
        uint256 fee_max;        // and cap for fee, (if >0)
    }

    // NOTE: fees are applied ON TOP OF the supplied transfer amounts to the transfer() fn.
    //       i.e. transfer amounts are not inclusive of fees, they are additional

    /**
     * @dev Define fee structure for token type - global or per ledger entry
     * @param tokenTypeId ST type
     * @param ledgerOwner The ledger address for which to set fee structure, or 0x0 to set global fee structure
     * @param fee The fee structure to assign to the supplied leder entry address, or to the global fee structure
     */
    function setFee_TokType(uint256 tokenTypeId, address ledgerOwner, FeeArgs memory fee) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(tokenTypeId >= 0 && tokenTypeId < stTypesData._count_tokenTypes, "Invalid ST type");

        StructLib.FeeStruct storage feeStruct = globalFees;
        if (ledgerOwner != address(0x0)) {
            require(ledgerData._ledger[ledgerOwner].exists == true, "Invalid ledger owner");
            feeStruct = ledgerData._ledger[ledgerOwner].customFees;
            feeStruct.tokType_Set[tokenTypeId] = fee.fee_fixed != 0 || fee.fee_percBips != 0 || fee.fee_min != 0 || fee.fee_max != 0;
        }

        if (feeStruct.tokType_Fix[tokenTypeId] != fee.fee_fixed || fee.fee_fixed != 0)
            emit SetFeeTokFix(tokenTypeId, ledgerOwner, fee.fee_fixed);
        feeStruct.tokType_Fix[tokenTypeId] = fee.fee_fixed;

        if (feeStruct.tokType_Bps[tokenTypeId] != fee.fee_percBips || fee.fee_percBips != 0)
            emit SetFeeTokBps(tokenTypeId, ledgerOwner, fee.fee_percBips);
        feeStruct.tokType_Bps[tokenTypeId] = fee.fee_percBips;

        if (feeStruct.tokType_Min[tokenTypeId] != fee.fee_min || fee.fee_min != 0)
            emit SetFeeTokMin(tokenTypeId, ledgerOwner, fee.fee_min);
        feeStruct.tokType_Min[tokenTypeId] = fee.fee_min;

        if (feeStruct.tokType_Max[tokenTypeId] != fee.fee_max || fee.fee_max != 0)
            emit SetFeeTokMax(tokenTypeId, ledgerOwner, fee.fee_max);
        feeStruct.tokType_Max[tokenTypeId] = fee.fee_max;
    }

    /**
     * @dev Define fee structure for currecy type - global or per ledger entry
     * @param ccyTypeId currecy type
     * @param ledgerOwner The ledger address for which to set fee structure, or 0x0 to set global fee structure
     * @param fee The fee structure to assign to the supplied leder entry address, or to the global fee structure
     */
    function setFee_CcyType(uint256 ccyTypeId, address ledgerOwner, FeeArgs memory fee) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(ccyTypeId >= 0 && ccyTypeId < ccyTypesData._count_ccyTypes, "Invalid currency type");

        StructLib.FeeStruct storage feeStruct = globalFees;
        if (ledgerOwner != address(0x0)) {
            require(ledgerData._ledger[ledgerOwner].exists == true, "Invalid ledger owner");
            feeStruct = ledgerData._ledger[ledgerOwner].customFees;
            feeStruct.ccyType_Set[ccyTypeId] = fee.fee_fixed != 0 || fee.fee_percBips != 0 || fee.fee_min != 0 || fee.fee_max != 0;
        }

        if (feeStruct.ccyType_Fix[ccyTypeId] != fee.fee_fixed || fee.fee_fixed != 0)
            emit SetFeeCcyFix(ccyTypeId, ledgerOwner, fee.fee_fixed);
        feeStruct.ccyType_Fix[ccyTypeId] = fee.fee_fixed;

        if (feeStruct.ccyType_Bps[ccyTypeId] != fee.fee_percBips || fee.fee_percBips != 0)
            emit SetFeeCcyBps(ccyTypeId, ledgerOwner, fee.fee_percBips);
        feeStruct.ccyType_Bps[ccyTypeId] = fee.fee_percBips;

        if (feeStruct.ccyType_Min[ccyTypeId] != fee.fee_min || fee.fee_min != 0)
            emit SetFeeCcyMin(ccyTypeId, ledgerOwner, fee.fee_min);
        feeStruct.ccyType_Min[ccyTypeId] = fee.fee_min;

        if (feeStruct.ccyType_Max[ccyTypeId] != fee.fee_max || fee.fee_max != 0)
            emit SetFeeCcyMax(ccyTypeId, ledgerOwner, fee.fee_max);
        feeStruct.ccyType_Max[ccyTypeId] = fee.fee_max;
    }

    /**
     * @dev Returns the global total quantity of token fees paid, in the contract base unit
     */
    function getSecToken_totalFeesPaidQty() external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return ledgerData._tokens_totalFeesPaidQty;
    }

    /**
     * @dev Returns the global total amount of currency fees paid, for the supplied currency
     */
    function getCcy_totalFeesPaidAmount(uint256 ccyTypeId) external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return ledgerData._ccyType_totalFeesPaid[ccyTypeId];
    }
}