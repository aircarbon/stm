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
    uint256 _count_eeuTypes;
    struct EeuTypeReturn {
        uint256 id;
        string  name;
    }
    struct GetEeuTypesReturn {
        EeuTypeReturn[] eeuTypes;
    }

    constructor() public {
        // default EEU types
        _eeuTypeNames[0] = 'UNFCCC - UN - Certified Emission Reduction';
        _eeuTypeNames[1] = 'VCS - VERRA - Verified Carbon Standard';
        _count_eeuTypes = 2;
    }

    /**
     * @dev Adds a new EEU type
     * @param name New EEU type name
     */
    function addEeuType(string memory name) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");

        for (uint256 eeuTypeId = 0; eeuTypeId < _count_eeuTypes; eeuTypeId++) {
            require(keccak256(abi.encodePacked(_eeuTypeNames[eeuTypeId])) != keccak256(abi.encodePacked(name)),
                    "EEU type name already exists");
        }

        _eeuTypeNames[_count_eeuTypes] = name;
        emit AddedEeuType(_count_eeuTypes, name);

        _count_eeuTypes++;
    }

    /**
     * @dev Returns current EEU types
     */
    function getEeuTypes() external view returns (GetEeuTypesReturn memory) {
        EeuTypeReturn[] memory eeuTypes;
        eeuTypes = new EeuTypeReturn[](_count_eeuTypes);

        for (uint256 eeuTypeId = 0; eeuTypeId < _count_eeuTypes; eeuTypeId++) {
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
