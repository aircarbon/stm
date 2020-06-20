// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity >=0.4.21 <=0.6.10;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";
import "./SpotFeeLib.sol";
import "./Strings.sol";

import "../StMaster/StMaster.sol";

library TokenLib {
    using strings for *;

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
        StructLib.FutureTokenTypeArgs memory ft,
        address payable cashflowBaseAddr
    )
    public {

        // * allow any number of of direct spot or future types on commodity contract
        // * allow only a single direct spot type on cashflow-base contract
        // * allow any number of cashflow-base (indirect) spot types on cashflow-controller contract
        //   (todo - probably should allow direct futures-settlement type on cashflow-controller; these are centralised i.e. can't be withdrawn, so don't need separate base contracts)
        require((ld.contractType == StructLib.ContractType.COMMODITY           && cashflowBaseAddr == address(0x0)) ||
                (ld.contractType == StructLib.ContractType.CASHFLOW_BASE       && cashflowBaseAddr == address(0x0) && settlementType == StructLib.SettlementType.SPOT && std._tt_Count == 0) ||
                (ld.contractType == StructLib.ContractType.CASHFLOW_CONTROLLER && cashflowBaseAddr != address(0x0) && settlementType == StructLib.SettlementType.SPOT)
               , "Bad cashflow request");

        require(bytes(name).length > 0, "Invalid name");

        for (uint256 tokenTypeId = 1; tokenTypeId <= std._tt_Count; tokenTypeId++) {
            require(keccak256(abi.encodePacked(std._tt_name[tokenTypeId])) != keccak256(abi.encodePacked(name)), "Duplicate name");
        }
        if (settlementType == StructLib.SettlementType.FUTURE) {
            require(ft.expiryTimestamp > 1585699708, "Bad expiry");
            require(ft.underlyerTypeId > 0 && ft.underlyerTypeId <= std._tt_Count, "Bad underlyerTypeId");
            require(std._tt_settle[ft.underlyerTypeId] == StructLib.SettlementType.SPOT, "Bad underyler settlement type");
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

        if (cashflowBaseAddr != address(0x0)) {
            // add cashflow (base, indirect) contract type to cashflow-controller contract
            //StMaster base = StMaster(cashflowBaseAddr);
            //string memory s0 = base.name;
            //strings.slice memory s = "asd".toSlice();
            //string memory ss = s.toString();
            //string storage baseName = base.name;
            std._tt_name[std._tt_Count] = name; // https://ethereum.stackexchange.com/questions/3727/contract-reading-a-string-returned-by-another-contract
            std._tt_settle[std._tt_Count] = settlementType;
            std._tt_addr[std._tt_Count] = cashflowBaseAddr;
        }
        else {
            // add direct type to
            std._tt_name[std._tt_Count] = name;
            std._tt_settle[std._tt_Count] = settlementType;
            std._tt_addr[std._tt_Count] = cashflowBaseAddr;

            // futures
            if (settlementType == StructLib.SettlementType.FUTURE) {
                std._tt_ft[std._tt_Count] = ft;
            }
        }

        emit AddedSecTokenType(std._tt_Count, name, settlementType, ft.expiryTimestamp, ft.underlyerTypeId, ft.refCcyId, ft.initMarginBips, ft.varMarginBips);
    }

    function setFuture_FeePerContract(
        StructLib.StTypesStruct storage std, uint256 tokTypeId, uint128 feePerContract
    )
    public {
        require(tokTypeId >= 1 && tokTypeId <= std._tt_Count, "Bad tokTypeId");
        require(std._tt_settle[tokTypeId] == StructLib.SettlementType.FUTURE, "Bad token settlement type");
        std._tt_ft[tokTypeId].feePerContract = feePerContract;
        emit SetFutureFeePerContract(tokTypeId, feePerContract);
    }

    function setFuture_VariationMargin(
        StructLib.StTypesStruct storage std, uint256 tokTypeId, uint16 varMarginBips
    )
    public {
        require(tokTypeId >= 1 && tokTypeId <= std._tt_Count, "Bad tokTypeId");
        require(std._tt_settle[tokTypeId] == StructLib.SettlementType.FUTURE, "Bad token settlement type");
        require(std._tt_ft[tokTypeId].initMarginBips + varMarginBips <= 10000, "Bad total margin");
        std._tt_ft[tokTypeId].varMarginBips = varMarginBips;
        emit SetFutureVariationMargin(tokTypeId, varMarginBips);
    }

    function getSecTokenTypes(
        StructLib.StTypesStruct storage std
    )
    public view returns (StructLib.GetSecTokenTypesReturn memory) {
        StructLib.SecTokenTypeReturn[] memory tokenTypes;
        tokenTypes = new StructLib.SecTokenTypeReturn[](std._tt_Count);

        for (uint256 tokTypeId = 1; tokTypeId <= std._tt_Count; tokTypeId++) {
            tokenTypes[tokTypeId - 1] = StructLib.SecTokenTypeReturn({
                    id: tokTypeId,
                  name: std._tt_name[tokTypeId],
        settlementType: std._tt_settle[tokTypeId],
                    ft: std._tt_ft[tokTypeId],
      cashflowBaseAddr: std._tt_addr[tokTypeId]
            });
        }

        StructLib.GetSecTokenTypesReturn memory ret = StructLib.GetSecTokenTypesReturn({
            tokenTypes: tokenTypes
        });
        return ret;
    }

    // MINTING
    struct MintSecTokenBatchArgs {
        uint256              tokTypeId;
        uint256              mintQty; // accept 256 bits, so we can downcast and test if in 64-bit range
        int64                mintSecTokenCount;
        address payable      batchOwner;
        StructLib.SetFeeArgs origTokFee;
        uint16               origCcyFee_percBips_ExFee;
        string[]             metaKeys;
        string[]             metaValues;
    }
    function mintSecTokenBatch(
        StructLib.LedgerStruct storage  ld,
        StructLib.StTypesStruct storage std,
        MintSecTokenBatchArgs memory    a
    )
    public {

        require(ld._contractSealed, "Contract is not sealed");
        require(a.tokTypeId >= 1 && a.tokTypeId <= std._tt_Count, "Bad tokTypeId");
        require(a.mintSecTokenCount == 1, "Set mintSecTokenCount 1");
        require(a.mintQty >= 0x1 && a.mintQty <= 0x7fffffffffffffff, "Bad mintQty"); // max int64
        require(uint256(ld._batches_currentMax_id) + 1 <= 0xffffffffffffffff, "Too many batches");
        require(a.origTokFee.fee_max >= a.origTokFee.fee_min || a.origTokFee.fee_max == 0, "Bad fee args");
        require(a.origTokFee.fee_percBips <= 10000, "Bad fee args");
        require(a.origTokFee.ccy_mirrorFee == false, "ccy_mirrorFee unsupported for token-type fee");
        require(a.origCcyFee_percBips_ExFee <= 10000, "Bad fee args");

        if (ld.contractType == StructLib.ContractType.CASHFLOW_BASE) // CFT: uni-batch
            require(ld._batches_currentMax_id == 0, "Bad cashflow request");

        // ### string[] param lengths are reported as zero!
        /*require(metaKeys.length == 0, "At least one metadata key must be provided");
        require(metaKeys.length <= 42, "Maximum metadata KVP length is 42");
        require(metaKeys.length != metaValues.length, "Metadata keys/values length mismatch");
        for (uint i = 0; i < metaKeys.length; i++) {
            require(bytes(metaKeys[i]).length == 0 || bytes(metaValues[i]).length == 0, "Zero-length metadata key or value supplied");
        }*/

        // create batch (for all contract types, i.e. batch is duplicated/denormalized in cashflow base)
        StructLib.SecTokenBatch memory newBatch = StructLib.SecTokenBatch({
                         id: ld._batches_currentMax_id + 1,
            mintedTimestamp: block.timestamp,
                tokenTypeId: a.tokTypeId,
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
        if (ld.contractType != StructLib.ContractType.CASHFLOW_BASE) { // emit batch event (core & cashflow controller)
            emit Minted(newBatch.id, a.tokTypeId, a.batchOwner, uint256(a.mintQty), uint256(a.mintSecTokenCount));
        }

        // create ledger entry as required
        StructLib.initLedgerIfNew(ld, a.batchOwner);

        // mint & assign STs (delegate to cashflow base in cashflow controller)
        if (ld.contractType == StructLib.ContractType.CASHFLOW_CONTROLLER) { // CFT-C: passthrough to base
            //require(std._tt_addr[a.tokTypeId] != address(0x0), "Bad cashflow request");
            StMaster base = StMaster(std._tt_addr[a.tokTypeId]);
            base.mintSecTokenBatch(
                1, //a.tokTypeId, ==> maps to base typeId=1 (always: base is uni-type internally)
                a.mintQty,
                a.mintSecTokenCount,
                a.batchOwner,
                a.origTokFee,
                a.origCcyFee_percBips_ExFee,
                a.metaKeys,
                a.metaValues
            );
        }
        else {
            for (int256 ndx = 0; ndx < a.mintSecTokenCount; ndx++) {
                uint256 newId = ld._tokens_currentMax_id + 1 + uint256(ndx);
                int64 stQty = int64(a.mintQty) / int64(a.mintSecTokenCount);
                ld._sts[newId].batchId = uint64(newBatch.id);
                ld._sts[newId].mintedQty = stQty;
                ld._sts[newId].currentQty = stQty; // mint ST

                emit MintedSecToken(newId, newBatch.id, a.tokTypeId, a.batchOwner, uint256(stQty));
                ld._ledger[a.batchOwner].tokenType_stIds[a.tokTypeId].push(newId); // assign ST to ledger
            }
        }

        // update totals and current/max STID (CFT-C: common/max values across all types, CFT-B: local/specific values for single type)
        ld._tokens_currentMax_id += uint256(a.mintSecTokenCount);
        ld._spot_totalMintedQty += uint256(a.mintQty);
        ld._ledger[a.batchOwner].spot_sumQtyMinted += uint256(a.mintQty);
    }

    // POST-MINTING: add KVP metadata
    function addMetaSecTokenBatch(
        StructLib.LedgerStruct storage ld,
        uint256                        batchId,
        string memory                  metaKeyNew,
        string memory                  metaValueNew
    )
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
        uint64                         batchId,
        uint16                         origCcyFee_percBips_ExFee
    )
    public {
        require(ld._contractSealed, "Contract is not sealed");
        require(batchId >= 1 && batchId <= ld._batches_currentMax_id, "Bad batchId");
        require(origCcyFee_percBips_ExFee <= 10000, "Bad fee args");

        // can only lower fee after minting
        require(ld._batches[batchId].origCcyFee_percBips_ExFee >= origCcyFee_percBips_ExFee, "Bad fee args");

        ld._batches[batchId].origCcyFee_percBips_ExFee = origCcyFee_percBips_ExFee;
        emit SetBatchOriginatorFee_Currency(batchId, origCcyFee_percBips_ExFee);
    }

    //
    // BURNING
    //
    function burnTokens(
        StructLib.LedgerStruct storage  ld,
        StructLib.StTypesStruct storage std,
        address                         ledgerOwner,
        uint256                         tokTypeId,
        int256                          burnQty, // accept 256 bits, so we can downcast and test if in 64-bit range
        uint256[] memory                k_stIds
    )
    public {
        require(ld._contractSealed, "Contract is not sealed");
        require(ld._ledger[ledgerOwner].exists == true, "Bad ledgerOwner");

        require(tokTypeId >= 1 && tokTypeId <= std._tt_Count, "Bad tokTypeId");
        // require((k_stIds.length > 0 && burnQty == 0) ||
        //         (k_stIds.length == 0 && burnQty > 0),
        //         "Specify tokTypeId AND (k_stIds OR burnQty)");

        require(burnQty >= 0x1 && burnQty <= 0x7fffffffffffffff, "Bad burnQty"); // max int64

        if (k_stIds.length == 0) {
            require(StructLib.sufficientTokens(ld, ledgerOwner, tokTypeId, int256(burnQty), 0) == true, "Insufficient tokens");
        }
        else {
            int256 stQty;
            for (uint256 i = 0; i < k_stIds.length; i++) {
                require(StructLib.tokenExistsOnLedger(ld, tokTypeId, ledgerOwner, k_stIds[i]), "Bad stId"); // check supplied ST belongs to the supplied owner
                stQty += ld._sts[k_stIds[i]].currentQty; // get implied burn qty
            }
            require(stQty == burnQty, "Quantity mismatch");
            //burnQty = 0;
            // for (uint256 i = 0; i < k_stIds.length; i++) {
            //     require(StructLib.tokenExistsOnLedger(ld, tokTypeId, ledgerOwner, k_stIds[i]), "Bad stId");
            //     burnQty += ld._sts[k_stIds[i]].currentQty; // get implied burn qty
            // }
        }

        // burn (i.e. delete or resize) sufficient ST(s)
        uint256 ndx = 0;
        int64 remainingToBurn = int64(burnQty);
        while (remainingToBurn > 0) {
            uint256[] storage tokenType_stIds = ld._ledger[ledgerOwner].tokenType_stIds[tokTypeId];
            uint256 stId = tokenType_stIds[ndx];
            int64 stQty = ld._sts[stId].currentQty;
            uint64 batchId = ld._sts[stId].batchId;

            // if burning by specific ST IDs, skip over STs that weren't specified
            bool skip = false;
            if (k_stIds.length > 0) {
                skip = true;
                for (uint256 i = 0; i < k_stIds.length; i++) {
                    if (k_stIds[i] == stId) { skip = false; break; }
                }
            }
            if (skip) {
                ndx++;
            }
            else {
                if (remainingToBurn >= stQty) {
                    // burn the full ST
                    //ld._sts_currentQty[stId] = 0;
                    ld._sts[stId].currentQty = 0;

                    // remove from ledger
                    tokenType_stIds[ndx] = tokenType_stIds[tokenType_stIds.length - 1];
                    //tokenType_stIds.length--;
                    tokenType_stIds.pop(); // solc 0.6

                    //ld._ledger[ledgerOwner].tokenType_sumQty[tokTypeId] -= stQty;

                    // burn from batch
                    ld._batches[batchId].burnedQty += uint256(stQty);

                    remainingToBurn -= stQty;
                    emit BurnedFullSecToken(stId, tokTypeId, ledgerOwner, uint256(stQty));
                }
                else {
                    // resize the ST (partial burn)
                    //ld._sts_currentQty[stId] -= remainingToBurn;
                    ld._sts[stId].currentQty -= remainingToBurn;

                    // retain on ledger
                    //ld._ledger[ledgerOwner].tokenType_sumQty[tokTypeId] -= remainingToBurn;

                    // burn from batch
                    ld._batches[batchId].burnedQty += uint256(remainingToBurn);

                    emit BurnedPartialSecToken(stId, tokTypeId, ledgerOwner, uint256(remainingToBurn));
                    remainingToBurn = 0;
                }
            }
        }

        ld._spot_totalBurnedQty += uint256(burnQty);
        ld._ledger[ledgerOwner].spot_sumQtyBurned += uint256(burnQty);
        emit Burned(tokTypeId, ledgerOwner, uint256(burnQty));
    }
}