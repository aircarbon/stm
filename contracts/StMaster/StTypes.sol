pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";

import "../Lib/StLib.sol";
import "../Lib/StructLib.sol";

/**
  * Manages ST types
  */
contract StTypes is Owned {
    //event AddedSecTokenType(uint256 id, string name);

    // *** ST TYPES
    // mapping(uint256 => string) _tokenTypeNames; // typeId -> typeName
    // uint256 _count_tokenTypes;
    // struct SecTokenTypeReturn {
    //     uint256 id;
    //     string  name;
    // }
    // struct GetSecTokenTypesReturn {
    //     SecTokenTypeReturn[] tokenTypes;
    // }
    StructLib.StTypesStruct stTypesData;

    /**
     * @dev Adds a new ST type
     * @param name New ST type name
     */
    function addSecTokenType(string memory name) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");

        StLib.addSecTokenType(stTypesData, name);

        // for (uint256 tokenTypeId = 0; tokenTypeId < stTypesData._count_tokenTypes; tokenTypeId++) {
        //     require(keccak256(abi.encodePacked(stTypesData._tokenTypeNames[tokenTypeId])) != keccak256(abi.encodePacked(name)),
        //             "ST type name already exists");
        // }
        // stTypesData._tokenTypeNames[stTypesData._count_tokenTypes] = name;
        // emit AddedSecTokenType(stTypesData._count_tokenTypes, name);
        // stTypesData._count_tokenTypes++;
    }

    /**
     * @dev Returns current ST types
     */
    function getSecTokenTypes() external view returns (StructLib.GetSecTokenTypesReturn memory) {
        return StLib.getSecTokenTypes(stTypesData);

        // StLib.SecTokenTypeReturn[] memory tokenTypes;
        // tokenTypes = new StLib.SecTokenTypeReturn[](stTypesData._count_tokenTypes);

        // for (uint256 tokenTypeId = 0; tokenTypeId < stTypesData._count_tokenTypes; tokenTypeId++) {
        //     tokenTypes[tokenTypeId] = StLib.SecTokenTypeReturn({
        //         id: tokenTypeId,
        //       name: stTypesData._tokenTypeNames[tokenTypeId]
        //     });
        // }

        // StLib.GetSecTokenTypesReturn memory ret = StLib.GetSecTokenTypesReturn({
        //     tokenTypes: tokenTypes
        // });
        // return ret;
    }
}
