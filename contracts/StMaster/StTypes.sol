pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";

import "../Libs/TokenLib.sol";
import "../Libs/StructLib.sol";

/**
  * Manages ST types
  */
contract StTypes is Owned {
    StructLib.StTypesStruct stTypesData;

    /**
     * @dev Adds a new ST type
     * @param name New ST type name
     */
    function addSecTokenType(string memory name)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.addSecTokenType(stTypesData, name);
    }

    /**
     * @dev Returns current ST types
     */
    function getSecTokenTypes()
    external view returns (StructLib.GetSecTokenTypesReturn memory) {
        return TokenLib.getSecTokenTypes(stTypesData);
    }
}
