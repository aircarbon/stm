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

    //
    // PRI 1
    // TODO: fees - MULTI-FEES tests, i.e. fixed + at same time...
    // TODO: fees - CAP/COLLAR + tests...
    //
    // TODO: fees - structure override on ledger level...
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

    // STANDARDIZED FEE STRUCT
    struct Fee { // TODO: move this to StructLib, so it can also be used on the ledger
        uint256 fee_fixed;      // apply fixed fee, if any
        uint256 fee_percBips;   // add a basis points fee, if any - in basis points, i.e. minimum % = 1bp = 1/100 of 1% = 0.0001x
        uint256 fee_min;        // collar
        uint256 fee_max;        // and cap
    }
    /**
     * Global Fee Structure
     * NOTE: fees are applied ON TOP OF the supplied transfer amounts to the transfer() fn.
     *       i.e. transfer amounts are not inclusive of fees, they are additional
     */
    function setGlobalFee_TokType(uint256 tokenTypeId, Fee memory fee) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(tokenTypeId >= 0 && tokenTypeId < stTypesData._count_tokenTypes, "Invalid ST type");

        if (globalFees.fee_tokType_Fix[tokenTypeId] != fee.fee_fixed || fee.fee_fixed != 0)
            emit SetFeeTokFix(tokenTypeId, fee.fee_fixed);
        globalFees.fee_tokType_Fix[tokenTypeId] = fee.fee_fixed;

        if (globalFees.fee_tokType_Bps[tokenTypeId] != fee.fee_percBips || fee.fee_percBips != 0)
            emit SetFeeTokBps(tokenTypeId, fee.fee_percBips);
        globalFees.fee_tokType_Bps[tokenTypeId] = fee.fee_percBips;

        globalFees.fee_tokType_Min[tokenTypeId] = fee.fee_min;
        globalFees.fee_tokType_Max[tokenTypeId] = fee.fee_max;
    }
    function setGlobalFee_CcyType(uint256 ccyTypeId, Fee memory fee) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(ccyTypeId >= 0 && ccyTypeId < ccyTypesData._count_ccyTypes, "Invalid currency type");

        if (globalFees.fee_ccyType_Fix[ccyTypeId] != fee.fee_fixed || fee.fee_fixed != 0)
            emit SetFeeCcyFix(ccyTypeId, fee.fee_fixed);
        globalFees.fee_ccyType_Fix[ccyTypeId] = fee.fee_fixed;

        if (globalFees.fee_ccyType_Bps[ccyTypeId] != fee.fee_percBips || fee.fee_percBips != 0)
            emit SetFeeCcyBps(ccyTypeId, fee.fee_percBips);
        globalFees.fee_ccyType_Bps[ccyTypeId] = fee.fee_percBips;

        globalFees.fee_ccyType_Min[ccyTypeId] = fee.fee_min;
        globalFees.fee_ccyType_Max[ccyTypeId] = fee.fee_max;
    }

    // TODO: -ve tests for % fees on balance exceeded (test ccy & token balance validations)
    // TODO: tests for multi-fees (fixed + basis) and tests for capped and collared...
   
    // FIXED FEES - TOKENS
    // function setFee_SecTokenType_Fixed(uint256 tokenTypeId, uint256 fee_tokenQty_Fixed) public {
    //     require(msg.sender == owner, "Restricted method");
    //     require(_readOnly == false, "Contract is read only");
    //     require(tokenTypeId >= 0 && tokenTypeId < stTypesData._count_tokenTypes, "Invalid ST type");
    //     globalFees.fee_tokType_Fix[tokenTypeId] = fee_tokenQty_Fixed;
    //     globalFees.fee_tokType_Bps[tokenTypeId] = 0;
    //     emit SetFeeTokFix(tokenTypeId, fee_tokenQty_Fixed);
    // }
    // // FIXED FEES - CCY
    // function setFee_CcyType_Fixed(uint256 ccyTypeId, uint256 fee_ccy_Fixed) public {
    //     require(msg.sender == owner, "Restricted method");
    //     require(_readOnly == false, "Contract is read only");
    //     require(ccyTypeId >= 0 && ccyTypeId < ccyTypesData._count_ccyTypes, "Invalid currency type");
    //     globalFees.fee_ccyType_Fix[ccyTypeId] = fee_ccy_Fixed;
    //     globalFees.fee_ccyType_Bps[ccyTypeId] = 0;
    //     emit SetFeeCcyFix(ccyTypeId, fee_ccy_Fixed);
    // }

    // // PERCENTAGE FEES (BASIS POINTS, 1/100 of 1%) - TOKENS
    // function setFee_SecTokenType_PercBips(uint256 tokenTypeId, uint256 fee_token_PercBips) public {
    //     require(msg.sender == owner, "Restricted method");
    //     require(_readOnly == false, "Contract is read only");
    //     require(tokenTypeId >= 0 && tokenTypeId < stTypesData._count_tokenTypes, "Invalid ST type");
    //     require(fee_token_PercBips < 10000, "Invalid fee basis points");
    //     globalFees.fee_tokType_Bps[tokenTypeId] = fee_token_PercBips;
    //     globalFees.fee_tokType_Fix[tokenTypeId] = 0;
    //     emit SetFeeTokBps(tokenTypeId, fee_token_PercBips);
    // }
    // // PERCENTAGE FEES (BASIS POINTS, 1/100 of 1%) - CCY
    // function setFee_CcyType_PercBips(uint256 ccyTypeId, uint256 fee_ccy_PercBips) public {
    //     require(msg.sender == owner, "Restricted method");
    //     require(_readOnly == false, "Contract is read only");
    //     require(ccyTypeId >= 0 && ccyTypeId < ccyTypesData._count_ccyTypes, "Invalid currency type");
    //     require(fee_ccy_PercBips < 10000, "Invalid fee percentage");
    //     globalFees.fee_ccyType_Bps[ccyTypeId] = fee_ccy_PercBips;
    //     globalFees.fee_ccyType_Fix[ccyTypeId] = 0;
    //     emit SetFeeCcyBps(ccyTypeId, fee_ccy_PercBips);
    // }

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