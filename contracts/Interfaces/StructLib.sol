pragma solidity ^0.5.13;

library StructLib {

    // CONTRACT TYPE
    enum ContractType { COMMODITY, CASHFLOW }

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
        SettlementType settlementType;
    }
    struct GetSecTokenTypesReturn {
        SecTokenTypeReturn[] tokenTypes;
    }

    enum SettlementType { SPOT, FUTURE }
    struct StTypesStruct { // ** DATA_DUMP: OK
        mapping(uint256 => string)         _tokenTypeNames;     // typeId (1-based) -> typeName
        mapping(uint256 => SettlementType) _tokenTypeSettlement;
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
        SetFeeArgs origTokFee;                                  // batch originator token fee on all transfers of tokens from this batch
        uint16     origCcyFee_percBips_ExFee;                   // batch originator ccy fee on all transfers of tokens from this batch - % of exchange currency fee
        address payable originator;                             // original owner (minter) of the batch
    }

    struct Ledger {
        bool                          exists;                   // for existance check by address
        mapping(uint256 => uint256[]) tokenType_stIds;          // SecTokenTypeId -> stId[] of all owned STs
        mapping(uint256 => int256)    ccyType_balance;          // CcyTypeId -> balance -- SIGNED! WE MAY WANT TO SUPPORT -VE BALANCES LATER...
        StructLib.FeeStruct           customFees;               // global fee override - per ledger entry

        uint256                       tokens_sumQtyMinted;      // tests - TODO
        uint256                       tokens_sumQtyBurned;      // tests - TODO
    }

    struct LedgerReturn {                                       // ledger return structure
        bool                   exists;
        LedgerSecTokenReturn[] tokens;                          // STs with types & sizes (in contract base unit) information - v2
        uint256                tokens_sumQty;                   // retained for caller convenience - v1
        LedgerCcyReturn[]      ccys;                            // currency balances
        uint256                tokens_sumQtyMinted;
        uint256                tokens_sumQtyBurned;
    }
        struct LedgerSecTokenReturn {
            uint256 stId;
            uint256 tokenTypeId;
            string  tokenTypeName;
            uint64  batchId;
            uint256 mintedQty;
            uint256 currentQty;
        }
        struct LedgerCcyReturn {
            uint256 ccyTypeId;
            string  name;
            string  unit;
            int256  balance;
        }


    // *** PACKED SECURITY TOKEN ***
    struct PackedSt { // ** DATA_DUMP: OK
        uint64 batchId;
        uint64 mintedQty;
        uint64 currentQty;
    }
        struct SecTokenReturn {
            bool    exists;                                     // for existence check by id
            uint256 id;                                         // global sequential id: 1-based
            uint256 mintedQty;                                  // initial unit qty minted in the ST
            uint256 currentQty;                                 // current (variable) unit qty in the ST (i.e. burned = currentQty - mintedQty)
            uint64  batchId;                                    // parent batch of the ST
        }
    struct PackedStTotals {
        uint80 transferedQty;
        uint80 exchangeFeesPaidQty;
        uint80 originatorFeesPaidQty;
    }

    struct LedgerStruct {
        StructLib.ContractType contractType;

        // *** Batch LIST
        mapping(uint256 => SecTokenBatch) _batches;             // main batch list: all ST batches, by batch ID
        uint64 _batches_currentMax_id;                          // 1-based

        // *** SecTokens LIST
        mapping(uint256 => PackedSt) _sts;
        uint256 _tokens_currentMax_id;                          // 1-based - updated by Mint() and by transferSplitSecTokens()

        // *** LEDGER
        mapping(address => Ledger) _ledger;                     // main ledger list: all entries, by account
        address[] _ledgerOwners;                                // list of ledger owners (accounts)

        // global totals
        uint256 _tokens_totalMintedQty;                         // TODO: split by type
        uint256 _tokens_totalBurnedQty;                         // TODO: split by type

        PackedStTotals _tokens_total;

        mapping(uint256 => uint256) _ccyType_totalFunded;
        mapping(uint256 => uint256) _ccyType_totalWithdrawn;
        mapping(uint256 => uint256) _ccyType_totalTransfered;
        mapping(uint256 => uint256) _ccyType_totalFeesPaid;

        bool _contractSealed;
    }

    // FEE STRUCTURE -- (ledger or global) fees for all ccy's and token types
    struct FeeStruct {
        mapping(uint256 => bool) tokType_Set;    // bool - values are set for the token type
        mapping(uint256 => bool) ccyType_Set;    // bool - values are set for the currency type
        mapping(uint256 => SetFeeArgs) tok;      // fee structure by token type
        mapping(uint256 => SetFeeArgs) ccy;      // fee structure by currency type
    }
    struct SetFeeArgs { // fee for a specific ccy or token type
        uint256 fee_fixed;       // ccy & tok: transfer/trade - apply fixed a, if any
        uint256 fee_percBips;    // ccy & tok: transfer/trade - add a basis points a, if any - in basis points, i.e. minimum % = 1bp = 1/100 of 1% = 0.0001x
        uint256 fee_min;         // ccy & tok: transfer/trade - collar for a (if >0)
        uint256 fee_max;         // ccy & tok: transfer/trade - and cap for a (if >0)
        uint256 ccy_perMillion; // ccy only: trade - fixed ccy fee per million of trade counterparty's consideration token qty
        bool    ccy_mirrorFee;   // ccy only: trade - apply this ccy fee structure to counterparty's ccy balance, post trade
    }

    // ERC20 TYPES
    struct Erc20Struct {
        address[] _whitelist;
        mapping(address => bool) _whitelisted;
        uint256 _nextWhitelistNdx;
    }

    // CASHFLOW STRUCTURE
    enum CashflowType { BOND, EQUITY }
    struct CashflowArgs { // v1: single-issuance, single-subscriber

        CashflowType cashflowType;          // issuance type
        uint256      term_Blks;             // total term/tenor, in blocks - (todo: 0 for perpetual?)
        uint256      bond_bps;              // rates: basis points per year on principal
        uint256      bond_int_EveryBlks;    // rates: interest due every n blocks
    }
    struct CashflowStruct {
        CashflowArgs args;
        uint256      wei_currentPrice;      // current subscription price, in wei per token; or
        uint256      cents_currentPrice;    // current subscription price, in USD cents per token
        uint256      qty_issuanceMax;       // the amount minted in the issuance monobatch
        uint256      qty_issuanceRemaining; // the amount remaining unsold of the issuance monobatch
        uint256      qty_issuanceSold;      // the amount sold of the issuance monobatch
        uint256      qty_saleAllocation;    // the amount of the issuance monobatch that is available for sale

        //uint256      issued_Blk;         // issuance (start) block no
        // --> wei_totIssued
        // --> mapping(address ==> )

        // TODO: payment history... (& bond_int_lastPaidBlk)
        //uint256 bond_int_payments;       // todo - { block_no, amount, }
        //uint256 bond_int_lastPaidBlk;    // rates: last paid interest block no

        // TODO: getCashflowStatus() ==> returns in default or not, based on block.number # and issuer payment history...
    }

    // TRANSFERS
    struct TransferArgs {
        address ledger_A;
        address ledger_B;

        uint256 qty_A;           // ST quantity moving from A (excluding fees, if any)
        uint256 tokenTypeId_A;   // ST type moving from A

        uint256 qty_B;           // ST quantity moving from B (excluding fees, if any)
        uint256 tokenTypeId_B;   // ST type moving from B

        int256  ccy_amount_A;    // currency amount moving from A (excluding fees, if any)
                                 // (signed value: ledger ccyType_balance supports (theoretical) -ve balances)
        uint256 ccyTypeId_A;     // currency type moving from A

        int256  ccy_amount_B;    // currency amount moving from B (excluding fees, if any)
                                 // (signed value: ledger ccyType_balance supports (theoretical) -ve balances)
        uint256 ccyTypeId_B;     // currency type moving from B

        bool    applyFees;       // apply global fee structure to the transfer (both legs)
        address feeAddrOwner;    // exchange fees: receive address
    }
    struct FeesCalc {
        uint256 fee_ccy_A;       // currency fee paid by A
        uint256 fee_ccy_B;       // currency fee paid by B
        uint256 fee_tok_A;       // token fee paid by A
        uint256 fee_tok_B;       // token fee paid by B
        address fee_to;          // fees paid to

        uint256    origTokFee_qty;     // for originator token fees: token quantity from batch being sent by A or B
        uint64     origTokFee_batchId; // for originator token fees: batch ID supplying the sent token quantity
        SetFeeArgs origTokFee_struct;  // for originator token fees: batch originator token fee structure
    }

    /**
     * @notice Creates a new ledger entry, if not already existing
     * @param ledgerData Ledger data
     * @param addr Ledger entry address
     */
    function initLedgerIfNew (
        StructLib.LedgerStruct storage ledgerData,
        address addr
    )
    public {
        if (!ledgerData._ledger[addr].exists) {
            ledgerData._ledger[addr] = StructLib.Ledger({
                 exists: true,
             customFees: StructLib.FeeStruct(),
    tokens_sumQtyMinted: 0,
    tokens_sumQtyBurned: 0
            });
            ledgerData._ledgerOwners.push(addr);
        }
    }

    /**
     * @notice Checks if the supplied ledger owner holds at least the specified quantity of supplied ST type
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
     * @notice Checks if the supplied ledger owner holds at least the specified amount of supplied currency type
     * @param ledger Ledger owner
     * @param ccyTypeId currency type
     * @param sending Amount to be sent
     * @param receiving Amount to be received
     * @param fee Fee to be paid
     */
    function sufficientCcy(
        StructLib.LedgerStruct storage ledgerData,
        address ledger, uint256 ccyTypeId, int256 sending, int256 receiving, int256 fee
    ) public view returns (bool) {
        return ledgerData._ledger[ledger].ccyType_balance[ccyTypeId] + receiving >= sending + fee;
    }

}