pragma solidity 0.5.13;

library StructLib {

    // CCY TYPES
    struct Ccy {
        uint256 id;
        string  name; // e.g. "USD", "BTC"
        string  unit; // e.g. "cents", "satoshi"
        uint16  decimals;
    }
    struct GetCcyTypesReturn {
        Ccy[] ccyTypes;
    }

    struct CcyTypesStruct { // ** DATA_DUMP: OK
        mapping(uint256 => Ccy) _ccyTypes;                     // typeId (1-based) -> ccy
        uint256 _count_ccyTypes;
    }

    // ST TYPES
    struct SecTokenTypeReturn {
        uint256 id;
        string  name;
    }
    struct GetSecTokenTypesReturn {
        SecTokenTypeReturn[] tokenTypes;
    }

    struct StTypesStruct { // ** DATA_DUMP: OK
        mapping(uint256 => string) _tokenTypeNames;             // typeId (1-based) -> typeName
        uint256 _count_tokenTypes;
    }

    // TOKEN BATCH
    struct SecTokenBatch { // ** DATA_DUMP: OK
        uint64     id;                                          // global sequential id: 1-based
        uint256    mintedTimestamp;                             // minting block.timestamp
        uint256    tokenTypeId;                                 // token type of the batch
        uint256    mintedQty;                                   // total unit qty minted in the batch
        uint256    burnedQty;                                   // total unit qty burned from the batch
        string[]   metaKeys;                                    // metadata keys
        string[]   metaValues;                                  // metadata values
        SetFeeArgs origTokFee;                                  // batch originator fees on all transfers of tokens from this batch
        address    originator;                                  // original owner (minter) of the batch
    }

    struct Ledger {
        bool                          exists;                   // for existance check by address
        mapping(uint256 => uint256[]) tokenType_stIds;          // SecTokenTypeId -> stId[] of all owned STs
      //mapping(uint256 => uint256)   tokenType_sumQty;         // SecTokenTypeId -> sum of token qty's across all owned STs
        mapping(uint256 => int256)    ccyType_balance;          // CcyTypeId -> balance -- SIGNED! WE MAY WANT TO SUPPORT -VE BALANCES LATER...
        StructLib.FeeStruct           customFees;               // global fee override - per ledger entry
    }

    struct LedgerReturn {                                       // ledger return structure
        bool                   exists;
        LedgerSecTokenReturn[] tokens;                          // STs with types & sizes (in contract base unit) information - v2
        uint256                tokens_sumQty;                   // retained for caller convenience - v1
        LedgerCcyReturn[]      ccys;                            // currency balances
    }
        struct LedgerSecTokenReturn {
            uint256 stId;
            uint256 tokenTypeId;
            string  tokenTypeName;
            uint64  batchId;
            uint256 currentQty;
            //uint256 mintedTimestamp;
            //uint256 splitFrom_id;
            //uint256 splitTo_id;
        }
        struct LedgerCcyReturn {
            uint256 ccyTypeId;
            string  name;
            string  unit;
            int256  balance;
        }


    // *** PACKED SECURITY TOKEN ***
    struct PackedSt {
        uint64 batchId;
        uint64 mintedQty;
        uint64 currentQty;
    }
        struct SecTokenReturn {
            bool    exists;                                     // for existence check by id
            uint256 id;                                         // global sequential id: 1-based
            uint256 mintedQty;                                  // initial unit qty minted in the ST
            uint256 currentQty;                                 // current (variable) unit qty in the ST (i.e. burned = currentQty - mintedQty)
            uint64 batchId;                                     // parent batch of the ST
            //uint256 mintedTimestamp;                          // minting block.timestamp
            //uint256 splitFrom_id;                             // the parent ST (if any)
            //uint256 splitTo_id;                               // the child ST (if any)
        }
    struct PackedStTotals {
        uint80 transferedQty;
        uint80 exchangeFeesPaidQty;
        uint80 originatorFeesPaidQty;
    }

    struct LedgerStruct {
        // *** Batch LIST
        mapping(uint256 => SecTokenBatch) _batches;             // main batch list: all ST batches, by batch ID
        uint64 _batches_currentMax_id;                          // 1-based

        // *** SecTokens LIST
        mapping(uint256 => PackedSt) _sts;

        // *** LEDGER
        mapping(address => Ledger) _ledger;                     // main ledger list: all entries, by account
        address[] _ledgerOwners;                                // list of ledger owners (accounts)

        // global totals
        uint256 _tokens_totalMintedQty;                         // TODO: split by type
        uint256 _tokens_totalBurnedQty;                         // TODO: split by type

        uint256 _tokens_currentMax_id;                          // 1-based - updated by Mint() and by transferSplitSecTokens()
        PackedStTotals _tokens_total;

        mapping(uint256 => uint256) _ccyType_totalFunded;
        mapping(uint256 => uint256) _ccyType_totalWithdrawn;
        mapping(uint256 => uint256) _ccyType_totalTransfered;
        mapping(uint256 => uint256) _ccyType_totalFeesPaid;
    }

    // FEE STRUCTURE -- (ledger or global) fees for all ccy's and token types
    struct FeeStruct {
        mapping(uint256 => bool) tokType_Set;    // bool - values are set for the token type
        mapping(uint256 => bool) ccyType_Set;    // bool - values are set for the currency type
        mapping(uint256 => SetFeeArgs) tok;      // fee structure by token type
        mapping(uint256 => SetFeeArgs) ccy;      // fee structure by currency type
    }
    struct SetFeeArgs { // fee for a specific ccy or token type
        uint256 fee_fixed;      // apply fixed a, if any
        uint256 fee_percBips;   // add a basis points a, if any - in basis points, i.e. minimum % = 1bp = 1/100 of 1% = 0.0001x
        uint256 fee_min;        // collar for a (if >0)
        uint256 fee_max;        // and cap for a (if >0)
    }

    // ERC20 TYPES
    struct Erc20Struct {
        bool _whitelistClosed;
        address[] _whitelist;
        mapping(address => bool) _whitelisted;
    }

    /**
     * @dev Checks if the supplied ledger owner holds at least the specified quantity of supplied ST type
     * @param ledger Ledger owner
     * @param tokenTypeId ST type
     * @param qty Validation quantity in contract base unit
     */
    function sufficientTokens(
        StructLib.LedgerStruct storage ledgerData,
        address ledger, uint256 tokenTypeId, uint256 qty, uint256 fee
    ) public view returns (bool) {
        uint256 qtyAvailable = 0;
        for (uint i = 0; i < ledgerData._ledger[ledger].tokenType_stIds[tokenTypeId].length; i++) {
            //qtyAvailable += ledgerData._sts_currentQty[ledgerData._ledger[ledger].tokenType_stIds[tokenTypeId][i]];
            qtyAvailable += ledgerData._sts[ledgerData._ledger[ledger].tokenType_stIds[tokenTypeId][i]].currentQty;
        }
        return qtyAvailable >= qty + fee;
    }

    /**
     * @dev Checks if the supplied ledger owner holds at least the specified amount of supplied currency type
     * @param ledger Ledger owner
     * @param ccyTypeId currency type
     * @param amount Validation amount
     */
    function sufficientCcy(
        StructLib.LedgerStruct storage ledgerData,
        address ledger, uint256 ccyTypeId, int256 amount, int256 fee
    ) public view returns (bool) {
        return ledgerData._ledger[ledger].ccyType_balance[ccyTypeId] >= amount + fee;
    }

}