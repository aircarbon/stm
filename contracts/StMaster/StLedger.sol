pragma solidity >=0.4.21 <=0.6.6;
pragma experimental ABIEncoderV2;

//import "../Interfaces/IStLedger.sol";

import "./Owned.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/LedgerLib.sol";
import "../Libs/TokenLib.sol";

contract StLedger is //IStLedger,
    Owned {

    StructLib.LedgerStruct ld;
    StructLib.StTypesStruct std;
    StructLib.CcyTypesStruct ctd;

    //
    // MUTATE LEDGER
    //
    function addSecTokenType(string memory name, StructLib.SettlementType settlementType, StructLib.FutureTokenTypeArgs memory ft)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.addSecTokenType(ld, std, ctd, name, settlementType, ft);
    }

    // #### TODO - move to StFutures...
    function setFuture_VariationMargin(uint256 tokenTypeId, uint16 varMarginBips)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.setFuture_VariationMargin(std, tokenTypeId, varMarginBips); // ### recalc all open pos margin/reserve; needs to be batched (job) - re. gas limits
    }
    function setFuture_FeePerContract(uint256 tokenTypeId, uint128 feePerContract)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.setFuture_FeePerContract(std, tokenTypeId, feePerContract);
    }

    function setReservedCcy(uint256 ccyTypeId, int256 reservedAmount, address ledger)
    public onlyOwner() onlyWhenReadWrite() {
        StructLib.setReservedCcy(ld, ctd, ledger, ccyTypeId, reservedAmount);
    }

    //
    // VIEW LEDGER
    //
    function getSecTokenTypes() external view returns (StructLib.GetSecTokenTypesReturn memory) { return TokenLib.getSecTokenTypes(std); }

    function getLedgerOwners() external view returns (address[] memory) { return ld._ledgerOwners; }

    // 24k
    function getLedgerOwnerCount() external view returns (uint256) { return ld._ledgerOwners.length; }
    function getLedgerOwner(uint256 index) external view returns (address) { return ld._ledgerOwners[index]; }

    function getLedgerEntry(address account) external view returns (StructLib.LedgerReturn memory) { return LedgerLib.getLedgerEntry(ld, std, ctd, account); }
    function getSecTokenBatchCount() external view returns (uint256) { return ld._batches_currentMax_id; } // 1-based

    function getSecToken(uint256 id) external view returns (StructLib.SecTokenReturn memory) {
        return StructLib.SecTokenReturn({
                exists: ld._sts[id].mintedQty != 0,
                    id: id,
             mintedQty: ld._sts[id].mintedQty,
            currentQty: ld._sts[id].currentQty,
               batchId: ld._sts[id].batchId,
              ft_price: ld._sts[id].ft_price,
        ft_ledgerOwner: ld._sts[id].ft_ledgerOwner,
      ft_lastMarkPrice: ld._sts[id].ft_lastMarkPrice,
                 ft_PL: ld._sts[id].ft_PL
        });
    }

    function getSecTokenBatch(uint256 batchId) external view returns (StructLib.SecTokenBatch memory) {
        require(batchId >= 1 && batchId <= ld._batches_currentMax_id, "Bad batchId");
        return ld._batches[batchId];
    }
}
