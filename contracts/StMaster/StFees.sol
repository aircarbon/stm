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
    // tuning - ST packing ...
    //

    // tuning - orig-fees (1 orig, 1.5 STs)
    //
    //      start gas cost: ## 591590 ##
    //          (no token transfer: 103715 !!)
    //          (no full ST transfer: 127925 !! >> i.e. almost all gas cost is in partial transfer)
    //
    //      packing ST 64 bits x3 mapping: ** 453026 ** -- GAIN 23%
    //          (no update of ST mapping: 409000 - cost of mapping update ~50k)
    //          (no count++ in partial: 407000 - 50k access cost)
    //          (no push in partial: 359000 - 94k access cost)
    //          (no emit partial event: 442088 - cost of emit: 11k)
    //          (no global updates at end: 406000 - cost 50k per update)
    //
    //      moved _tokens_currentMax_id++ into local var: ** 442365 ** -- GAIN 25%
    //
    //      RETEST ALL: OK

    //      TODO: pack ST.currentQty / ST.mintedQty into nested struct (saves one update)...?
    //      TODO: pack globals into a struct, worst case is 3x 50k updates down to one 50k update)...
    //      TODO: token Qty on transfer/mint/burn now is max. 2^64 -- how to enforce check on params into contract? -ve tests needed
    //      TODO: batchId now is max 2^64 -- need to test on mintBatch for exceeded, also getBatch -ve tests

    //
    // origFees
    //  ** fee-preview: returns enough data (qty?) for an orchestrator to split up a large multi-batch transfer TX into separate components?
    //  ** fee-preview: tests general / using it for splitting multi-batch transfers
    //
    //  > origFees - TESTS:
    //   >> MULTI-BATCH TRANSER MULTI-ORIG -- SIDE B
    //   >> TWO-SIDED CARBON TRANSFER - MULTI-ORIG BOTH SIDES (e.g. max 3+3 orig fee previews +1 exchange fee) [show it can be split up]
    //   >> with MAX_BATCHES_PREVIEW exceeded ...
    //   >> insufficient carbons for batch fees
    //
    // TODO: global originator batch fee counts...
    // TODO: post-minting orig fees (Thom): only can revise downwards...
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
        return ledgerData._tokens_totalExchangeFeesPaidQty;
    }

    /**
     * @dev Returns the global total quantity of token originator fees paid, in the contract base unit
     */
    function getSecToken_totalOriginatorFeesPaidQty()
    external view onlyOwner() returns (uint256) {
        return ledgerData._tokens_totalOriginatorFeesPaidQty;
    }

    /**
     * @dev Returns the global total amount of currency exchange fees paid, for the supplied currency
     */
    function getCcy_totalExchangeFeesPaid(uint256 ccyTypeId)
    external view onlyOwner() returns (uint256) {
        return ledgerData._ccyType_totalFeesPaid[ccyTypeId];
    }
}