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
    // origFees
    //
    // TODO: drop fee_fixed completely (it's == fee_min)
    //
    //  > origFees - TESTS:
    //   >> insufficient carbons for batch fees
    //
    // TODO:
    //  ** fee-preview: returns enough data (qty?) for an orchestrator to split up a large multi-batch transfer TX into separate components?
    //    >> with MAX_BATCHES_PREVIEW exceeded ... change to more(bool) ... ?
    //  ** fee-preview: tests general / using it for splitting multi-batch transfers
    //

    // TODO: global originator batch fee counts...?
    //
    // ** ERC20 ** >> pre-calcing/storing whitelisting addr's is the problem; if we dynamically add, we can add external addresses to whitelist at will, not secure
    //    mapping(address=>bool)
    //    for(;;) { addWhitelist(addr) ... }
    //    sealWhitelist(); // can't addWhitelist after sealing
    //

    // GLOBAL FEES
    StructLib.FeeStruct globalFees;

    // TODO: return struct, reduce # methods (to 4)

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