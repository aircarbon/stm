pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";
import "./StFees.sol";
import "./StErc20.sol";

import "../Libs/StructLib.sol";
import "../Libs/TransferLib.sol";
import "../Libs/Erc20Lib.sol";

contract StTransferable is Owned, StLedger, StFees, StErc20 {
    
    /**
     * @dev Transfers or trades assets between ledger accounts
     * @dev allows: one-sided transfers, transfers of same asset types, and transfers (trades) of different asset types
     * @dev disallows: movement from a single origin of more than one asset-type
     * @dev optionally applies: fees per the current fee structure, and paying them to contract owner's ledger entry
     * @param a TransferLib.TransferArgs arguments
     */
    function transferOrTrade(TransferLib.TransferArgs memory a) // TODO: need to rename to avoid name collision with erc20 transfer?
    public onlyOwner() onlyWhenReadWrite() {
        // abort if sending tokens from a non-whitelist account
        require(!(a.qty_A > 0 && !erc20Data._whitelisted[a.ledger_A]), "Not whitelisted (A)");
        require(!(a.qty_B > 0 && !erc20Data._whitelisted[a.ledger_B]), "Not whitelisted (B)");

        a.feeAddrOwner = owner;
        TransferLib.transferOrTrade(ledgerData, globalFees, a);
    }

    /**
     * @dev Returns a fee preview for the supplied transfer; implemented in-line so that view function access is gas-free (internal contract view calls aren't free)
     * @param a TransferLib.TransferArgs arguments
     * @return Exchange fees at index 0, batch originator fees at subsequent indexes
     */
    uint256 constant MAX_BATCHES_PREVIEW = 4; // library constants not accessible in contract; must duplicate TransferLib value
    function transfer_feePreview(TransferLib.TransferArgs calldata a)
    external view onlyOwner() returns (TransferLib.FeesCalc[1 + MAX_BATCHES_PREVIEW * 2] memory feesAll) {
        return TransferLib.transfer_feePreview(ledgerData, globalFees, owner, a);
    }

    /**
     * @dev Returns the total global currency amount transfered for the supplied currency
     */
    function getCcy_totalTransfered(uint256 ccyTypeId)
    external view onlyOwner() returns (uint256) {
        return ledgerData._ccyType_totalTransfered[ccyTypeId];
    }

    /**
     * @dev Returns the total global quantity of carbon transfered
     */
    function getSecToken_totalTransfered()
    external view onlyOwner() returns (uint256) {
        return ledgerData._tokens_total.transferedQty;
    }
}
