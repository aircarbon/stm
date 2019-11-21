pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";

library CcyLib {
    event AddedCcyType(uint256 id, string name, string unit);

    // CCY TYPES
    function addCcyType(StructLib.CcyTypesStruct storage data, string memory name, string memory unit) public {
        for (uint256 ccyTypeId = 0; ccyTypeId < data._count_ccyTypes; ccyTypeId++) {
            require(keccak256(abi.encodePacked(data._ccyTypes[ccyTypeId].name)) != keccak256(abi.encodePacked(name)),
                    "Currency type name already exists");
        }

        data._ccyTypes[data._count_ccyTypes] = StructLib.Ccy({
              id: data._count_ccyTypes,
            name: name,
            unit: unit
        });
        emit AddedCcyType(data._count_ccyTypes, name, unit);

        data._count_ccyTypes++;
    }

    function getCcyTypes(StructLib.CcyTypesStruct storage data) external view returns (StructLib.GetCcyTypesReturn memory) {
        StructLib.Ccy[] memory ccyTypes;
        ccyTypes = new StructLib.Ccy[](data._count_ccyTypes);

        for (uint256 ccyTypeId = 0; ccyTypeId < data._count_ccyTypes; ccyTypeId++) {
            ccyTypes[ccyTypeId] = StructLib.Ccy({
                    id: data._ccyTypes[ccyTypeId].id,
                  name: data._ccyTypes[ccyTypeId].name,
                  unit: data._ccyTypes[ccyTypeId].unit
            });
        }

        StructLib.GetCcyTypesReturn memory ret = StructLib.GetCcyTypesReturn({
            ccyTypes: ccyTypes
        });
        return ret;
    }

    // TODO: fund/withdraw ...
}

