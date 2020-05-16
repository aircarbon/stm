pragma solidity >=0.4.21 <=0.6.6;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";
import "./SpotFeeLib.sol";

library TokenLib {
    event AddedSecTokenType(uint256 id, string name, StructLib.SettlementType settlementType, uint64 expiryTimestamp, uint256 underlyerTypeId, uint256 refCcyId, uint16 initMarginBips, uint16 varMarginBips);
    event SetFutureVariationMargin(uint256 tokenTypeId, uint16 varMarginBips);
    event SetFutureFeePerContract(uint256 tokenTypeId, uint256 feePerContract);

    event Burned(uint256 tokenTypeId, address indexed from, uint256 burnedQty);
    event BurnedFullSecToken(uint256 indexed stId, uint256 tokenTypeId, address indexed from, uint256 burnedQty);
    event BurnedPartialSecToken(uint256 indexed stId, uint256 tokenTypeId, address indexed from, uint256 burnedQty);

    event Minted(uint256 indexed batchId, uint256 tokenTypeId, address indexed to, uint256 mintQty, uint256 mintSecTokenCount);
    event MintedSecToken(uint256 indexed stId, uint256 indexed batchId, uint256 tokenTypeId, address indexed to, uint256 mintedQty);

    event AddedBatchMetadata(uint256 indexed batchId, string key, string value);
    event SetBatchOriginatorFee_Token(uint256 indexed batchId, StructLib.SetFeeArgs originatorFee);
    event SetBatchOriginatorFee_Currency(uint256 indexed batchId, uint16 origCcyFee_percBips_ExFee);

    // TOKEN TYPES
    function addSecTokenType(
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        StructLib.CcyTypesStruct storage ctd,
        string memory name,
        StructLib.SettlementType settlementType,
        StructLib.FutureTokenTypeArgs memory ft
    )
    public {
        // disallow tokens on cashflow controller contract, only allow single token type on cashflow contract
        require(ld.contractType == StructLib.ContractType.COMMODITY ||
               (ld.contractType == StructLib.ContractType.CASHFLOW && std._tt_Count == 0), "Bad cashflow request");

        for (uint256 tokenTypeId = 1; tokenTypeId <= std._tt_Count; tokenTypeId++) {
            require(keccak256(abi.encodePacked(std._tt_Name[tokenTypeId])) != keccak256(abi.encodePacked(name)), "Duplicate name");
        }
        if (settlementType == StructLib.SettlementType.FUTURE) {
            require(ft.expiryTimestamp > 1585699708, "Bad expiry");
            require(ft.underlyerTypeId > 0 && ft.underlyerTypeId <= std._tt_Count, "Bad underlyerTypeId");
            require(std._tt_Settle[ft.underlyerTypeId] == StructLib.SettlementType.SPOT, "Bad underyler settlement type");
            require(ft.refCcyId > 0 && ft.refCcyId <= ctd._ct_Count, "Bad refCcyId");
            require(ft.initMarginBips + ft.varMarginBips <= 10000, "Bad total margin");
            require(ft.contractSize > 0, "Bad contractSize");
        }
        else if (settlementType == StructLib.SettlementType.SPOT) {
            require(ft.expiryTimestamp == 0, "Invalid expiryTimestamp");
            require(ft.underlyerTypeId == 0, "Invalid underlyerTypeId");
            require(ft.refCcyId == 0, "Invalid refCcyId");
            require(ft.contractSize == 0, "Invalid contractSize");
            require(ft.feePerContract == 0, "Invalid feePerContract");
        }

        std._tt_Count++;
        std._tt_Name[std._tt_Count] = name;
        std._tt_Settle[std._tt_Count] = settlementType;

        // futures
        if (settlementType == StructLib.SettlementType.FUTURE) {
            std._tt_ft[std._tt_Count] = ft;
        }

        emit AddedSecTokenType(std._tt_Count, name, settlementType, ft.expiryTimestamp, ft.underlyerTypeId, ft.refCcyId, ft.initMarginBips, ft.varMarginBips);
    }

    function setFuture_FeePerContract(
        StructLib.StTypesStruct storage std, uint256 tokenTypeId, uint128 feePerContract
    )
    public {
        require(tokenTypeId >= 1 && tokenTypeId <= std._tt_Count, "Bad tokenTypeId");
        require(std._tt_Settle[tokenTypeId] == StructLib.SettlementType.FUTURE, "Bad token settlement type");
        std._tt_ft[tokenTypeId].feePerContract = feePerContract;
        emit SetFutureFeePerContract(tokenTypeId, feePerContract);
    }

    function setFuture_VariationMargin(
        StructLib.StTypesStruct storage std, uint256 tokenTypeId, uint16 varMarginBips
    )
    public {
        require(tokenTypeId >= 1 && tokenTypeId <= std._tt_Count, "Bad tokenTypeId");
        require(std._tt_Settle[tokenTypeId] == StructLib.SettlementType.FUTURE, "Bad token settlement type");
        require(std._tt_ft[tokenTypeId].initMarginBips + varMarginBips <= 10000, "Bad total margin");
        std._tt_ft[tokenTypeId].varMarginBips = varMarginBips;
        emit SetFutureVariationMargin(tokenTypeId, varMarginBips);
    }

    function getSecTokenTypes(
        StructLib.StTypesStruct storage std)
    public view returns (StructLib.GetSecTokenTypesReturn memory) {
        StructLib.SecTokenTypeReturn[] memory tokenTypes;
        tokenTypes = new StructLib.SecTokenTypeReturn[](std._tt_Count);

        for (uint256 tokenTypeId = 1; tokenTypeId <= std._tt_Count; tokenTypeId++) {
            tokenTypes[tokenTypeId - 1] = StructLib.SecTokenTypeReturn({
                    id: tokenTypeId,
                  name: std._tt_Name[tokenTypeId],
        settlementType: std._tt_Settle[tokenTypeId],
                    ft: std._tt_ft[tokenTypeId]
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
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        MintSecTokenBatchArgs memory a)
    public {

        require(ld._contractSealed, "Contract is not sealed");
        require(a.tokenTypeId >= 1 && a.tokenTypeId <= std._tt_Count, "Bad tokenTypeId");
        require(a.mintSecTokenCount == 1, "Set mintSecTokenCount 1");
        require(a.mintQty >= 0x1 && a.mintQty <= 0x7fffffffffffffff, "Bad mintQty"); // max int64
        require(uint256(ld._batches_currentMax_id) + 1 <= 0xffffffffffffffff, "Too many batches");
        require(a.origTokFee.fee_max >= a.origTokFee.fee_min || a.origTokFee.fee_max == 0, "Bad fee args");
        require(a.origTokFee.fee_percBips <= 10000, "Bad fee args");
        require(a.origTokFee.ccy_mirrorFee == false, "ccy_mirrorFee unsupported for token-type fee");
        require(a.origCcyFee_percBips_ExFee <= 10000, "Bad fee args");

        if (ld.contractType == StructLib.ContractType.CASHFLOW)
            require(ld._batches_currentMax_id == 0, "Bad cashflow request");

        // ### string[] param lengths are reported as zero!
        /*require(metaKeys.length == 0, "At least one metadata key must be provided");
        require(metaKeys.length <= 42, "Maximum metadata KVP length is 42");
        require(metaKeys.length != metaValues.length, "Metadata keys/values length mismatch");
        for (uint i = 0; i < metaKeys.length; i++) {
            require(bytes(metaKeys[i]).length == 0 || bytes(metaValues[i]).length == 0, "Zero-length metadata key or value supplied");
        }*/

        StructLib.SecTokenBatch memory newBatch = StructLib.SecTokenBatch({
                         id: ld._batches_currentMax_id + 1,
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
        ld._batches[newBatch.id] = newBatch;
        ld._batches_currentMax_id++;
        emit Minted(newBatch.id, a.tokenTypeId, a.batchOwner, uint256(a.mintQty), uint256(a.mintSecTokenCount));

        // create ledger entry as required
        StructLib.initLedgerIfNew(ld, a.batchOwner);

        // mint & assign STs
        for (int256 ndx = 0; ndx < a.mintSecTokenCount; ndx++) {
            uint256 newId = ld._tokens_currentMax_id + 1 + uint256(ndx);

            // mint ST
            int64 stQty = int64(a.mintQty) / int64(a.mintSecTokenCount);
            ld._sts[newId].batchId = uint64(newBatch.id);
            ld._sts[newId].mintedQty = stQty;
            ld._sts[newId].currentQty = stQty;

            emit MintedSecToken(newId, newBatch.id, a.tokenTypeId, a.batchOwner, uint256(stQty));

            // assign ST to ledger
            ld._ledger[a.batchOwner].tokenType_stIds[a.tokenTypeId].push(newId);
        }

        ld._tokens_currentMax_id += uint256(a.mintSecTokenCount);

        ld._spot_totalMintedQty += uint256(a.mintQty);
        ld._ledger[a.batchOwner].spot_sumQtyMinted += uint256(a.mintQty);
    }

    // POST-MINTING: add KVP metadata
    function addMetaSecTokenBatch(
        StructLib.LedgerStruct storage ld,
        uint256 batchId,
        string memory metaKeyNew,
        string memory metaValueNew)
    public {
        require(ld._contractSealed, "Contract is not sealed");
        require(batchId >= 1 && batchId <= ld._batches_currentMax_id, "Bad batchId");

        for (uint256 kvpNdx = 0; kvpNdx < ld._batches[batchId].metaKeys.length; kvpNdx++) {
            require(keccak256(abi.encodePacked(ld._batches[batchId].metaKeys[kvpNdx])) != keccak256(abi.encodePacked(metaKeyNew)), "Duplicate key");
        }

        ld._batches[batchId].metaKeys.push(metaKeyNew);
        ld._batches[batchId].metaValues.push(metaValueNew);
        emit AddedBatchMetadata(batchId, metaKeyNew, metaValueNew);
    }

    // POST-MINTING: set batch TOKEN fee
    function setOriginatorFeeTokenBatch(
        StructLib.LedgerStruct storage ld,
        uint256 batchId,
        StructLib.SetFeeArgs memory originatorFeeNew)
    public {
        require(ld._contractSealed, "Contract is not sealed");
        require(batchId >= 1 && batchId <= ld._batches_currentMax_id, "Bad batchId");

        // can only lower fee after minting
        require(ld._batches[batchId].origTokFee.fee_fixed >= originatorFeeNew.fee_fixed, "Bad fee args");
        require(ld._batches[batchId].origTokFee.fee_percBips >= originatorFeeNew.fee_percBips, "Bad fee args");
        require(ld._batches[batchId].origTokFee.fee_min >= originatorFeeNew.fee_min, "Bad fee args");
        require(ld._batches[batchId].origTokFee.fee_max >= originatorFeeNew.fee_max, "Bad fee args");

        require(originatorFeeNew.fee_max >= originatorFeeNew.fee_min || originatorFeeNew.fee_max == 0, "Bad fee args");
        require(originatorFeeNew.fee_percBips <= 10000, "Bad fee args");
        require(originatorFeeNew.ccy_mirrorFee == false, "ccy_mirrorFee unsupported for token-type fee");

        ld._batches[batchId].origTokFee = originatorFeeNew;
        emit SetBatchOriginatorFee_Token(batchId, originatorFeeNew);
    }

    // POST-MINTING: set batch CURRENCY fee
    function setOriginatorFeeCurrencyBatch(
        StructLib.LedgerStruct storage ld,
        uint64 batchId,
        uint16 origCcyFee_percBips_ExFee)
    public {
        require(ld._contractSealed, "Contract is not sealed");
        require(batchId >= 1 && batchId <= ld._batches_currentMax_id, "Bad batchId");
        require(origCcyFee_percBips_ExFee <= 10000, "Bad fee args");

        // can only lower fee after minting
        require(ld._batches[batchId].origCcyFee_percBips_ExFee >= origCcyFee_percBips_ExFee, "Bad fee args");

        ld._batches[batchId].origCcyFee_percBips_ExFee = origCcyFee_percBips_ExFee;
        emit SetBatchOriginatorFee_Currency(batchId, origCcyFee_percBips_ExFee);
    }

    // BURNING
    function burnTokens(
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        address ledgerOwner,
        uint256 tokenTypeId,
        int256 burnQty // accept 256 bits, so we can downcast and test if in 64-bit range
    )
    public {
        require(ld._contractSealed, "Contract is not sealed");
        require(ld._ledger[ledgerOwner].exists == true, "Bad ledgerOwner");
        require(burnQty >= 0x1 && burnQty <= 0x7fffffffffffffff, "Bad burnQty"); // max int64
        require(tokenTypeId >= 1 && tokenTypeId <= std._tt_Count, "Bad tokenTypeId");

        // check ledger owner has sufficient tokens of supplied type
        require(StructLib.sufficientTokens(ld, ledgerOwner, tokenTypeId, int256(burnQty), 0) == true, "Insufficient tokens");

        // burn (i.e. delete or resize) sufficient ST(s)
        uint256 ndx = 0;
        int64 remainingToBurn = int64(burnQty);

        while (remainingToBurn > 0) {
            uint256[] storage tokenType_stIds = ld._ledger[ledgerOwner].tokenType_stIds[tokenTypeId];
            uint256 stId = tokenType_stIds[ndx];
            int64 stQty = ld._sts[stId].currentQty;
            uint64 batchId = ld._sts[stId].batchId;

            if (remainingToBurn >= stQty) {
                // burn the full ST
                //ld._sts_currentQty[stId] = 0;
                ld._sts[stId].currentQty = 0;

                // remove from ledger
                tokenType_stIds[ndx] = tokenType_stIds[tokenType_stIds.length - 1];
                //tokenType_stIds.length--;
                tokenType_stIds.pop(); // solc 0.6

                //ld._ledger[ledgerOwner].tokenType_sumQty[tokenTypeId] -= stQty;

                // burn from batch
                ld._batches[batchId].burnedQty += uint256(stQty);

                remainingToBurn -= stQty;
                emit BurnedFullSecToken(stId, tokenTypeId, ledgerOwner, uint256(stQty));
            }
            else {
                // resize the ST (partial burn)
                //ld._sts_currentQty[stId] -= remainingToBurn;
                ld._sts[stId].currentQty -= remainingToBurn;

                // retain on ledger
                //ld._ledger[ledgerOwner].tokenType_sumQty[tokenTypeId] -= remainingToBurn;

                // burn from batch
                ld._batches[batchId].burnedQty += uint256(remainingToBurn);

                emit BurnedPartialSecToken(stId, tokenTypeId, ledgerOwner, uint256(remainingToBurn));
                remainingToBurn = 0;
            }
        }

        ld._spot_totalBurnedQty += uint256(burnQty);
        ld._ledger[ledgerOwner].spot_sumQtyBurned += uint256(burnQty);
        emit Burned(tokenTypeId, ledgerOwner, uint256(burnQty));
    }
}