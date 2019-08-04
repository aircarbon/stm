pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./AcLedger.sol";

contract EeuMintable is Owned, AcLedger {
    // Events -- TODO: encode full data in events
    event MintedEeuBatch(uint256 id);
    event MintedEeu(uint256 id);

    /**
     * mint and assign ownership new EEU batch
     * @param eeuType EEU-type for the batch
     * @param qtyKG KG quanity of carbon to mint across the EEUs
     * @param qtyEeus quantity of EEUs in the batch
     * @param batchOwner who to assign the minted EEUs to
     */
    function mintEeuBatch(EeuType eeuType, int256 qtyKG, int256 qtyEeus, address batchOwner) public {
        require(msg.sender == owner, "Restricted method");
        require(qtyKG >= 1000, "Minimum one metric ton of carbon required");
        require(eeuType != EeuType.dummy_end, "Invalid EEU type");
        require(qtyEeus >= 1, "Minimum one EEU required");
        require(qtyKG % qtyEeus == 0, "Carbon weight must divide evenly into EEUs");

        // create new EEU batch
        EeuBatch memory newBatch = EeuBatch({
            id: batchCurMaxId + 1,
            mintedTimestamp: block.timestamp,
            eeuType: eeuType,
            mintedKG: uint256(qtyKG),
            burnedKG: 0
        });
        //eeuBatches.push(newBatch);
        eeuBatches[newBatch.id] = newBatch;
        batchCurMaxId++;
        emit MintedEeuBatch(newBatch.id);

        // create ledger entry as required
        if (ledger[batchOwner].exists == false) {
            ledger[batchOwner] = Ledger({
                exists: true,
                //eeuIds: new uint[](0),
                //eeu_sumKG: 0,
                usdCents: 0,
                ethWei: 0
            });
        }

        // mint & assign EEUs
        for (int256 ndx = 0; ndx < qtyEeus; ndx++) {
            uint256 newId = eeuCurMaxId + 1 + uint256(ndx);

            // mint EEU
            uint256 eeuKG = uint256(qtyKG) / uint256(qtyEeus);
            eeus_batchId[newId] = newBatch.id;
            eeus_mintedKG[newId] = eeuKG;
            eeus_KG[newId] = eeuKG;
            eeus_mintedTimestamp[newId] = block.timestamp;

            emit MintedEeu(newId);

            // assign
            //ledger[batchOwner].eeuIds.push(newId);
            ledger[batchOwner].type_eeuIds[uint256(eeuType)].push(newId);

            // maintain fast EEU ownership lookup - by keccak256(ledgerOwner||eeuId)
            ownsEeuId[keccak256(abi.encodePacked(batchOwner, newId))] = true;
        }
        //ledger[batchOwner].eeu_sumKG += uint(qtyKG);
        ledger[batchOwner].type_sumKG[uint256(eeuType)] += uint256(qtyKG);

        eeuCurMaxId += uint256(qtyEeus);
        eeuKgMinted += uint256(qtyKG);
    }
}
