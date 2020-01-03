pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/StructLib.sol";
import "../Libs/CcyLib.sol";

contract CcyFundable is Owned, StLedger {

    /**
     * @dev Adds a new currency type
     * @param name New currency type name
     * @param unit Base unit of the new currency type
     * @param decimals Number of decimal places in smallest unit
     */
    function addCcyType(string memory name, string memory unit, uint16 decimals)
    public onlyOwner() onlyWhenReadWrite() {
        CcyLib.addCcyType(ledgerData, ccyTypesData, name, unit, decimals);
    }

    /**
     * @dev Returns current currency types
     */
    function getCcyTypes() external view returns (StructLib.GetCcyTypesReturn memory) {
        return CcyLib.getCcyTypes(ccyTypesData);
    }

    /**
     * @dev Funds a ledger entry with a currency amount
     * @param ccyTypeId Currency type ID
     * @param amount Amount of the currency to fund, in currency base units
     * @param ledgerOwner Ledger owner to fund
     */
    function fund(uint256 ccyTypeId,
                  int256  amount, // signed value: ledger ccyType_balance supports (theoretical) -ve balances
                  address ledgerOwner)
    public onlyOwner() onlyWhenReadWrite() {
        CcyLib.fund(ledgerData, ccyTypesData, ccyTypeId, amount, ledgerOwner);
    }

    /**
     * @dev Returns the total global amount funded for the supplied currency
     */
    function getTotalCcyFunded(uint256 ccyTypeId)
    external view onlyOwner() returns (uint256) {
        return ledgerData._ccyType_totalFunded[ccyTypeId];
    }
}