pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StTypes.sol";
import "./CcyTypes.sol";

import "../Lib/LedgerLib.sol";

contract StLedger is Owned, StTypes, CcyTypes {

    // *** Batch LIST
    /*
    mapping(uint256 => SecTokenBatch) _batches;                 // main batch list: all ST batches, by batch ID
    uint256 _batches_currentMax_id;                             // 1-based
    struct SecTokenBatch {
        uint256 id;                                             // global sequential id: 1-based
        uint256 mintedTimestamp;                                // minting block.timestamp
        uint256 tokenTypeId;                                    // token type of the batch
        uint256 mintedQty;                                      // total unit qty minted in the batch
        uint256 burnedQty;                                      // total unit qty burned from the batch
        string[] metaKeys;                                      // metadata keys
        string[] metaValues;                                    // metadata values
    }

    // *** SecTokens LIST (slightly more gas effecient than mapping(uint/ => struct))
    mapping(uint256 => uint256) _sts_batchId;
    mapping(uint256 => uint256) _sts_mintedQty;
    mapping(uint256 => uint256) _sts_currentQty;                // == 0 indicates fully burned, != _sts_mintedQty indicates partially burned
  //mapping(uint256 => uint256) _sts_mintedTimestamp;           // creation time - full initial minting, or transfer soft-minting (split) time
  //mapping(uint256 => uint256) _sts_splitFrom_id;              // the parent ST, if the ST was soft-minted in a transfer-split
  //mapping(uint256 => uint256) _sts_splitTo_id;                // the child ST, if the ST was a parent in a transfer-split
    uint256 _tokens_totalMintedQty;
    uint256 _tokens_totalBurnedQty;
    uint256 _tokens_totalTransferedQty;
    uint256 _tokens_totalFeesPaidQty;
    uint256 _tokens_currentMax_id;                              // 1-based - updated by Mint() and by transferSplitSecTokens()

        // return structs
        struct SecTokenReturn {
            bool    exists;                                     // for existence check by id
            uint256 id;                                         // global sequential id: 1-based
            uint256 mintedQty;                                  // initial unit qty minted in the ST
            uint256 currentQty;                                 // current (variable) unit qty in the ST (i.e. burned = currentQty - mintedQty)
            uint256 batchId;                                    // parent batch of the ST
          //uint256 mintedTimestamp;                            // minting block.timestamp
          //uint256 splitFrom_id;                               // the parent ST (if any)
          //uint256 splitTo_id;                                 // the child ST (if any)
        }

    // *** LEDGER
    mapping(address => Ledger) _ledger;                         // main ledger list: all entries, by account
    address[] _ledgerOwners;                                    // list of ledger owners (accounts)
  //mapping(bytes32 => bool) _ownsSecTokenId;                   // old: for ST ownership lookup: by keccak256(ledgerOwner, ST ID)
    struct Ledger {
        bool                          exists;                   // for existance check by address
        mapping(uint256 => uint256[]) tokenType_stIds;          // SecTokenTypeId -> stId[] of all owned STs
      //mapping(uint256 => uint256)   tokenType_sumQty;         // SecTokenTypeId -> sum of token qty's across all owned STs
        mapping(uint256 => int256)    ccyType_balance;          // CcyTypeId -> balance -- SIGNED! WE MAY WANT TO SUPPORT -VE BALANCES LATER...
    }
    mapping(uint256 => uint256) _ccyType_totalFunded;
    mapping(uint256 => uint256) _ccyType_totalWithdrawn;
    mapping(uint256 => uint256) _ccyType_totalTransfered;
    mapping(uint256 => uint256) _ccyType_totalFeesPaid;

        // return structs
        struct LedgerSecTokenReturn {                           // ledger return structure
            uint256 stId;
            uint256 tokenTypeId;
            string  tokenTypeName;
            uint256 batchId;
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
        struct LedgerReturn {
            bool                   exists;
            LedgerSecTokenReturn[] tokens;                      // STs with types & sizes (in contract base unit) information - v2
            uint256                tokens_sumQty;               // retained for caller convenience - v1
            LedgerCcyReturn[]      ccys;                        // currency balances
        }
    */

    LedgerLib.LedgerStruct ledgerData;

    /**
     * @dev Returns all accounts in the ledger
     */
    function getLedgerOwners() external view returns (address[] memory) {
        require(msg.sender == owner, "Restricted method");
        return ledgerData._ledgerOwners;
    }

    /**
     * @dev Returns an ST by ID
     */
    function getSecToken(uint256 id) external view returns (LedgerLib.SecTokenReturn memory) {
        return LedgerLib.SecTokenReturn({
                exists: ledgerData._sts_batchId[id] != 0,
                    id: id,
             mintedQty: ledgerData._sts_mintedQty[id],
            currentQty: ledgerData._sts_currentQty[id],
               batchId: ledgerData._sts_batchId[id]
     //mintedTimestamp: ledgerData._sts_mintedTimestamp[id],
        //splitFrom_id: ledgerData._sts_splitFrom_id[id],
          //splitTo_id: ledgerData._sts_splitTo_id[id]
            });
    }

    /**
     * @dev Returns the ledger entry for a single account
     */
    function getLedgerEntry(address account) external view returns (LedgerLib.LedgerReturn memory) {
        //
        // TODO: move LedgerLib structs to StructLib...
        //
        //return LedgerLib.getLedgerEntry(ledgerData, account);

        LedgerLib.LedgerSecTokenReturn[] memory tokens;
        LedgerLib.LedgerCcyReturn[] memory ccys;
        uint256 tokens_sumQty = 0;

        // count total # of tokens across all types
        uint256 countAllSecTokens = 0;
        for (uint256 tokenTypeId = 0; tokenTypeId < stTypesData._count_tokenTypes; tokenTypeId++) {
            countAllSecTokens += ledgerData._ledger[account].tokenType_stIds[tokenTypeId].length;
        }

        // flatten ST IDs and sum sizes across types
        tokens = new LedgerLib.LedgerSecTokenReturn[](countAllSecTokens);
        uint256 flatSecTokenNdx = 0;
        for (uint256 tokenTypeId = 0; tokenTypeId < stTypesData._count_tokenTypes; tokenTypeId++) {
            uint256[] memory tokenType_stIds = ledgerData._ledger[account].tokenType_stIds[tokenTypeId];
            for (uint256 ndx = 0; ndx < tokenType_stIds.length; ndx++) {
                uint256 stId = tokenType_stIds[ndx];

                // sum ST sizes - convenience for caller
                tokens_sumQty += ledgerData._sts_currentQty[stId];

                // STs by type
                tokens[flatSecTokenNdx] = LedgerLib.LedgerSecTokenReturn({
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
        ccys = new LedgerLib.LedgerCcyReturn[](ccyTypesData._count_ccyTypes);
        for (uint256 ccyTypeId = 0; ccyTypeId < ccyTypesData._count_ccyTypes; ccyTypeId++) {
            ccys[ccyTypeId] = LedgerLib.LedgerCcyReturn({
                   ccyTypeId: ccyTypeId,
                        name: ccyTypesData._ccyTypes[ccyTypeId].name,
                        unit: ccyTypesData._ccyTypes[ccyTypeId].unit,
                     balance: ledgerData._ledger[account].ccyType_balance[ccyTypeId]
            });
        }

        LedgerLib.LedgerReturn memory ret = LedgerLib.LedgerReturn({
            exists: ledgerData._ledger[account].exists,
            tokens: tokens,
     tokens_sumQty: tokens_sumQty,
              ccys: ccys
        });
        return ret;
    }

    /**
     * @dev Returns the global ST batch count
     */
    function getSecTokenBatchCount() external view returns (uint256) {
        return ledgerData._batches_currentMax_id; // 1-based
    }

    /**
     * @dev Returns an ST batch by ID
     */
    function getSecTokenBatch(uint256 id) external view returns (LedgerLib.SecTokenBatch memory) {
        return ledgerData._batches[id];
    }


    /**
     * @dev Checks if the supplied ledger owner holds at least the specified quantity of supplied ST type
     * @param ledger Ledger owner
     * @param tokenTypeId ST type
     * @param qty Validation quantity in contract base unit
     */
    function sufficientTokens(address ledger, uint256 tokenTypeId, uint256 qty, uint256 fee) internal view returns (bool) {
        uint256 qtyAvailable = 0;
        for (uint i = 0; i < ledgerData._ledger[ledger].tokenType_stIds[tokenTypeId].length; i++) {
            qtyAvailable += ledgerData._sts_currentQty[ledgerData._ledger[ledger].tokenType_stIds[tokenTypeId][i]];
        }
        return qtyAvailable >= qty + fee;
    }

    /**
     * @dev Checks if the supplied ledger owner holds at least the specified amount of supplied currency type
     * @param ledger Ledger owner
     * @param ccyTypeId currency type
     * @param amount Validation amount
     */
    function sufficientCcy(address ledger, uint256 ccyTypeId, int256 amount, int256 fee) internal view returns (bool) {
        return ledgerData._ledger[ledger].ccyType_balance[ccyTypeId] >= amount + fee;
    }
}
