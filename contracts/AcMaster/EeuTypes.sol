pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";

/**
  * Manages EEU types used by AcMaster
  */
contract EeuTypes is Owned {
    event AddedEeuType(uint256 id, string name);

    // *** EEU TYPES
    mapping(uint256 => string) _eeuTypeNames; // typeId -> typeName
    uint256 _count_eeuTypeIds;
    struct EeuTypeReturn {
        uint256 id;
        string  name;
    }
    struct GetEeuTypesReturn {
        EeuTypeReturn[] eeuTypes;
    }

    constructor() public {
        // default EEU types
        _eeuTypeNames[0] = 'UNFCCC';
        _eeuTypeNames[1] = 'VCS';
        _count_eeuTypeIds = 2;
    }

    /**
     * @dev Adds a new EEU type
     * @param name The new EEU type name
     */
    function addEeuType(string memory name) public {
        require(msg.sender == owner, "Restricted method");

        for (uint256 eeuTypeId = 0; eeuTypeId < _count_eeuTypeIds; eeuTypeId++) {
            require(keccak256(abi.encodePacked(_eeuTypeNames[eeuTypeId])) != keccak256(abi.encodePacked(name)),
                    "EEU type name already exists");
        }

        _eeuTypeNames[_count_eeuTypeIds] = name;
        emit AddedEeuType(_count_eeuTypeIds, name);

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
                id: eeuTypeId,
              name: _eeuTypeNames[eeuTypeId]
            });
        }

        GetEeuTypesReturn memory ret = GetEeuTypesReturn({
            eeuTypes: eeuTypes
        });
        return ret;
    }
}
