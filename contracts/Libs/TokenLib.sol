pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";

library TokenLib {
    event AddedSecTokenType(uint256 id, string name);
    event BurnedFullSecToken(uint256 stId, uint256 tokenTypeId, address ledgerOwner, uint256 burnedQty);
    event BurnedPartialSecToken(uint256 stId, uint256 tokenTypeId, address ledgerOwner, uint256 burnedQty);

    // TOKEN TYYPES
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

    // MINTING
    // ...

    // BURNING
    function burnTokens(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.StTypesStruct storage stTypesData,
        address ledgerOwner,
        uint256 tokenTypeId,
        int256 burnQty)
    public {
        require(ledgerData._ledger[ledgerOwner].exists == true, "Invalid ledger owner");
        require(burnQty >= 1, "Minimum burnQty one unit");
        require(tokenTypeId >= 0 && tokenTypeId < stTypesData._count_tokenTypes, "Invalid ST type");

        // check ledger owner has sufficient carbon tonnage of supplied type
        require(StructLib.sufficientTokens(ledgerData, ledgerOwner, tokenTypeId, uint256(burnQty), 0) == true, "Insufficient carbon held by ledger owner");
        // uint256 kgAvailable = 0;
        // for (uint i = 0; i < ledgerData._ledger[ledgerOwner].tokenType_stIds[tokenTypeId].length; i++) {
        //     kgAvailable += ledgerData._sts_currentQty[ledgerData._ledger[ledgerOwner].tokenType_stIds[tokenTypeId][i]];
        // }
        // require(kgAvailable >= uint256(burnQty), "Insufficient carbon held by ledger owner");
        //require(ledgerData._ledger[ledgerOwner].tokenType_sumQty[tokenTypeId] >= uint256(burnQty), "Insufficient carbon held by ledger owner");

        // burn (i.e. delete or resize) sufficient ST(s)
        uint256 ndx = 0;
        uint256 remainingToBurn = uint256(burnQty);
        while (remainingToBurn > 0) {
            uint256[] storage tokenType_stIds = ledgerData._ledger[ledgerOwner].tokenType_stIds[tokenTypeId];
            uint256 stId = tokenType_stIds[ndx];
            uint256 stQty = ledgerData._sts_currentQty[stId];
            uint256 batchId = ledgerData._sts_batchId[stId];

            if (remainingToBurn >= stQty) {
                // burn the full ST
                ledgerData._sts_currentQty[stId] = 0;

                // remove from ledger
                tokenType_stIds[ndx] = tokenType_stIds[tokenType_stIds.length - 1];
                tokenType_stIds.length--;
                //ledgerData._ledger[ledgerOwner].tokenType_sumQty[tokenTypeId] -= stQty;

                // burn from batch
                ledgerData._batches[batchId].burnedQty += stQty;

                remainingToBurn -= stQty;
                emit BurnedFullSecToken(stId, tokenTypeId, ledgerOwner, stQty);
            } else {
                // resize the ST (partial burn)
                ledgerData._sts_currentQty[stId] -= remainingToBurn;

                // retain on ledger
                //ledgerData._ledger[ledgerOwner].tokenType_sumQty[tokenTypeId] -= remainingToBurn;

                // burn from batch
                ledgerData._batches[batchId].burnedQty += remainingToBurn;

                emit BurnedPartialSecToken(stId, tokenTypeId, ledgerOwner, remainingToBurn);
                remainingToBurn = 0;
            }
        }
        ledgerData._tokens_totalBurnedQty += uint256(burnQty);
    }
}