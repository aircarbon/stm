pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";

library LedgerLib {
    event MintedSecTokenBatch(uint256 batchId, uint256 tokenTypeId, address batchOwner, uint256 mintQty, uint256 mintSecTokenCount);
    event MintedSecToken(uint256 stId, uint256 batchId, uint256 tokenTypeId, address ledgerOwner, uint256 mintedQty);

    function getLedgerEntry(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.StTypesStruct storage stTypesData,
        StructLib.CcyTypesStruct storage ccyTypesData,
        address account)
    external view returns (StructLib.LedgerReturn memory) {
        StructLib.LedgerSecTokenReturn[] memory tokens;
        StructLib.LedgerCcyReturn[] memory ccys;
        uint256 tokens_sumQty = 0;

        // count total # of tokens across all types
        uint256 countAllSecTokens = 0;
        for (uint256 tokenTypeId = 0; tokenTypeId < stTypesData._count_tokenTypes; tokenTypeId++) {
            countAllSecTokens += ledgerData._ledger[account].tokenType_stIds[tokenTypeId].length;
        }

        // flatten ST IDs and sum sizes across types
        tokens = new StructLib.LedgerSecTokenReturn[](countAllSecTokens);
        uint256 flatSecTokenNdx = 0;
        for (uint256 tokenTypeId = 0; tokenTypeId < stTypesData._count_tokenTypes; tokenTypeId++) {
            uint256[] memory tokenType_stIds = ledgerData._ledger[account].tokenType_stIds[tokenTypeId];
            for (uint256 ndx = 0; ndx < tokenType_stIds.length; ndx++) {
                uint256 stId = tokenType_stIds[ndx];

                // sum ST sizes - convenience for caller
                tokens_sumQty += ledgerData._sts_currentQty[stId];

                // STs by type
                tokens[flatSecTokenNdx] = StructLib.LedgerSecTokenReturn({
                           stId: stId,
                    tokenTypeId: tokenTypeId,
                  tokenTypeName: stTypesData._tokenTypeNames[tokenTypeId],
                        batchId: ledgerData._sts_batchId[stId],
                     currentQty: ledgerData._sts_currentQty[stId]
              //mintedTimestamp: ledgerData._sts_mintedTimestamp[stId],
                 //splitFrom_id: ledgerData._sts_splitFrom_id[stId],
                   //splitTo_id: ledgerData._sts_splitTo_id[stId]
                });
                flatSecTokenNdx++;
            }
        }

        // populate balances for each currency type
        ccys = new StructLib.LedgerCcyReturn[](ccyTypesData._count_ccyTypes);
        for (uint256 ccyTypeId = 0; ccyTypeId < ccyTypesData._count_ccyTypes; ccyTypeId++) {
            ccys[ccyTypeId] = StructLib.LedgerCcyReturn({
                   ccyTypeId: ccyTypeId,
                        name: ccyTypesData._ccyTypes[ccyTypeId].name,
                        unit: ccyTypesData._ccyTypes[ccyTypeId].unit,
                     balance: ledgerData._ledger[account].ccyType_balance[ccyTypeId]
            });
        }

        StructLib.LedgerReturn memory ret = StructLib.LedgerReturn({
            exists: ledgerData._ledger[account].exists,
            tokens: tokens,
     tokens_sumQty: tokens_sumQty,
              ccys: ccys
        });
        return ret;
    }

    /*struct mintSecTokenBatchArgs {
        StructLib.LedgerStruct ledgerData;
        uint256 tokenTypeId;
        int256  mintQty;
        int256  mintSecTokenCount;
        address batchOwner;
        string[]  metaKeys;
        string[]  metaValues;
    }
    function mintSecTokenBatch(
        // StructLib.LedgerStruct storage ledgerData,
        // uint256 tokenTypeId,
        // int256  mintQty,
        // int256  mintSecTokenCount,
        // address batchOwner,
        // string[] calldata metaKeys,
        // string[] calldata metaValues
        mintSecTokenBatchArgs storage a
        )
        external {

        StructLib.SecTokenBatch memory newBatch = StructLib.SecTokenBatch({
                         id: a.ledgerData._batches_currentMax_id + 1,
            mintedTimestamp: block.timestamp,
                tokenTypeId: a.tokenTypeId,
                  mintedQty: uint256(a.mintQty),
                  burnedQty: 0,
                   metaKeys: a.metaKeys,
                 metaValues: a.metaValues
        });
        a.ledgerData._batches[newBatch.id] = newBatch;
        a.ledgerData._batches_currentMax_id++;
        emit MintedSecTokenBatch(newBatch.id, a.tokenTypeId, a.batchOwner, uint256(a.mintQty), uint256(a.mintSecTokenCount));

        // create ledger entry as required
        if (a.ledgerData._ledger[a.batchOwner].exists == false) {
            a.ledgerData._ledger[a.batchOwner] = StructLib.Ledger({
                  exists: true
            });
            a.ledgerData._ledgerOwners.push(a.batchOwner);
        }

        // mint & assign STs
        for (int256 ndx = 0; ndx < a.mintSecTokenCount; ndx++) {
            uint256 newId = a.ledgerData._tokens_currentMax_id + 1 + uint256(ndx);

            // mint ST
            uint256 stQty = uint256(a.mintQty) / uint256(a.mintSecTokenCount);
            a.ledgerData._sts_batchId[newId] = newBatch.id;
            a.ledgerData._sts_mintedQty[newId] = stQty;
            a.ledgerData._sts_currentQty[newId] = stQty;
            //a.ledgerData._sts_mintedTimestamp[newId] = block.timestamp;

            emit MintedSecToken(newId, newBatch.id, a.tokenTypeId, a.batchOwner, stQty);

            // assign
            a.ledgerData._ledger[a.batchOwner].tokenType_stIds[a.tokenTypeId].push(newId);

            // maintain fast ST ownership lookup - by keccak256(ledgerOwner||stId)
            // not currently used (was used when burning by stId)
            //a.ledgerData._ownsSecTokenId[keccak256(abi.encodePacked(a.batchOwner, newId))] = true;
        }
        //a.ledgerData._ledger[a.batchOwner].tokenType_sumQty[a.tokenTypeId] += uint256(a.mintQty);

        a.ledgerData._tokens_currentMax_id += uint256(a.mintSecTokenCount);
        a.ledgerData._tokens_totalMintedQty += uint256(a.mintQty);
    }*/
}