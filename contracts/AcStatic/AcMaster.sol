pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

/**
  * Manages static data used by AcMaster
  */
contract AcStatic {
    string public version;

    mapping(uint256 => string) eeuTypeIds;
    uint count_eeuTypeIds;
    struct EeuTypeReturn {
        uint256 eeuTypeId;
        string eeuTypeName;
    }
    struct GetEeuTypeReturn {
        EeuTypeReturn[] eeuTypes;
    }

    /**
     * ctor
     */
    constructor() public {
        version = "0.0.4";
        eeuTypeIds[0] = 'UNFCCC';
        eeuTypeIds[1] = 'VCS';
        count_eeuTypeIds = 2;
    }

    /**
     * @dev Returns EeuType enumeration
     */
    function getEeuTypeIds() external view returns (GetEeuTypeReturn memory retData) {
        EeuTypeReturn[] memory eeuTypes;
        eeuTypes = new EeuTypeReturn[](count_eeuTypeIds);

        for (uint256 eeuTypeId = 0; eeuTypeId < count_eeuTypeIds; eeuTypeId++) {
            eeuTypes[eeuTypeId] = EeuTypeReturn({
                eeuTypeId: eeuTypeId,
              eeuTypeName: eeuTypeIds[eeuTypeId]
            });
        }

        GetEeuTypeReturn memory ret = GetEeuTypeReturn({
            eeuTypes: eeuTypes
        });
        return ret;
    }
}
