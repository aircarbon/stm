pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/IStLedger.sol";

import "./Owned.sol";

import "../Libs/LedgerLib.sol";
import "../Interfaces/StructLib.sol";
import "../Libs/TokenLib.sol";

contract StLedger is IStLedger,
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

    function setFutureTokenVariationMargin(uint256 tokenTypeId, uint16 varMarginBips)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.setFutureTokenVariationMargin(std, tokenTypeId, varMarginBips);
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
      ft_lastMarkPrice: ld._sts[id].ft_lastMarkPrice
        });
    }

    function getSecTokenBatch(uint256 batchId) external view returns (StructLib.SecTokenBatch memory) {
        require(batchId >= 1 && batchId <= ld._batches_currentMax_id, "Bad batchId");
        return ld._batches[batchId];
    }
}
