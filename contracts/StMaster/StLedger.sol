pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./SecTokenTypes.sol";
import "./CcyTypes.sol";

contract StLedger is Owned, SecTokenTypes, CcyTypes {

    // *** Batch LIST
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

    // *** SecTokens LIST (slightly more gas effecient than mapping(uint/*SecTokenId*/ => St/*{struct}*/))
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

    

    /**
     * @dev Returns all accounts in the ledger
     */
    function getLedgerOwners() external view returns (address[] memory) {
        require(msg.sender == owner, "Restricted method");
        return _ledgerOwners;
    }
    
    /**
     * @dev Returns an ST by ID
     */
    function getSecToken(uint256 id) external view returns (SecTokenReturn memory) {
        return SecTokenReturn({
                exists: _sts_batchId[id] != 0,
                    id: id,
             mintedQty: _sts_mintedQty[id],
            currentQty: _sts_currentQty[id],
               batchId: _sts_batchId[id]
     //mintedTimestamp: _sts_mintedTimestamp[id],
        //splitFrom_id: _sts_splitFrom_id[id],
          //splitTo_id: _sts_splitTo_id[id]
            });
    }

    /**
     * @dev Returns the ledger entry for a single account
     */
    function getLedgerEntry(address account) external view returns (LedgerReturn memory) {
        LedgerSecTokenReturn[] memory tokens;
        LedgerCcyReturn[] memory ccys;
        uint256 tokens_sumQty = 0;

        // count total # of tokens across all types
        uint256 countAllSecTokens = 0;
        for (uint256 tokenTypeId = 0; tokenTypeId < _count_tokenTypes; tokenTypeId++) {
            countAllSecTokens += _ledger[account].tokenType_stIds[tokenTypeId].length;
        }

        // flatten ST IDs and sum sizes across types
        tokens = new LedgerSecTokenReturn[](countAllSecTokens);
        uint256 flatSecTokenNdx = 0;
        for (uint256 tokenTypeId = 0; tokenTypeId < _count_tokenTypes; tokenTypeId++) {
            uint256[] memory tokenType_stIds = _ledger[account].tokenType_stIds[tokenTypeId];
            for (uint256 ndx = 0; ndx < tokenType_stIds.length; ndx++) {
                uint256 stId = tokenType_stIds[ndx];

                // sum ST sizes - convenience for caller
                tokens_sumQty += _sts_currentQty[stId];

                // STs by type
                tokens[flatSecTokenNdx] = LedgerSecTokenReturn({
                           stId: stId,
                    tokenTypeId: tokenTypeId,
                  tokenTypeName: _tokenTypeNames[tokenTypeId],
                        batchId: _sts_batchId[stId],
                     currentQty: _sts_currentQty[stId]
              //mintedTimestamp: _sts_mintedTimestamp[stId],
                 //splitFrom_id: _sts_splitFrom_id[stId],
                   //splitTo_id: _sts_splitTo_id[stId]
                });
                flatSecTokenNdx++;
            }
        }

        // populate balances for each currency type
        ccys = new LedgerCcyReturn[](_count_ccyTypes);
        for (uint256 ccyTypeId = 0; ccyTypeId < _count_ccyTypes; ccyTypeId++) {
            ccys[ccyTypeId] = LedgerCcyReturn({
                   ccyTypeId: ccyTypeId,
                        name: _ccyTypes[ccyTypeId].name,
                        unit: _ccyTypes[ccyTypeId].unit,
                     balance: _ledger[account].ccyType_balance[ccyTypeId]
            });
        }

        LedgerReturn memory ret = LedgerReturn({
            exists: _ledger[account].exists,
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
        return _batches_currentMax_id; // 1-based
    }

    /**
     * @dev Returns an ST batch by ID
     */
    function getSecTokenBatch(uint256 id) external view returns (SecTokenBatch memory) {
        return _batches[id];
    }

    /**
     * @dev Checks if the supplied ledger owner holds at least the specified quantity of supplied ST type
     * @param ledger Ledger owner
     * @param tokenTypeId ST type
     * @param qty Validation quantity in contract base unit
     */
    function sufficientTokens(address ledger, uint256 tokenTypeId, uint256 qty, uint256 fee) internal view returns (bool) {
        uint256 qtyAvailable = 0;
        for (uint i = 0; i < _ledger[ledger].tokenType_stIds[tokenTypeId].length; i++) {
            qtyAvailable += _sts_currentQty[_ledger[ledger].tokenType_stIds[tokenTypeId][i]];
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
        return _ledger[ledger].ccyType_balance[ccyTypeId] >= amount + fee;
    }
}
