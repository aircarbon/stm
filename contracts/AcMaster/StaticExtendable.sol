pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

/**
  * Manages static data used by AcMaster
  */
contract StaticExtendable {

    // *** EEU TYPES
    mapping(uint256 => string) _eeuTypeIds; // typeId -> typeName
    uint256 _count_eeuTypeIds;
    struct EeuTypeReturn {
        uint256 eeuTypeId;
        string eeuTypeName;
    }
    struct GetEeuTypeReturn {
        EeuTypeReturn[] eeuTypes;
    }

    /**
     * @dev Returns EEU types
     */
    function getEeuTypeIds() external view returns (GetEeuTypeReturn memory retData) {
        EeuTypeReturn[] memory eeuTypes;
        eeuTypes = new EeuTypeReturn[](_count_eeuTypeIds);

        for (uint256 eeuTypeId = 0; eeuTypeId < _count_eeuTypeIds; eeuTypeId++) {
            eeuTypes[eeuTypeId] = EeuTypeReturn({
                eeuTypeId: eeuTypeId,
              eeuTypeName: _eeuTypeIds[eeuTypeId]
            });
        }

        GetEeuTypeReturn memory ret = GetEeuTypeReturn({
            eeuTypes: eeuTypes
        });
        return ret;
    }
}
