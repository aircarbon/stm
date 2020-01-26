pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "./IOwned.sol";

import "../Libs/StructLib.sol";
import "../Libs/TransferLib.sol";
import "../Libs/Erc20Lib.sol";
import "../Libs/LedgerLib.sol";

/**
 * @notice Controls internal exchange (whitelisted) transfers & trades
 */
 contract IStTransferable is IOwned {

    /**
     * @notice Returns a keccak256 hash of all contract data
     * @dev Contract owner's ledger entry and its whitelist entry are excluded from the hash calculation; they are expected to change across contract upgrades
     */
    function getLedgerHashcode() external view returns (bytes32) { revert("Not implemented"); }

    /**
     * @notice Transfers or trades assets between ledger accounts
     * @dev Allows: one-sided transfers, transfers of same asset types, and transfers (trades) of different asset types
     * @dev Disallows: movement from a single origin of more than one asset-type
     * @dev Optionally applies: fees per the current fee structure, and paying them to contract owner's ledger entry
     * @param a TransferLib.TransferArgs arguments
     */
    function transferOrTrade(TransferLib.TransferArgs memory a)
    public onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }

    /**
     * @notice Returns a fee preview for the supplied transfer
     * @param a TransferLib.TransferArgs arguments
     * @return Exchange fees at index 0, batch originator fees at subsequent indexes
     */
    uint256 constant MAX_BATCHES_PREVIEW = 128; // library constants not accessible in contract; must duplicate TransferLib value
    function transfer_feePreview(TransferLib.TransferArgs calldata a)
    external view onlyOwner() returns (TransferLib.FeesCalc[1 + MAX_BATCHES_PREVIEW * 2] memory feesAll) { revert("Not implemented"); }

    /**
     * @notice Returns the total currency amount transfered, for the supplied currency type
     */
    function getCcy_totalTransfered(uint256 ccyTypeId)
    external view onlyOwner() returns (uint256) { revert("Not implemented"); }

    /**
     * @dev Returns the global quantity of tokens transfered, across all token types
     */
    function getSecToken_totalTransferedQty()
    external view onlyOwner() returns (uint256) { revert("Not implemented"); }
}
