pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/StructLib.sol";
import "../Libs/FeeLib.sol";

contract StFees is Owned, StLedger {
    // NOTE: fees are applied ON TOP OF the supplied transfer amounts to the transfer() fn.
    //       i.e. transfer amounts are not inclusive of fees, they are additional

    //
    // TODO: origFees
    //
    // TODO: make ccy types & st types 1-based (so can pass zero with more meaning into transfer() + can do better validation in transfer() [ccy_amount vs. type id])
    // TODO: specific tests for type 0 (invalid) transfers
    //
    // TODO: tests - fee-receiver==fee-sender; more tests for accounts other than accounts[0]
    //
    //  > origFees - TESTS:
    //   >> set MAX_BATCHES_PREVIEW to 1, try >1 batch (test require(...MAX_BATCHES_PREVIEW))
    //   >> set MAX_BATCHES_PREVIEW to ~3, try getting 3 + 3 sets of orig fees in preview (each side has 3) on a carbon/carbon swap
    //   >> transfer across multiple batches (multiple originator fees)
    //   >> insufficient carbons for batch fees
    //
    //   > global + originator
    //   > ledger + originator
    //   > originator only
    //
    // TODO: global originator batch fee counts...
    // TODO: post-minting orig fees (Thom): only can revise downwards...
    //
    // TODO: fees - getFees (ex + orig) (for pre-trade, preview)...
    //

    // GLOBAL FEES
    StructLib.FeeStruct globalFees;

    // accessors - global fees (can't return mappings)
    function globalFee_tokType_Fix(uint256 tokenTypeId) public  view returns (uint256) { return globalFees.tok[tokenTypeId].fee_fixed; }
    function globalFee_tokType_Bps(uint256 tokenTypeId) public  view returns (uint256) { return globalFees.tok[tokenTypeId].fee_percBips; }
    function globalFee_tokType_Min(uint256 tokenTypeId) public  view returns (uint256) { return globalFees.tok[tokenTypeId].fee_min; }
    function globalFee_tokType_Max(uint256 tokenTypeId) public  view returns (uint256) { return globalFees.tok[tokenTypeId].fee_max; }
    function globalFee_ccyType_Fix(uint256 ccyTypeId)   public  view returns (uint256) { return globalFees.ccy[ccyTypeId].fee_fixed; }
    function globalFee_ccyType_Bps(uint256 ccyTypeId)   public  view returns (uint256) { return globalFees.ccy[ccyTypeId].fee_percBips; }
    function globalFee_ccyType_Min(uint256 ccyTypeId)   public  view returns (uint256) { return globalFees.ccy[ccyTypeId].fee_min; }
    function globalFee_ccyType_Max(uint256 ccyTypeId)   public  view returns (uint256) { return globalFees.ccy[ccyTypeId].fee_max; }

    // accessors - ledger owner fees (can't return mappings)
    function ledgerFee_tokType_Fix(uint256 tokenTypeId, address ledgerOwner) public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.tok[tokenTypeId].fee_fixed; }
    function ledgerFee_tokType_Bps(uint256 tokenTypeId, address ledgerOwner) public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.tok[tokenTypeId].fee_percBips; }
    function ledgerFee_tokType_Min(uint256 tokenTypeId, address ledgerOwner) public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.tok[tokenTypeId].fee_min; }
    function ledgerFee_tokType_Max(uint256 tokenTypeId, address ledgerOwner) public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.tok[tokenTypeId].fee_max; }
    function ledgerFee_ccyType_Fix(uint256 ccyTypeId, address ledgerOwner)   public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.ccy[ccyTypeId].fee_fixed; }
    function ledgerFee_ccyType_Bps(uint256 ccyTypeId, address ledgerOwner)   public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.ccy[ccyTypeId].fee_percBips; }
    function ledgerFee_ccyType_Min(uint256 ccyTypeId, address ledgerOwner)   public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.ccy[ccyTypeId].fee_min; }
    function ledgerFee_ccyType_Max(uint256 ccyTypeId, address ledgerOwner)   public  view returns (uint256) { return ledgerData._ledger[ledgerOwner].customFees.ccy[ccyTypeId].fee_max; }

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
     * @dev Returns the global total quantity of token exchange fees paid, in the contract base unit
     */
    function getSecToken_totalExchangeFeesPaidQty() external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return ledgerData._tokens_totalExchangeFeesPaidQty;
    }

    /**
     * @dev Returns the global total quantity of token originator fees paid, in the contract base unit
     */
    function getSecToken_totalOriginatorFeesPaidQty() external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return ledgerData._tokens_totalOriginatorFeesPaidQty;
    }

    /**
     * @dev Returns the global total amount of currency exchange fees paid, for the supplied currency
     */
    function getCcy_totalExchangeFeesPaid(uint256 ccyTypeId) external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return ledgerData._ccyType_totalFeesPaid[ccyTypeId];
    }
}