pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";

library StLib {
    event AddedSecTokenType(uint256 id, string name);

    // struct SecTokenTypeReturn {
    //     uint256 id;
    //     string  name;
    // }
    // struct GetSecTokenTypesReturn {
    //     SecTokenTypeReturn[] tokenTypes;
    // }

    // struct StTypesStruct {
    //     mapping(uint256 => string) _tokenTypeNames; // typeId -> typeName
    //     uint256 _count_tokenTypes;
    // }

    function addSecTokenType(StructLib.StTypesStruct storage data, string memory name) public {
        for (uint256 tokenTypeId = 0; tokenTypeId < data._count_tokenTypes; tokenTypeId++) {
            require(keccak256(abi.encodePacked(data._tokenTypeNames[tokenTypeId])) != keccak256(abi.encodePacked(name)),
                    "ST type name already exists");
        }

        data._tokenTypeNames[data._count_tokenTypes] = name;
        emit AddedSecTokenType(data._count_tokenTypes, name);

        data._count_tokenTypes++;
    }

    function getSecTokenTypes(StructLib.StTypesStruct storage data) external view returns (StructLib.GetSecTokenTypesReturn memory) {
        StructLib.SecTokenTypeReturn[] memory tokenTypes;
        tokenTypes = new StructLib.SecTokenTypeReturn[](data._count_tokenTypes);

        for (uint256 tokenTypeId = 0; tokenTypeId < data._count_tokenTypes; tokenTypeId++) {
            tokenTypes[tokenTypeId] = StructLib.SecTokenTypeReturn({
                id: tokenTypeId,
              name: data._tokenTypeNames[tokenTypeId]
            });
        }

        StructLib.GetSecTokenTypesReturn memory ret = StructLib.GetSecTokenTypesReturn({
            tokenTypes: tokenTypes
        });
        return ret;
    }
}