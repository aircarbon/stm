pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";

import "../Libs/StructLib.sol";
import "../Libs/CcyLib.sol";

/**
  * Manages currency types
  */
contract CcyTypes is Owned {
    StructLib.CcyTypesStruct ccyTypesData;

    /**
     * @dev Adds a new currency type
     * @param name New currency type name
     * @param unit Base unit of the new currency type
     * @param decimals Number of decimal places in smallest unit
     */
    function addCcyType(string memory name, string memory unit, uint16 decimals)
    public onlyOwner() onlyWhenReadWrite() {
        CcyLib.addCcyType(ccyTypesData, name, unit, decimals);
    }

    /**
     * @dev Returns current currency types
     */
    function getCcyTypes() external view returns (StructLib.GetCcyTypesReturn memory) {
        return CcyLib.getCcyTypes(ccyTypesData);
    }
}
