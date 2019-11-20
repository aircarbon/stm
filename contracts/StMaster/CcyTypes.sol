pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";

import "../Libs/CcyLib.sol";
import "../Libs/StructLib.sol";

/**
  * Manages currency types
  */
contract CcyTypes is Owned {
    //event AddedCcyType(uint256 id, string name, string unit);

    StructLib.CcyTypesStruct ccyTypesData;

    /**
     * @dev Adds a new currency type
     * @param name New currency type name
     * @param unit Base unit of the new currency type
     */
    function addCcyType(string memory name, string memory unit) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");

        CcyLib.addCcyType(ccyTypesData, name, unit);

        // for (uint256 ccyTypeId = 0; ccyTypeId < ccyTypesData._count_ccyTypes; ccyTypeId++) {
        //     require(keccak256(abi.encodePacked(ccyTypesData._ccyTypes[ccyTypeId].name)) != keccak256(abi.encodePacked(name)),
        //             "Currency type name already exists");
        // }

        // ccyTypesData._ccyTypes[ccyTypesData._count_ccyTypes] = CcyLib.Ccy({
        //       id: ccyTypesData._count_ccyTypes,
        //     name: name,
        //     unit: unit
        // });
        // emit AddedCcyType(ccyTypesData._count_ccyTypes, name, unit);

        // ccyTypesData._count_ccyTypes++;
    }

    /**
     * @dev Returns current currency types
     */
    function getCcyTypes() external view returns (StructLib.GetCcyTypesReturn memory) {
        return CcyLib.getCcyTypes(ccyTypesData);
        
        // CcyLib.Ccy[] memory ccyTypes;
        // ccyTypes = new CcyLib.Ccy[](ccyTypesData._count_ccyTypes);

        // for (uint256 ccyTypeId = 0; ccyTypeId < ccyTypesData._count_ccyTypes; ccyTypeId++) {
        //     ccyTypes[ccyTypeId] = CcyLib.Ccy({
        //             id: ccyTypesData._ccyTypes[ccyTypeId].id,
        //           name: ccyTypesData._ccyTypes[ccyTypeId].name,
        //           unit: ccyTypesData._ccyTypes[ccyTypeId].unit
        //     });
        // }

        // CcyLib.GetCcyTypesReturn memory ret = CcyLib.GetCcyTypesReturn({
        //     ccyTypes: ccyTypes
        // });
        // return ret;
    }
}
