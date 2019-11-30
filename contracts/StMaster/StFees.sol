pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/StructLib.sol";
import "../Libs/FeeLib.sol";

contract StFees is Owned, StLedger {
    // NOTE: fees are applied ON TOP OF the supplied transfer amounts to the transfer() fn.
    //       i.e. transfer amounts are not inclusive of fees, they are additional

    // event SetFeeTokFix(uint256 tokenTypeId, address ledgerOwner, uint256 fee_tokenQty_Fixed);
    // event SetFeeCcyFix(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_Fixed);

    // event SetFeeTokBps(uint256 tokenTypeId, address ledgerOwner, uint256 fee_token_PercBips);
    // event SetFeeCcyBps(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_PercBips);

    // event SetFeeTokMin(uint256 tokenTypeId, address ledgerOwner, uint256 fee_token_Min);
    // event SetFeeCcyMin(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_Min);

    // event SetFeeTokMax(uint256 tokenTypeId, address ledgerOwner, uint256 fee_token_Max);
    // event SetFeeCcyMax(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_Max);

    //
    // TODO: origFees - additional set of fees to originator on each trade (i.e. data on batch struct)...
    //  > refactor FeeStruct to two mappings of SetFeeArgs...
    //  > BatchFees - on minting
    //  > UpdateBatchFees - post minting
    //
    //  > refactor transferLib - for combined fees (checks) + 2x ops (ex + orig fees)
    //
    // TODO: fees - getFees (ex + orig) (for pre-trade)...
    //
    // TODO: fees (trade fn + setting ledger & setting global): UI/UX in admin...
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

    /**
     * @dev Define fee structure for token type - global or per ledger entry
     * @param tokenTypeId ST type
     * @param ledgerOwner The ledger address for which to set fee structure, or 0x0 to set global fee structure
     * @param feeArgs The fee structure to assign to the supplied leder entry address, or to the global fee structure
     */
    function setFee_TokType(uint256 tokenTypeId, address ledgerOwner, StructLib.SetFeeArgs memory feeArgs) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        FeeLib.setFee_TokType(ledgerData, stTypesData, globalFees, tokenTypeId, ledgerOwner, feeArgs);
    }

    /**
     * @dev Define fee structure for currecy type - global or per ledger entry
     * @param ccyTypeId currecy type
     * @param ledgerOwner The ledger address for which to set fee structure, or 0x0 to set global fee structure
     * @param feeArgs The fee structure to assign to the supplied leder entry address, or to the global fee structure
     */
    function setFee_CcyType(uint256 ccyTypeId, address ledgerOwner, StructLib.SetFeeArgs memory feeArgs) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        FeeLib.setFee_CcyType(ledgerData, ccyTypesData, globalFees, ccyTypeId, ledgerOwner, feeArgs);
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