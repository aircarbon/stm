pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";
import "./FeeLib.sol";

library TokenLib {
    event AddedSecTokenType(uint256 id, string name);
    event BurnedFullSecToken(uint256 indexed stId, uint256 tokenTypeId, address indexed ledgerOwner, uint256 burnedQty);
    event BurnedPartialSecToken(uint256 indexed stId, uint256 tokenTypeId, address indexed ledgerOwner, uint256 burnedQty);
    event MintedSecTokenBatch(uint256 indexed batchId, uint256 tokenTypeId, address indexed batchOwner, uint256 mintQty, uint256 mintSecTokenCount);
    event MintedSecToken(uint256 indexed stId, uint256 indexed batchId, uint256 tokenTypeId, address indexed ledgerOwner, uint256 mintedQty);
    event AddedBatchMetadata(uint256 indexed batchId, string key, string value);
    event SetBatchOriginatorFee_Token(uint256 indexed batchId, StructLib.SetFeeArgs originatorFee);
    event SetBatchOriginatorFee_Currency(uint256 indexed batchId, uint16 origCcyFee_percBips_ExFee);

    // TOKEN TYPES
    function addSecTokenType(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.StTypesStruct storage stTypesData,
        string memory name,
        StructLib.SettlementType settlementType)
    public {
        require(ledgerData.contractType == StructLib.ContractType.COMMODITY, "Bad cashflow request");

        for (uint256 tokenTypeId = 1; tokenTypeId <= stTypesData._count_tokenTypes; tokenTypeId++) {
            require(keccak256(abi.encodePacked(stTypesData._tokenTypeNames[tokenTypeId])) != keccak256(abi.encodePacked(name)), "Duplicate name");
        }

        stTypesData._count_tokenTypes++;
        stTypesData._tokenTypeNames[stTypesData._count_tokenTypes] = name;
        emit AddedSecTokenType(stTypesData._count_tokenTypes, name);
    }

    function getSecTokenTypes(
        StructLib.StTypesStruct storage stTypesData)
    public view returns (StructLib.GetSecTokenTypesReturn memory) {
        StructLib.SecTokenTypeReturn[] memory tokenTypes;
        tokenTypes = new StructLib.SecTokenTypeReturn[](stTypesData._count_tokenTypes);

        for (uint256 tokenTypeId = 1; tokenTypeId <= stTypesData._count_tokenTypes; tokenTypeId++) {
            tokenTypes[tokenTypeId - 1] = StructLib.SecTokenTypeReturn({
                    id: tokenTypeId,
                  name: stTypesData._tokenTypeNames[tokenTypeId],
        settlementType: stTypesData._tokenTypeSettlement[tokenTypeId]
            });
        }

        StructLib.GetSecTokenTypesReturn memory ret = StructLib.GetSecTokenTypesReturn({
            tokenTypes: tokenTypes
        });
        return ret;
    }

    // MINTING
    struct MintSecTokenBatchArgs {
        uint256              tokenTypeId;
        uint256              mintQty; // accept 256 bits, so we can downcast and test if in 64-bit range
        int64                mintSecTokenCount;
        address payable      batchOwner;
        StructLib.SetFeeArgs origTokFee;
        uint16               origCcyFee_percBips_ExFee;
        string[]             metaKeys;
        string[]             metaValues;
    }
    function mintSecTokenBatch(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.StTypesStruct storage stTypesData,
        MintSecTokenBatchArgs memory a)
    public {

        require(ledgerData._contractSealed, "Contract is not sealed");
        require(a.tokenTypeId >= 1 && a.tokenTypeId <= stTypesData._count_tokenTypes, "Bad tokenTypeId");
        //require(a.mintSecTokenCount >= 1, "Minimum one ST required");
        //require(a.mintQty % a.mintSecTokenCount == 0, "mintQty must divide evenly into mintSecTokenCount");
        require(a.mintSecTokenCount == 1, "Set mintSecTokenCount 1");
        require(a.mintQty >= 0x1 && a.mintQty <= 0xffffffffffffffff, "Bad mintQty"); // max uint64
        require(uint256(ledgerData._batches_currentMax_id) + 1 <= 0xffffffffffffffff, "Too many batches");
        require(a.origTokFee.fee_max >= a.origTokFee.fee_min || a.origTokFee.fee_max == 0, "Bad fee args");
        require(a.origTokFee.fee_percBips <= 10000, "Bad fee args");
        require(a.origTokFee.ccy_mirrorFee == false, "ccy_mirrorFee unsupported for token-type fee");
        require(a.origCcyFee_percBips_ExFee <= 10000, "Bad fee args");
        require(ledgerData.contractType == StructLib.ContractType.COMMODITY, "Bad cashflow request");

        // ### string[] param lengths are reported as zero!
        /*require(metaKeys.length == 0, "At least one metadata key must be provided");
        require(metaKeys.length <= 42, "Maximum metadata KVP length is 42");
        require(metaKeys.length != metaValues.length, "Metadata keys/values length mismatch");
        for (uint i = 0; i < metaKeys.length; i++) {
            require(bytes(metaKeys[i]).length == 0 || bytes(metaValues[i]).length == 0, "Zero-length metadata key or value supplied");
        }*/

        StructLib.SecTokenBatch memory newBatch = StructLib.SecTokenBatch({
                         id: ledgerData._batches_currentMax_id + 1,
            mintedTimestamp: block.timestamp,
                tokenTypeId: a.tokenTypeId,
                  mintedQty: uint256(a.mintQty),
                  burnedQty: 0,
                   metaKeys: a.metaKeys,
                 metaValues: a.metaValues,
                 origTokFee: a.origTokFee,
  origCcyFee_percBips_ExFee: a.origCcyFee_percBips_ExFee,
                 originator: a.batchOwner
        });
        ledgerData._batches[newBatch.id] = newBatch;
        ledgerData._batches_currentMax_id++;
        emit MintedSecTokenBatch(newBatch.id, a.tokenTypeId, a.batchOwner, uint256(a.mintQty), uint256(a.mintSecTokenCount));

        // create ledger entry as required
        StructLib.initLedgerIfNew(ledgerData, a.batchOwner);
        // if (ledgerData._ledger[a.batchOwner].exists == false) {
        //     ledgerData._ledger[a.batchOwner] = StructLib.Ledger({
        //             exists: true,
        //         customFees: StructLib.FeeStruct()
        //     });
        //     ledgerData._ledgerOwners.push(a.batchOwner);
        // }

        // mint & assign STs
        for (int256 ndx = 0; ndx < a.mintSecTokenCount; ndx++) {
            uint256 newId = ledgerData._tokens_currentMax_id + 1 + uint256(ndx);

            // mint ST
            uint64 stQty = uint64(a.mintQty) / uint64(a.mintSecTokenCount);
            ledgerData._sts[newId].batchId = uint64(newBatch.id);
            ledgerData._sts[newId].mintedQty = stQty;
            ledgerData._sts[newId].currentQty = stQty;

            emit MintedSecToken(newId, newBatch.id, a.tokenTypeId, a.batchOwner, stQty);

            // assign
            ledgerData._ledger[a.batchOwner].tokenType_stIds[a.tokenTypeId].push(newId);
        }

        ledgerData._tokens_currentMax_id += uint256(a.mintSecTokenCount);
        ledgerData._tokens_totalMintedQty += uint256(a.mintQty);

        ledgerData._ledger[a.batchOwner].tokens_sumQtyMinted += uint256(a.mintQty); //***
    }

    // POST-MINTING: add KVP metadata
    function addMetaSecTokenBatch(
        StructLib.LedgerStruct storage ledgerData,
        uint256 batchId,
        string memory metaKeyNew,
        string memory metaValueNew)
    public {
        require(ledgerData._contractSealed, "Contract is not sealed");
        require(batchId >= 1 && batchId <= ledgerData._batches_currentMax_id, "Bad batchId");

        for (uint256 kvpNdx = 0; kvpNdx < ledgerData._batches[batchId].metaKeys.length; kvpNdx++) {
            require(keccak256(abi.encodePacked(ledgerData._batches[batchId].metaKeys[kvpNdx])) !=
                    keccak256(abi.encodePacked(metaKeyNew)),
                    "Duplicate key");
        }

        ledgerData._batches[batchId].metaKeys.push(metaKeyNew);
        ledgerData._batches[batchId].metaValues.push(metaValueNew);
        emit AddedBatchMetadata(batchId, metaKeyNew, metaValueNew);
    }

    // POST-MINTING: set batch TOKEN fee
    function setOriginatorFeeTokenBatch(
        StructLib.LedgerStruct storage ledgerData,
        uint256 batchId,
        StructLib.SetFeeArgs memory originatorFeeNew)
    public {
        require(ledgerData._contractSealed, "Contract is not sealed");
        require(batchId >= 1 && batchId <= ledgerData._batches_currentMax_id, "Bad batchId");

        // can only lower fee after minting
        require(ledgerData._batches[batchId].origTokFee.fee_fixed >= originatorFeeNew.fee_fixed, "Bad fee args");
        require(ledgerData._batches[batchId].origTokFee.fee_percBips >= originatorFeeNew.fee_percBips, "Bad fee args");
        require(ledgerData._batches[batchId].origTokFee.fee_min >= originatorFeeNew.fee_min, "Bad fee args");
        require(ledgerData._batches[batchId].origTokFee.fee_max >= originatorFeeNew.fee_max, "Bad fee args");

        require(originatorFeeNew.fee_max >= originatorFeeNew.fee_min || originatorFeeNew.fee_max == 0, "Bad fee args");
        require(originatorFeeNew.fee_percBips <= 10000, "Bad fee args");
        require(originatorFeeNew.ccy_mirrorFee == false, "ccy_mirrorFee unsupported for token-type fee");

        ledgerData._batches[batchId].origTokFee = originatorFeeNew;
        emit SetBatchOriginatorFee_Token(batchId, originatorFeeNew);
    }

    // POST-MINTING: set batch CURRENCY fee
    function setOriginatorFeeCurrencyBatch(
        StructLib.LedgerStruct storage ledgerData,
        uint64 batchId,
        uint16 origCcyFee_percBips_ExFee)
    public {
        require(ledgerData._contractSealed, "Contract is not sealed");
        require(batchId >= 1 && batchId <= ledgerData._batches_currentMax_id, "Bad batchId");
        require(origCcyFee_percBips_ExFee <= 10000, "Bad fee args");

        // can only lower fee after minting
        require(ledgerData._batches[batchId].origCcyFee_percBips_ExFee >= origCcyFee_percBips_ExFee, "Bad fee args");

        ledgerData._batches[batchId].origCcyFee_percBips_ExFee = origCcyFee_percBips_ExFee;
        emit SetBatchOriginatorFee_Currency(batchId, origCcyFee_percBips_ExFee);
    }

    // BURNING
    function burnTokens(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.StTypesStruct storage stTypesData,
        address ledgerOwner,
        uint256 tokenTypeId,
        uint256 burnQty // accept 256 bits, so we can downcast and test if in 64-bit range
    )
    public {
        require(ledgerData._contractSealed, "Contract is not sealed");
        require(ledgerData._ledger[ledgerOwner].exists == true, "Bad ledgerOwner");
        require(burnQty >= 0x1 && burnQty <= 0xffffffffffffffff, "Bad burnQty"); // max uint64
        require(tokenTypeId >= 1 && tokenTypeId <= stTypesData._count_tokenTypes, "Bad tokenTypeId");

        // check ledger owner has sufficient tokens of supplied type
        require(StructLib.sufficientTokens(ledgerData, ledgerOwner, tokenTypeId, uint256(burnQty), 0) == true, "Insufficient tokens");
        // uint256 kgAvailable = 0;
        // for (uint i = 0; i < ledgerData._ledger[ledgerOwner].tokenType_stIds[tokenTypeId].length; i++) {
        //     kgAvailable += ledgerData._sts_currentQty[ledgerData._ledger[ledgerOwner].tokenType_stIds[tokenTypeId][i]];
        // }
        // require(kgAvailable >= uint256(burnQty), "Insufficient tokens");
        //require(ledgerData._ledger[ledgerOwner].tokenType_sumQty[tokenTypeId] >= uint256(burnQty), "Insufficient tokens");

        // burn (i.e. delete or resize) sufficient ST(s)
        uint256 ndx = 0;
        //uint256 remainingToBurn = uint256(burnQty);
        uint64 remainingToBurn = uint64(burnQty);

        while (remainingToBurn > 0) {
            uint256[] storage tokenType_stIds = ledgerData._ledger[ledgerOwner].tokenType_stIds[tokenTypeId];
            uint256 stId = tokenType_stIds[ndx];
            uint64 stQty = ledgerData._sts[stId].currentQty; //ledgerData._sts_currentQty[stId];
            uint64 batchId = ledgerData._sts[stId].batchId; //ledgerData._sts_batchId[stId];

            if (remainingToBurn >= stQty) {
                // burn the full ST
                //ledgerData._sts_currentQty[stId] = 0;
                ledgerData._sts[stId].currentQty = 0;

                // remove from ledger
                tokenType_stIds[ndx] = tokenType_stIds[tokenType_stIds.length - 1];
                tokenType_stIds.length--;
                //ledgerData._ledger[ledgerOwner].tokenType_sumQty[tokenTypeId] -= stQty;

                // burn from batch
                ledgerData._batches[batchId].burnedQty += stQty;

                remainingToBurn -= stQty;
                emit BurnedFullSecToken(stId, tokenTypeId, ledgerOwner, stQty);
            }
            else {
                // resize the ST (partial burn)
                //ledgerData._sts_currentQty[stId] -= remainingToBurn;
                ledgerData._sts[stId].currentQty -= remainingToBurn;

                // retain on ledger
                //ledgerData._ledger[ledgerOwner].tokenType_sumQty[tokenTypeId] -= remainingToBurn;

                // burn from batch
                ledgerData._batches[batchId].burnedQty += remainingToBurn;

                emit BurnedPartialSecToken(stId, tokenTypeId, ledgerOwner, remainingToBurn);
                remainingToBurn = 0;
            }
        }
        ledgerData._tokens_totalBurnedQty += uint256(burnQty);

        ledgerData._ledger[ledgerOwner].tokens_sumQtyBurned += uint256(burnQty); //***
    }
}