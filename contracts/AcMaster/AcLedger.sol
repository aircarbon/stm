pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./EeuTypes.sol";
import "./CcyTypes.sol";

contract AcLedger is Owned, EeuTypes, CcyTypes {

    // *** BATCH LIST
    mapping(uint256 => EeuBatch) _eeuBatches;                   // main batch list: all EEU batches, by ID
    uint256 _batchCurMaxId;                                     // 1-based
    struct EeuBatch {
        uint256 id;                                             // global sequential id: 1-based
        uint256 mintedTimestamp;                                // minting block.timestamp
        uint256 eeuTypeId;                                      // EEU-type of the batch
        uint256 mintedKG;                                       // total KG of carbon minted in the batch EEUs
        uint256 burnedKG;                                       // total KG of carbon burned from the batch EEUs
    }

    // *** EEU LIST (slightly more gas effecient than mapping(uint => Eeu))
    mapping(uint256 => uint256) _eeus_batchId;
    mapping(uint256 => uint256) _eeus_mintedKG;
    mapping(uint256 => uint256) _eeus_KG;                       // == 0 indicates fully burned, != _eeus_mintedKG indicates partially burned
    //mapping(uint256 => uint256) _eeus_mintedTimestamp;          // creation time - full initial minting, or transfer soft-minting (split) time
    //mapping(uint256 => uint256) _eeus_splitFromEeuId;           // the parent EEU ID, if the EEU was soft-minted in a transfer split
    //mapping(uint256 => uint256) _eeus_splitToEeuId;             // the child EEU ID, if the EEU was a parent in a transfer split
    uint256 _eeu_totalMintedKG;
    uint256 _eeu_totalBurnedKG;
    uint256 _eeu_totalTransferedKG;
    uint256 _eeuCurMaxId;                                       // 1-based - TODO: to be updated by Mint() **and Split()** ...
        // return structs
        struct EeuReturn {
            bool    exists;                                     // for existence check by id
            uint256 id;                                         // global sequential id: 1-based
            uint256 mintedKG;                                   // initial KG minted in the EEU
            uint256 KG;                                         // current variable KG in the EEU (i.e. burned = KG - mintedKG)
            uint256 batchId;                                    // parent batch ID
            //uint256 mintedTimestamp;                            // minting block.timestamp
            //uint256 splitFromId;                                // the parent EEU ID, if any
            //uint256 splitToId;                                  // the child EEU ID, if any
        }

    // *** LEDGER
    mapping(address => Ledger) _ledger;                         // main ledger list: all entries, by account
    address[] _ledgerOwners;                                    // list of ledger owners (accounts)
    //mapping(bytes32 => bool) _ownsEeuId;                      // old: for EEU ownership lookup: by keccak256(ledgerOwner, EEU ID)
    struct Ledger {
        bool                          exists;                   // for existance check by address
        mapping(uint256 => uint256[]) eeuType_eeuIds;           // EeuTypeId -> eeuId[] of all owned vEEU(s)
        //mapping(uint256 => uint256)   eeuType_sumKG;            // EeuTypeId -> sum KG carbon in all owned vEEU(s)
        mapping(uint256 => int256)    ccyType_balance;          // CcyTypeId -> balance
    }
    mapping(uint256 => uint256) _ccyType_totalFunded;
    mapping(uint256 => uint256) _ccyType_totalWithdrawn;
    mapping(uint256 => uint256) _ccyType_totalTransfered;
        // return structs
        struct LedgerEeuReturn {                                // ledger return structure
            uint256 eeuId;
            uint256 eeuTypeId;
            string  eeuTypeName;
            uint256 batchId;
            uint256 eeuKG;
            //uint256 mintedTimestamp;
            //uint256 splitFromId;
            //uint256 splitToId;
        }
        struct LedgerCcyReturn {
            uint256 typeId;
            string  name;
            string  unit;
            int256  balance;
        }
        struct LedgerReturn {
            bool              exists;
            LedgerEeuReturn[] eeus;                             // EEUs with type & size (KG) information - v2
            uint256           eeu_sumKG;                        // retained for caller convenience - v1
            LedgerCcyReturn[] ccys;                             // currency balances
        }

    /**
     * @dev Returns all accounts in the ledger
     */
    function getLedgerOwners() external view returns (address[] memory) {
        require(msg.sender == owner, "Restricted method");
        return _ledgerOwners;
    }
    
    /**
     * @dev Returns an EEU by ID
     */
    function getEeu(uint256 id) external view returns (EeuReturn memory) {
        return EeuReturn({
                exists: _eeus_batchId[id] != 0,
                    id: id,
              mintedKG: _eeus_mintedKG[id],
                    KG: _eeus_KG[id],
               batchId: _eeus_batchId[id]
       //mintedTimestamp: _eeus_mintedTimestamp[id],
           //splitFromId: _eeus_splitFromEeuId[id],
             //splitToId: _eeus_splitToEeuId[id]
            });
    }

    /**
     * @dev Returns the ledger entry for a single account
     */
    function getLedgerEntry(address account) external view returns (LedgerReturn memory) {
        LedgerEeuReturn[] memory eeus;
        LedgerCcyReturn[] memory ccys;
        uint256 eeu_sumKG = 0;

        // count total # of eeus across all types
        uint256 countAllEeus = 0;
        for (uint256 eeuTypeId = 0; eeuTypeId < _count_eeuTypes; eeuTypeId++) {
            countAllEeus += _ledger[account].eeuType_eeuIds[eeuTypeId].length;
        }

        // flatten EEU IDs and sum sizes across types
        eeus = new LedgerEeuReturn[](countAllEeus);
        uint256 flatEeuNdx = 0;
        for (uint256 eeuTypeId = 0; eeuTypeId < _count_eeuTypes; eeuTypeId++) {
            uint256[] memory eeuType_eeuIds = _ledger[account].eeuType_eeuIds[eeuTypeId];
            for (uint256 ndx = 0; ndx < eeuType_eeuIds.length; ndx++) {
                uint256 eeuId = eeuType_eeuIds[ndx];

                // sum EEU sizes - convenience for caller
                eeu_sumKG += _eeus_KG[eeuId];

                // EEUs by type
                eeus[flatEeuNdx] = LedgerEeuReturn({
                        eeuId: eeuId,
                    eeuTypeId: eeuTypeId,
                  eeuTypeName: _eeuTypeNames[eeuTypeId],
                      batchId: _eeus_batchId[eeuId],
                        eeuKG: _eeus_KG[eeuId]
              //mintedTimestamp: _eeus_mintedTimestamp[eeuId],
                  //splitFromId: _eeus_splitFromEeuId[eeuId],
                    //splitToId: _eeus_splitToEeuId[eeuId]
                });
                flatEeuNdx++;
            }
        }

        // populate balances for each currency type
        ccys = new LedgerCcyReturn[](_count_ccyTypes);
        for (uint256 ccyTypeId = 0; ccyTypeId < _count_ccyTypes; ccyTypeId++) {
            ccys[ccyTypeId] = LedgerCcyReturn({
                      typeId: ccyTypeId,
                        name: _ccyTypes[ccyTypeId].name,
                        unit: _ccyTypes[ccyTypeId].unit,
                     balance: _ledger[account].ccyType_balance[ccyTypeId]
            });
        }

        LedgerReturn memory ret = LedgerReturn({
            exists: _ledger[account].exists,
              eeus: eeus,
         eeu_sumKG: eeu_sumKG,
              ccys: ccys
        });
        return ret;
    }

    /**
     * @dev Returns the global EEU batch count
     */
    function getEeuBatchCount() external view returns (uint256) {
        return _batchCurMaxId; // 1-based
    }

    /**
     * @dev Returns an EEU batch by ID
     */
    function getEeuBatch(uint256 id) external view returns (EeuBatch memory) {
        return _eeuBatches[id];
    }
}
