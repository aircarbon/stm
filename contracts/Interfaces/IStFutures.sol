pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "./IOwned.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/FuturesLib.sol";
import "../Libs/Erc20Lib.sol";
import "../Libs/LedgerLib.sol";

/**
 * @notice Controls internal exchange (whitelisted) futures positions
 */
 contract IStFutures is IOwned {

    /**
     * @notice Opens a new futures position (matching long and short quantities)
     * @dev Futures positions are recorded with full position management; tokens include entry price and last mark/settlement price
     * @dev Tokens created for futures positions are "auto minted" without any associated batch (unlike spot tokens) - i.e. ld._sts[ftId].batchId = 0
     * @dev Token IDs for the position pair are contiguous, short position token ID is always written first (lower ID)
     * @param a StructLib.FuturesPositionArgs arguments
     */
    function openFtPos(StructLib.FuturesPositionArgs memory a)
    public onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }

    /**
     * @notice Sets an initial margin override (of the future type's initial margin) for the supplied ledger address and future type
     * @param ledgerOwner The ledger address for which to set the initial margin override
     * @param tokTypeId The token type ID of the future on which to set the override - must have settlement type of FUTURE
     * @param initMarginBips The initial margin to set, in basis points - must be <= than 10000
     */
    function setInitMargin_TokType(uint256 tokTypeId, address ledgerOwner, uint16 initMarginBips)
    public onlyOwner() onlyWhenReadWrite() { revert("Not implemented"); }

    /**
     * @notice Performs futures settlement on a position-pair by taking from the OTM side and paying to the ITM side
     * @dev ITM pay amount is capped at the OTM physical cash balance
     * @param short_stId The security token ID of the short side of the position pair
     * @param markPrice The mark price to use for the settlement process
     */
    function takePay(uint256 tokTypeId, uint256 short_stId, int128 markPrice)
    public onlyOwner() { revert("Not implemented"); }

    /**
     * @notice Gets the initial margin override (of the future type's initial margin) for the supplied ledger address and future type, if defined
     * @param ledgerOwner The ledger address for which to get the initial margin override
     * @param tokTypeId The token type ID of the future on which to get the override - must have settlement type of FUTURE
     */
    function getInitMargin(uint256 tokTypeId, address ledgerOwner)
    external view returns (uint16) { revert("Not implemented"); }
}
