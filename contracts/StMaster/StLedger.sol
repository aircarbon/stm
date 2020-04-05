pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/IStLedger.sol";

import "./Owned.sol";

import "../Libs/LedgerLib.sol";
import "../Interfaces/StructLib.sol";
import "../Libs/TokenLib.sol";

contract StLedger is IStLedger,
    Owned {

    StructLib.LedgerStruct ledgerData;
    StructLib.StTypesStruct stTypesData;
    StructLib.CcyTypesStruct ccyTypesData;

    //
    // MUTATE LEDGER
    //
    function addSecTokenType(string memory name, StructLib.SettlementType settlementType, StructLib.FutureTokenTypeArgs memory ft)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.addSecTokenType(ledgerData, stTypesData, ccyTypesData, name, settlementType, ft);
    }

    function setFutureTokenVariationMargin(uint256 tokenTypeId, uint16 varMarginBips)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.setFutureTokenVariationMargin(stTypesData, tokenTypeId, varMarginBips);
    }

    function setReservedCcy(uint256 ccyTypeId, int256 reservedAmount, address ledger)
    public onlyOwner() onlyWhenReadWrite() {
        StructLib.setReservedCcy(ledgerData, ccyTypesData, ledger, ccyTypeId, reservedAmount);
    }

    //
    // VIEW LEDGER
    //
    function getSecTokenTypes() external view returns (StructLib.GetSecTokenTypesReturn memory) { return TokenLib.getSecTokenTypes(stTypesData); }

    function getLedgerOwners() external view returns (address[] memory) { return ledgerData._ledgerOwners; }
    function getLedgerOwnerCount() external view returns (uint256) { return ledgerData._ledgerOwners.length; }
    function getLedgerOwner(uint256 index) external view returns (address) { return ledgerData._ledgerOwners[index]; }
    function getLedgerEntry(address account) external view returns (StructLib.LedgerReturn memory) { return LedgerLib.getLedgerEntry(ledgerData, stTypesData, ccyTypesData, account); }
    function getSecTokenBatchCount() external view returns (uint256) { return ledgerData._batches_currentMax_id; } // 1-based

    function getSecToken(uint256 id) external view returns (StructLib.SecTokenReturn memory) {
        return StructLib.SecTokenReturn({
                exists: ledgerData._sts[id].mintedQty != 0,
                    id: id,
             mintedQty: ledgerData._sts[id].mintedQty,
            currentQty: ledgerData._sts[id].currentQty,
               batchId: ledgerData._sts[id].batchId,
              ft_price: ledgerData._sts[id].ft_price,
      ft_lastMarkPrice: ledgerData._sts[id].ft_lastMarkPrice
        });
    }

    function getSecTokenBatch(uint256 batchId) external view returns (StructLib.SecTokenBatch memory) {
        require(batchId >= 1 && batchId <= ledgerData._batches_currentMax_id, "Bad batchId");
        return ledgerData._batches[batchId];
    }
}
