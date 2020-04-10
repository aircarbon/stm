pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "./IOwned.sol";
//import "./StLedger.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/FeeLib.sol";

/**
 * @notice Controls fees by currency and token type
 * @dev Fees are applied on whitelisted transfers: (global exchange fee || ledger fee) [+ batch originator fee]
 * @dev Fees in addition to the amounts supplied to transferOrTrade() (i.e. transfer amounts are not inclusive of fees, they are additional)
 */
contract IStFees is IOwned {

    enum GetFeeType { CCY, TOK }

    /**
     * @notice Returns the current fee structure (global or ledger fee) for the supplied token or currency type
     * @param feeType Fee type: currency (0) or token (1)
     * @param typeId The currencyTypeId or tokenTypeId for which to return fees
     * @param ledgerOwner If > 0x0, returns the ledger (override) fee in effect for the address, else returns the global fee
     */
    function getFee(GetFeeType feeType, uint256 typeId, address ledgerOwner)
    external view returns(StructLib.SetFeeArgs memory) { revert("Not implemented"); }

    /**
     * @notice Returns the total quantity of token exchange fees paid, in the contract base unit
     */
    function getSecToken_totalExchangeFeesPaidQty()
    external view returns (uint256) { revert("Not implemented"); }

    /**
     * @notice Returns the total quantity of token originator fees paid, in the contract base unit
     */
    function getSecToken_totalOriginatorFeesPaidQty()
    external view returns (uint256) { revert("Not implemented"); }

    /**
     * @notice Returns the total amount of currency exchange fees paid, for the supplied currency
     */
    function getCcy_totalExchangeFeesPaid(uint256 ccyTypeId)
    external view returns (uint256) { revert("Not implemented"); }

    /**
     * @notice Sets the current fee structure (global or ledger fee) for the supplied token type
     * @param tokenTypeId Token type
     * @param ledgerOwner The ledger address for which to set fee structure, or 0x0 to set global fee structure
     * @param feeArgs The fee structure to assign to the supplied leder entry address, or to set as the global fee structure
     */
    function setFee_TokType(uint256 tokenTypeId, address ledgerOwner, StructLib.SetFeeArgs memory feeArgs)
    public onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }

    /**
     * @notice Sets the current fee structure (global or ledger fee) for the supplied currency type
     * @param ccyTypeId Currency type
     * @param ledgerOwner The ledger address for which to set fee structure, or 0x0 to set global fee structure
     * @param feeArgs The fee structure to assign to the supplied leder entry address, or to set as the global fee structure
     */
    function setFee_CcyType(uint256 ccyTypeId, address ledgerOwner, StructLib.SetFeeArgs memory feeArgs)
    public onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }

}