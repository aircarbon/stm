pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/StructLib.sol";

contract StFees is Owned, StLedger {
    event SetFeeSecTokenTypeFixed(uint256 tokenTypeId, uint256 fee_tokenQty_Fixed);
    event SetFeeCcyTypeFixed(uint256 ccyTypeId, uint256 fee_ccy_Fixed);
    
    event SetFeeSecTokenTypePerc(uint256 tokenTypeId, uint256 fee_token_PercBips);
    event SetFeeCcyTypePerc(uint256 ccyTypeId, uint256 fee_ccy_PercBips);

    StructLib.FeeStruct feeData;

    function fee_tokenType_Fixed(uint256 tokenTypeId) public  view returns (uint256) { return feeData.fee_tokenType_Fixed[tokenTypeId]; }
    function fee_ccyType_Fixed(uint256 ccyTypeId) public  view returns (uint256) { return feeData.fee_ccyType_Fixed[ccyTypeId]; }
    function fee_tokenType_PercBips(uint256 tokenTypeId) public  view returns (uint256) { return feeData.fee_tokenType_PercBips[tokenTypeId]; }
    function fee_ccyType_PercBips(uint256 ccyTypeId) public  view returns (uint256) { return feeData.fee_ccyType_PercBips[ccyTypeId]; }

    // TODO: ...
    // struct Fee {
    //     uint256 fee_fixed;
    //     uint256 percBips;
    //     uint256 min;
    //     uint256 max;
    // }
    // function setGlobalFee_TokenType(uint256 tokenTypeId, Fee memory fee) public {
    //     fee_tokenType_Fixed[tokenTypeId] = fee.fee_fixed;
    // }
    // function setGlobalFee_CcyType(uint256 ccyTypeId, Fee memory fee) public {
    //     //...
    // }

    /**
     * Global Fee Structure
     * NOTE: fees are applied ON TOP OF the supplied transfer amounts to the transfer() fn.
     *       i.e. transfer amounts are not inclusive of fees, they are additional
     */
    // FIXED FEES - TOKENS
    function setFee_SecTokenType_Fixed(uint256 tokenTypeId, uint256 fee_tokenQty_Fixed) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(tokenTypeId >= 0 && tokenTypeId < stTypesData._count_tokenTypes, "Invalid ST type");
        feeData.fee_tokenType_Fixed[tokenTypeId] = fee_tokenQty_Fixed;
        feeData.fee_tokenType_PercBips[tokenTypeId] = 0;
        emit SetFeeSecTokenTypeFixed(tokenTypeId, fee_tokenQty_Fixed);
    }
    // FIXED FEES - CCY
    function setFee_CcyType_Fixed(uint256 ccyTypeId, uint256 fee_ccy_Fixed) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(ccyTypeId >= 0 && ccyTypeId < ccyTypesData._count_ccyTypes, "Invalid currency type");
        feeData.fee_ccyType_Fixed[ccyTypeId] = fee_ccy_Fixed;
        feeData.fee_ccyType_PercBips[ccyTypeId] = 0;
        emit SetFeeCcyTypeFixed(ccyTypeId, fee_ccy_Fixed);
    }

    // PERCENTAGE FEES (BASIS POINTS, 1/100 of 1%) - TOKENS
    function setFee_SecTokenType_PercBips(uint256 tokenTypeId, uint256 fee_token_PercBips) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(tokenTypeId >= 0 && tokenTypeId < stTypesData._count_tokenTypes, "Invalid ST type");
        require(fee_token_PercBips < 10000, "Invalid fee basis points");
        feeData.fee_tokenType_PercBips[tokenTypeId] = fee_token_PercBips;
        feeData.fee_tokenType_Fixed[tokenTypeId] = 0;
        emit SetFeeSecTokenTypePerc(tokenTypeId, fee_token_PercBips);
    }
    // PERCENTAGE FEES (BASIS POINTS, 1/100 of 1%) - CCY
    function setFee_CcyType_PercBips(uint256 ccyTypeId, uint256 fee_ccy_PercBips) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(ccyTypeId >= 0 && ccyTypeId < ccyTypesData._count_ccyTypes, "Invalid currency type");
        require(fee_ccy_PercBips < 10000, "Invalid fee percentage");
        feeData.fee_ccyType_PercBips[ccyTypeId] = fee_ccy_PercBips;
        feeData.fee_ccyType_Fixed[ccyTypeId] = 0;
        emit SetFeeCcyTypePerc(ccyTypeId, fee_ccy_PercBips);
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