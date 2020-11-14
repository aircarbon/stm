// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity >=0.4.21 <=0.7.1;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";
import "./StFees.sol";
import "./StErc20.sol";
import "./StPayable.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/TransferLib.sol";
import "../Libs/Erc20Lib.sol";
import "../Libs/LedgerLib.sol";

abstract // solc 0.6
contract StTransferable is Owned,
    StLedger, StFees, StErc20, StPayable {

    function getLedgerHashcode(uint mod, uint n) external view returns (bytes32) {
        return LedgerLib.getLedgerHashcode(ld, std, ctd, erc20d, /*cashflowData,*/ globalFees, mod, n);
    }

    function transferOrTrade(StructLib.TransferArgs memory a)
    public onlyOwner() onlyWhenReadWrite() {
        // abort if sending tokens from a non-whitelist account
        require(!(a.qty_A > 0 && !erc20d._whitelisted[a.ledger_A]), "Not whitelisted (A)"); 
        require(!(a.qty_B > 0 && !erc20d._whitelisted[a.ledger_B]), "Not whitelisted (B)");

        a.feeAddrOwner = deploymentOwner;
        TransferLib.transferOrTrade(ld, std, ctd, globalFees, a);
    }

    // FAST - fee preview exchange fee only
    function transfer_feePreview_ExchangeOnly(StructLib.TransferArgs calldata a)
    external view returns (StructLib.FeesCalc[1] memory feesAll) {
        return TransferLib.transfer_feePreview_ExchangeOnly(ld, globalFees, deploymentOwner, a);
    }

    // SLOW - fee preview, with batch originator token fees (full, slow) - old/deprecate
    // 24k -- REMOVE NEXT...
    uint256 constant MAX_BATCHES_PREVIEW = 128; // library constants not accessible in contract; must duplicate TransferLib value
    function transfer_feePreview(StructLib.TransferArgs calldata a)
    external view returns (StructLib.FeesCalc[1 + MAX_BATCHES_PREVIEW * 2] memory feesAll) {
        return TransferLib.transfer_feePreview(ld, std, globalFees, deploymentOwner, a);
    }

    // 24k
    // function getCcy_totalTransfered(uint256 ccyTypeId)
    // external view returns (uint256) {
    //     return ld._ccyType_totalTransfered[ccyTypeId];
    // }
    // function getSecToken_totalTransferedQty()
    // external view returns (uint256) {
    //     return ld._spot_total.transferedQty;
    // }
}
