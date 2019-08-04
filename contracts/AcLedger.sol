pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";

contract AcLedger is Owned {
    // EEU types
    enum EeuType {
        UNFCCC, // https://cdm.unfccc.int -- CERs
        VCS,    // https://www.vcsprojectdatabase.org -- VCUs
        dummy_end
    }

    // GLOBAL EEU MINTED BATCHES LIST
    struct EeuBatch {
        //bytes32 id;                   // keccak256 (aka sha3): deterministic id of the EEU batch { block.timestamp || qty || ... }
        uint256 id;                     // global sequential id: 1-based
        uint256 mintedTimestamp;        // minting block.timestamp
        EeuType eeuType;                // EEU-type of the batch
        uint256 mintedKG;               // total KG of carbon minted in the batch EEUs
        uint256 burnedKG;               // total KG of carbon burned from the batch EEUs
    }
    mapping(uint256 => EeuBatch) eeuBatches; // all EEU batches, by ID
    uint256 batchCurMaxId;

    // GLOBAL EEU LIST
    //mapping(uint => Eeu) eeus; // not gas effecient as:
    mapping(uint256 => uint256) eeus_batchId;
    mapping(uint256 => uint256) eeus_mintedKG;
    mapping(uint256 => uint256) eeus_KG;
    mapping(uint256 => uint256) eeus_mintedTimestamp;
    //mapping(uint => uint) eeus_burningTimestamp;
    uint256 eeuKgMinted;
    uint256 eeuKgBurned;
    uint256 eeuCurMaxId; // todo: updated by Mint() **and Split()**
    struct EeuReturn {
        // EEU return structure (can't return mappings)
        //bytes32 id;                   // keccak256: deterministic id of the EEU { block.timestamp || batchId || sequenceNo }
        bool exists;                    // for existence check by id
        uint256 id;                     // global sequential id: 1-based
        uint256 mintedKG;               // initial KG minted in the EEU
        uint256 KG;                     // current variable KG in the EEU (i.e. burned = KG - mintedKG)
        uint256 batchId;                // parent batch ID
        uint256 mintedTimestamp;        // minting block.timestamp
        //uint burningTimestamp;        // burning block.timestamp
        //uint batchSequenceNo;         // the serial position of the EEU within the batch
    }

    // GLOBAL LEDGER
    struct Ledger {
        bool exists; // for existance check by address
        // MULTI-TYPE (independently tradeable)
        mapping(uint256 => uint256[]) type_eeuIds; /*EeuType*/
        mapping(uint256 => uint256) type_sumKG; /*EeuType*/
        uint256 usdCents;   // owned USD quantity
        uint256 ethWei;     // owned ETH quantity
    }
    mapping(address => Ledger) ledger;
    mapping(bytes32 => bool) ownsEeuId; // for EEU ownership lookup: by keccak256(ledgerOwner || EEU ID)
    struct LedgerEeuReturn {
        // ledger return structure (can't pass out nested arrays)
        EeuType eeuType;
        uint256 batchId;
        uint256 eeuId;
        uint256 eeuKG;
    }
    struct LedgerReturn {
        bool exists;
        LedgerEeuReturn[] eeus; // EEUs with type & size (KG) information - v2
        uint256[] eeuIds;   // flat - v1
        uint256 eeu_sumKG;  // flat - v1
        uint256 usdCents;
        uint256 ethWei;
    }

    /**
     * @dev Returns the ledger entry for an account
     */
    function getLedgerEntry(address account) external view returns (LedgerReturn memory entry) {
        //(Ledger memory entry) {
        //return ledger[account];

        LedgerEeuReturn[] memory eeus;
        uint256[] memory eeuIds;
        uint256 eeu_sumKG = 0;
        if (ledger[account].exists) {
            // count total # of eeus across all types
            uint256 countAllEeus = 0;
            for (uint256 eeuType = 0; eeuType < uint256(EeuType.dummy_end); eeuType++) {
                countAllEeus += ledger[account].type_eeuIds[eeuType].length;
            }
            eeus = new LedgerEeuReturn[](countAllEeus);
            eeuIds = new uint256[](countAllEeus);

            // flatten IDs and sum sizes across types
            uint256 flatEeuNdx = 0;
            for (uint256 eeuType = 0; eeuType < uint256(EeuType.dummy_end); eeuType++) {
                uint256[] memory type_eeuIds = ledger[account].type_eeuIds[eeuType];
                for (uint256 ndx = 0; ndx < type_eeuIds.length; ndx++) {
                    uint256 eeuId = type_eeuIds[ndx];

                    // flattened EEU IDs
                    eeuIds[flatEeuNdx] = eeuId;

                    // sum EEU sizes
                    eeu_sumKG += eeus_KG[eeuId];

                    // EEUs by type
                    eeus[flatEeuNdx] = LedgerEeuReturn({
                        eeuType: EeuType(eeuType),
                        batchId: eeus_batchId[eeuId],
                        eeuId: eeuId,
                        eeuKG: eeus_KG[eeuId]
                    });

                    flatEeuNdx++;
                }
            }
        } else {
            eeus = new LedgerEeuReturn[](0);
            eeuIds = new uint256[](0);
        }

        LedgerReturn memory ret = LedgerReturn({
            exists: ledger[account].exists,
            eeus: eeus,           // with type & size information
            eeuIds: eeuIds,       // flattened IDs
            eeu_sumKG: eeu_sumKG, // summed sizes
            usdCents: ledger[account].usdCents,
            ethWei: ledger[account].ethWei
        });
        return ret;
    }

    /**
     * @dev Returns the global EEU batch count
     */
    function getEeuBatchCount() external view returns (uint256 count) {
        return batchCurMaxId;
    }

    /**
     * @dev Returns an EEU batch by ID
     */
    function getEeuBatch(uint256 id) external view returns (EeuBatch memory batch) {
        return eeuBatches[id];
    }

    /**
     * @dev Returns the global no. of EEUs minted
     */
    function getEeuMintedCount() external view returns (uint256 count) {
        return eeuCurMaxId;
    }

    // ?
    //function getEeuBurnedCount() external view returns (uint count) { return eeuBurnedCount; }

    /**
     * @dev Returns the global no. of KGs carbon minted in EEUs
     */
    function getKgCarbonMinted() external view returns (uint256 count) {
        return eeuKgMinted;
    }

    /**
     * @dev Returns the global no. of KGs carbon burned in EEUs
     */
    function getKgCarbonBurned() external view returns (uint256 count) {
        return eeuKgBurned;
    }

    /**
     * @dev Returns an EEU by ID
     */
    function getEeu(uint256 id) external view returns (EeuReturn memory eeu) {
        return
            EeuReturn({
                exists: eeus_batchId[id] != 0,
                id: id,
                mintedKG: eeus_mintedKG[id],
                KG: eeus_KG[id],
                batchId: eeus_batchId[id],
                mintedTimestamp: eeus_mintedTimestamp[id]
                //burningTimestamp: eeus_burningTimestamp[id]
                //batchSequenceNo: eeus_batchSequenceNo[id]
            });
    }
}
