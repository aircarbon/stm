pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";

/**
  * Manages currency types used by AcMaster
  */
contract CcyTypes is Owned {

    // *** CCY TYPES
    struct Ccy {
        uint256 id;
        string  name; // e.g. "USD", "BTC", "ETH"
        string  unit; // e.g. "cents", "satoshi", "wei"
    }
    mapping(uint256 => Ccy) _ccyTypes; // typeId -> ccy
    uint256 _count_ccyTypes;
    struct GetCcyTypesReturn {
        Ccy[] ccyTypes;
    }

     constructor() public {
        // default currency types
        _ccyTypes[0] = Ccy({
            id: 0,
            name: 'USD',
            unit: 'cents'
        });
        _ccyTypes[1] = Ccy({
            id: 1,
            name: 'ETH',
            unit: 'Wei'
        });
        _count_ccyTypes = 2;
    }


    /**
     * @dev Adds a new currency type
     * @param name The new currency type name
     * @param unit The base unit of the new currency type
     */
    function addCcyType(string memory name, string memory unit) public {
        require(msg.sender == owner, "Restricted method");

        // TODO: adding ccy type + tests ...

        for (uint256 ccyTypeId = 0; ccyTypeId < _count_ccyTypes; ccyTypeId++) {
            // todo ...
            // require(keccak256(abi.encodePacked(_ccyTypes[ccyTypeId])) != keccak256(abi.encodePacked(typeName)),
            //         "EEU type name already exists");
        }

        // todo ...
        //_eeuTypeIds[_count_eeuTypeIds] = typeName;
        //_count_eeuTypeIds++;
    }

    /**
     * @dev Returns current currency types
     */
    function getCcyTypes() external view returns (GetCcyTypesReturn memory) {
        Ccy[] memory ccyTypes;
        ccyTypes = new Ccy[](_count_ccyTypes);

        for (uint256 ccyTypeId = 0; ccyTypeId < _count_ccyTypes; ccyTypeId++) {
            ccyTypes[ccyTypeId] = Ccy({
                    id: _ccyTypes[ccyTypeId].id,
                  name: _ccyTypes[ccyTypeId].name,
                  unit: _ccyTypes[ccyTypeId].unit
            });
        }

        GetCcyTypesReturn memory ret = GetCcyTypesReturn({
            ccyTypes: ccyTypes
        });
        return ret;
    }
}
