pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/StructLib.sol";

contract StFees is Owned, StLedger {
    event SetFeeTokFix(uint256 tokenTypeId, uint256 fee_tokenQty_Fixed);
    event SetFeeCcyFix(uint256 ccyTypeId, uint256 fee_ccy_Fixed);

    event SetFeeTokBps(uint256 tokenTypeId, uint256 fee_token_PercBips);
    event SetFeeCcyBps(uint256 ccyTypeId, uint256 fee_ccy_PercBips);

    event SetFeeTokMin(uint256 tokenTypeId, uint256 fee_token_Min);
    event SetFeeCcyMin(uint256 ccyTypeId, uint256 fee_ccy_Min);

    event SetFeeTokMax(uint256 tokenTypeId, uint256 fee_token_Max);
    event SetFeeCcyMax(uint256 ccyTypeId, uint256 fee_ccy_Max);

    //
    // PRI 1
    // TODO: fees - structure override on ledger level...
    // TODO: fees - getFees (for pre-trade)...
    // TODO: fees - additional set of fees to originator on each trade (i.e. data on batch struct)...
    //

    // GLOBAL FEES
    StructLib.FeeStruct globalFees;

    function fee_tokType_Fix(uint256 tokenTypeId) public  view returns (uint256) { return globalFees.fee_tokType_Fix[tokenTypeId]; }
    function fee_tokType_Bps(uint256 tokenTypeId) public  view returns (uint256) { return globalFees.fee_tokType_Bps[tokenTypeId]; }
    function fee_tokType_Min(uint256 tokenTypeId) public  view returns (uint256) { return globalFees.fee_tokType_Min[tokenTypeId]; }
    function fee_tokType_Max(uint256 tokenTypeId) public  view returns (uint256) { return globalFees.fee_tokType_Max[tokenTypeId]; }

    function fee_ccyType_Fix(uint256 ccyTypeId)   public  view returns (uint256) { return globalFees.fee_ccyType_Fix[ccyTypeId]; }
    function fee_ccyType_Bps(uint256 ccyTypeId)   public  view returns (uint256) { return globalFees.fee_ccyType_Bps[ccyTypeId]; }
    function fee_ccyType_Min(uint256 ccyTypeId)   public  view returns (uint256) { return globalFees.fee_ccyType_Min[ccyTypeId]; }
    function fee_ccyType_Max(uint256 ccyTypeId)   public  view returns (uint256) { return globalFees.fee_ccyType_Max[ccyTypeId]; }

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
    function setGlobalFee_TokType(uint256 tokenTypeId, address ledgerOwner, FeeArgs memory fee) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(tokenTypeId >= 0 && tokenTypeId < stTypesData._count_tokenTypes, "Invalid ST type");

        StructLib.FeeStruct storage feeStruct = globalFees;
        if (ledgerOwner != address(0x0)) {
            require(ledgerData._ledger[ledgerOwner].exists == true, "Invalid ledger owner");
            //...
        }

        if (feeStruct.fee_tokType_Fix[tokenTypeId] != fee.fee_fixed || fee.fee_fixed != 0)
            emit SetFeeTokFix(tokenTypeId, fee.fee_fixed);
        feeStruct.fee_tokType_Fix[tokenTypeId] = fee.fee_fixed;

        if (feeStruct.fee_tokType_Bps[tokenTypeId] != fee.fee_percBips || fee.fee_percBips != 0)
            emit SetFeeTokBps(tokenTypeId, fee.fee_percBips);
        feeStruct.fee_tokType_Bps[tokenTypeId] = fee.fee_percBips;

        if (feeStruct.fee_tokType_Min[tokenTypeId] != fee.fee_min || fee.fee_min != 0)
            emit SetFeeTokMin(tokenTypeId, fee.fee_min);
        feeStruct.fee_tokType_Min[tokenTypeId] = fee.fee_min;

        if (feeStruct.fee_tokType_Max[tokenTypeId] != fee.fee_max || fee.fee_max != 0)
            emit SetFeeTokMax(tokenTypeId, fee.fee_max);
        feeStruct.fee_tokType_Max[tokenTypeId] = fee.fee_max;
    }

    /**
     * @dev Define fee structure for currecy type - global or per ledger entry
     * @param ccyTypeId currecy type
     * @param ledgerOwner The ledger address for which to set fee structure, or 0x0 to set global fee structure
     * @param fee The fee structure to assign to the supplied leder entry address, or to the global fee structure
     */
    function setGlobalFee_CcyType(uint256 ccyTypeId, address ledgerOwner, FeeArgs memory fee) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(ccyTypeId >= 0 && ccyTypeId < ccyTypesData._count_ccyTypes, "Invalid currency type");

        StructLib.FeeStruct storage feeStruct = globalFees;
        if (ledgerOwner != address(0x0)) {
            require(ledgerData._ledger[ledgerOwner].exists == true, "Invalid ledger owner");
            //...
        }

        if (feeStruct.fee_ccyType_Fix[ccyTypeId] != fee.fee_fixed || fee.fee_fixed != 0)
            emit SetFeeCcyFix(ccyTypeId, fee.fee_fixed);
        feeStruct.fee_ccyType_Fix[ccyTypeId] = fee.fee_fixed;

        if (feeStruct.fee_ccyType_Bps[ccyTypeId] != fee.fee_percBips || fee.fee_percBips != 0)
            emit SetFeeCcyBps(ccyTypeId, fee.fee_percBips);
        feeStruct.fee_ccyType_Bps[ccyTypeId] = fee.fee_percBips;

        if (feeStruct.fee_ccyType_Min[ccyTypeId] != fee.fee_min || fee.fee_min != 0)
            emit SetFeeCcyMin(ccyTypeId, fee.fee_min);
        feeStruct.fee_ccyType_Min[ccyTypeId] = fee.fee_min;

        if (feeStruct.fee_ccyType_Max[ccyTypeId] != fee.fee_max || fee.fee_max != 0)
            emit SetFeeCcyMax(ccyTypeId, fee.fee_max);
        feeStruct.fee_ccyType_Max[ccyTypeId] = fee.fee_max;
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