pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "./IOwned.sol";

import "../Libs/StructLib.sol";
import "../Libs/TokenLib.sol";

/**
 * @notice Controls collateralized currency: funding, withdrawing and adding of collateral currency types
 */
 contract ICcyCollateralizable is IOwned {

    // /**
    //  * @notice Returns the current currency types
    //  */
    // function getCcyTypes()
    // external view returns (StructLib.GetCcyTypesReturn memory) { revert("Not implemented"); }

    /**
     * @notice Returns the total amount of funded collateralized currency for the supplied currency type
     */
    function getTotalCcyFunded(uint256 ccyTypeId)
    external view onlyOwner() returns (uint256) { revert("Not implemented"); }

    /**
     * @dev Returns the total global amount withdrawn for the supplied currency
     */
    function getTotalCcyWithdrawn(uint256 ccyTypeId)
    external view onlyOwner() returns (uint256) { revert("Not implemented"); }

    /**
     * @notice Adds a new currency type
     * @param name New currency type name
     * @param unit Base unit of the new currency type, e.g. "cents" for USD, "Wei" for ETH
     * @param decimals Number of decimal places in the smallest currency unit, e.g. 2 for USD, 18 for ETH
     */
    function addCcyType(string memory name, string memory unit, uint16 decimals)
    public onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }

    /**
     * @notice Funds a ledger entry with the specified amount and type of collateralized currency
     * @param ccyTypeId Currency type ID
     * @param amount Amount of the currency to fund, in currency base units
     * @param ledgerOwner Ledger owner to fund
     */
    function fund(uint256 ccyTypeId,
                  int256  amount, // signed value: ledger ccyType_balance supports (theoretical) -ve balances
                  address ledgerOwner)
    public onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }


    /**
     * @notice Withdraws the specified amount and type of collateralized currency from the specified ledger entry
     * @param ccyTypeId Currency type ID
     * @param amount Amount of the currency to withdraw, in currency base units
     * @param ledgerOwner ledger owner to withdraw from
     */
    function withdraw(uint256 ccyTypeId,
                      int256  amount, // signed value: ledger ccyType_balance supports (theoretical) -ve balances
                      address ledgerOwner)
    public onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }

}
