pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";

/**
  * Manages EEU types used by AcMaster
  */
contract EeuTypes is Owned {

    // *** EEU TYPES
    mapping(uint256 => string) _eeuTypeIds; // typeId -> typeName
    uint256 _count_eeuTypeIds;
    struct EeuTypeReturn {
        uint256 typeId;
        string  typeName;
    }
    struct GetEeuTypesReturn {
        EeuTypeReturn[] eeuTypes;
    }

    constructor() public {
        // default EEU types
        _eeuTypeIds[0] = 'UNFCCC';
        _eeuTypeIds[1] = 'VCS';
        _count_eeuTypeIds = 2;
    }

    /**
     * @dev Adds a new EEU type
     * @param name The new EEU type name
     */
    function addEeuType(string memory name) public {
        require(msg.sender == owner, "Restricted method");

        for (uint256 eeuTypeId = 0; eeuTypeId < _count_eeuTypeIds; eeuTypeId++) {
            require(keccak256(abi.encodePacked(_eeuTypeIds[eeuTypeId])) != keccak256(abi.encodePacked(name)),
                    "EEU type name already exists");
        }

        _eeuTypeIds[_count_eeuTypeIds] = name;
        _count_eeuTypeIds++;
    }

    /**
     * @dev Returns current EEU types
     */
    function getEeuTypes() external view returns (GetEeuTypesReturn memory) {
        EeuTypeReturn[] memory eeuTypes;
        eeuTypes = new EeuTypeReturn[](_count_eeuTypeIds);

        for (uint256 eeuTypeId = 0; eeuTypeId < _count_eeuTypeIds; eeuTypeId++) {
            eeuTypes[eeuTypeId] = EeuTypeReturn({
                typeId: eeuTypeId,
              typeName: _eeuTypeIds[eeuTypeId]
            });
        }

        GetEeuTypesReturn memory ret = GetEeuTypesReturn({
            eeuTypes: eeuTypes
        });
        return ret;
    }
}
