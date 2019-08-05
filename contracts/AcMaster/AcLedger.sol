pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StaticExtendable.sol";

contract AcLedger is Owned, StaticExtendable {
    // EEU types
    // enum EeuType {
    //     UNFCCC, // https://cdm.unfccc.int -- CERs
    //     VCS,    // https://www.vcsprojectdatabase.org -- VCUs
    //     dummy_end
    // }

    // *** BATCH LIST
    mapping(uint256 => EeuBatch) _eeuBatches;                   // main batch list: all EEU batches, by ID
    uint256 _batchCurMaxId;
    struct EeuBatch {
        uint256 id;                                             // global sequential id: 1-based
        uint256 mintedTimestamp;                                // minting block.timestamp
        /*EeuType*/uint256 eeuTypeId;                           // EEU-type of the batch
        uint256 mintedKG;                                       // total KG of carbon minted in the batch EEUs
        uint256 burnedKG;                                       // total KG of carbon burned from the batch EEUs
    }

    // *** EEU LIST (slightly more gas effecient than mapping(uint => Eeu))
    mapping(uint256 => uint256) _eeus_batchId;
    mapping(uint256 => uint256) _eeus_mintedKG;
    mapping(uint256 => uint256) _eeus_KG;                       // == 0 indicates fully burned, != _eeus_mintedKG indicates partially burned
    mapping(uint256 => uint256) _eeus_mintedTimestamp;
    uint256 _eeuKgMinted;
    uint256 _eeuKgBurned;
    uint256 _eeuCurMaxId;                                       // TODO: to be updated by Mint() **and Split()** ...
        // return structs
        struct EeuReturn {
            bool    exists;                                     // for existence check by id
            uint256 id;                                         // global sequential id: 1-based
            uint256 mintedKG;                                   // initial KG minted in the EEU
            uint256 KG;                                         // current variable KG in the EEU (i.e. burned = KG - mintedKG)
            uint256 batchId;                                    // parent batch ID
            uint256 mintedTimestamp;                            // minting block.timestamp
        }

    // *** LEDGER
    mapping(address => Ledger) _ledger;                         // main ledger list: all entries, by account
    address[] _ledgerOwners;                                    // list of ledger owners (accounts)
    //mapping(bytes32 => bool) _ownsEeuId;                      // old: for EEU ownership lookup: by keccak256(ledgerOwner, EEU ID)
    struct Ledger {
        bool                                       exists;      // for existance check by address
        mapping(uint256/*EeuTypeId*/ => uint256[]) type_eeuIds;
        mapping(uint256/*EeuTypeId*/ => uint256)   type_sumKG;
        uint256                                    usdCents;    // owned USD quantity
        uint256                                    ethWei;      // owned ETH quantity
    }
        // return structs
        struct LedgerEeuReturn {                                // _ledger return structure (can't pass out nested arrays)
            uint256 eeuId;
            uint256 eeuTypeId;
            string  eeuTypeName;
            uint256 batchId;
            uint256 eeuKG;
        }
        struct LedgerReturn {
            bool              exists;
            LedgerEeuReturn[] eeus;                             // EEUs with type & size (KG) information - v2
            uint256[]         eeuIds;                           // TODO: remove - v1
            uint256           eeu_sumKG;                        // TODO: remove - v1
            uint256           usdCents;
            uint256           ethWei;
        }

    /**
     * @dev Returns all accounts in the ledger
     */
    function getLedgerOwners() external view returns (address[] memory) {
        return _ledgerOwners;
    }

    /**
     * @dev Returns the _ledger entry for a single account
     */
    function getLedgerEntry(address account) external view returns (LedgerReturn memory) {
        LedgerEeuReturn[] memory eeus;
        uint256[] memory eeuIds;
        uint256 eeu_sumKG = 0;
        if (_ledger[account].exists) {
            // count total # of eeus across all types
            uint256 countAllEeus = 0;
            //for (uint256 eeuType = 0; eeuType < uint256(EeuType.dummy_end); eeuType++) {
            for (uint256 eeuTypeId = 0; eeuTypeId < _count_eeuTypeIds; eeuTypeId++) {
                countAllEeus += _ledger[account].type_eeuIds[eeuTypeId].length;
            }
            eeus = new LedgerEeuReturn[](countAllEeus);
            eeuIds = new uint256[](countAllEeus);

            // flatten IDs and sum sizes across types
            uint256 flatEeuNdx = 0;
            //for (uint256 eeuType = 0; eeuType < uint256(EeuType.dummy_end); eeuType++) {
            for (uint256 eeuTypeId = 0; eeuTypeId < _count_eeuTypeIds; eeuTypeId++) {
                uint256[] memory type_eeuIds = _ledger[account].type_eeuIds[eeuTypeId];
                for (uint256 ndx = 0; ndx < type_eeuIds.length; ndx++) {
                    uint256 eeuId = type_eeuIds[ndx];

                    // flattened EEU IDs
                    eeuIds[flatEeuNdx] = eeuId;

                    // sum EEU sizes
                    eeu_sumKG += _eeus_KG[eeuId];

                    // EEUs by type
                    eeus[flatEeuNdx] = LedgerEeuReturn({
                          eeuId: eeuId,
                      eeuTypeId: eeuTypeId,
                    eeuTypeName: _eeuTypeIds[eeuTypeId],
                        batchId: _eeus_batchId[eeuId],
                          eeuKG: _eeus_KG[eeuId]
                    });

                    flatEeuNdx++;
                }
            }
        } else {
            eeus = new LedgerEeuReturn[](0);
            eeuIds = new uint256[](0);
        }

        LedgerReturn memory ret = LedgerReturn({
            exists: _ledger[account].exists,
              eeus: eeus,
            eeuIds: eeuIds,
         eeu_sumKG: eeu_sumKG,
          usdCents: _ledger[account].usdCents,
            ethWei: _ledger[account].ethWei
        });
        return ret;
    }

    /**
     * @dev Returns the global EEU batch count
     */
    function getEeuBatchCount() external view returns (uint256 count) {
        return _batchCurMaxId;
    }

    /**
     * @dev Returns an EEU batch by ID
     */
    function getEeuBatch(uint256 id) external view returns (EeuBatch memory batch) {
        return _eeuBatches[id];
    }

    /**
     * @dev Returns an EEU by ID
     */
    function getEeu(uint256 id) external view returns (EeuReturn memory eeu) {
        return
            EeuReturn({
                exists: _eeus_batchId[id] != 0,
                    id: id,
              mintedKG: _eeus_mintedKG[id],
                    KG: _eeus_KG[id],
               batchId: _eeus_batchId[id],
       mintedTimestamp: _eeus_mintedTimestamp[id]
            });
    }
}
