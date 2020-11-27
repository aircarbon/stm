// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity >=0.4.21 <=0.7.1;
pragma experimental ABIEncoderV2;

import "./Owned.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/LedgerLib.sol";
import "../Libs/TokenLib.sol";

contract StLedger is
    Owned {

    StructLib.LedgerStruct ld;
    StructLib.StTypesStruct std;
    StructLib.CcyTypesStruct ctd;

    //
    // MUTATE LEDGER
    //

    // add token type: direct (by name) or cashflow base (by address)
    function addSecTokenType(string memory name, StructLib.SettlementType settlementType, StructLib.FutureTokenTypeArgs memory ft, address payable cashflowBaseAddr)
    public onlyOwner() onlyWhenReadWrite() { TokenLib.addSecTokenType(ld, std, ctd, name, settlementType, ft, cashflowBaseAddr); }

    //
    // VIEW LEDGER
    //
    function getSecTokenTypes() external view returns (StructLib.GetSecTokenTypesReturn memory) { return TokenLib.getSecTokenTypes(std); }

    function getLedgerOwners() external view returns (address[] memory) { return ld._ledgerOwners; }

    // 24k??
    function getLedgerOwnerCount() external view returns (uint256) { return ld._ledgerOwners.length; }

    function getLedgerOwner(uint256 index) external view returns (address) { return ld._ledgerOwners[index]; }
    function getLedgerEntry(address account) external view returns (StructLib.LedgerReturn memory) { 
        return LedgerLib.getLedgerEntry(ld, std, ctd, account);
    }

    // get batch(es)
    function getSecTokenBatch_MaxId() external view returns (uint256) { return ld._batches_currentMax_id; } // 1-based
    function getSecTokenBatch(uint256 batchId) external view returns (StructLib.SecTokenBatch memory) {
        return ld._batches[batchId];
    }

    // get token(s)
    function getSecToken_BaseId() external view returns (uint256) { return ld._tokens_base_id; } // 1-based
    function getSecToken_MaxId() external view returns (uint256) { return ld._tokens_currentMax_id; } // 1-based
    function getSecToken(uint256 id) external view returns (
        StructLib.LedgerSecTokenReturn memory
    ) {
        return TokenLib.getSecToken(ld, std, id);
    }
}
