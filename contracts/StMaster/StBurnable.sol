pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

contract StBurnable is Owned, StLedger {
    event BurnedFullSecToken(uint256 stId, uint256 tokenTypeId, address ledgerOwner, uint256 burnedQty);
    event BurnedPartialSecToken(uint256 stId, uint256 tokenTypeId, address ledgerOwner, uint256 burnedQty);

    /**
     * @dev Burns contact base token units by resizing STs, and/or removing STs from the ledger
     * @dev Removes STs (or fractions of) from the main list and from the ledger, resizing as necessary
     * @dev Specified ledger owner must hold the specified quantity of contract base token units in aggregate across ledger STs, of the supplied type
     * @param ledgerOwner Ledger owner to burn
     * @param tokenTypeId ST type to burn
     * @param burnQty Quantity of contact base token units to burn
     */
    function burnTokens(address ledgerOwner, uint256 tokenTypeId, int256 burnQty) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(_ledger[ledgerOwner].exists == true, "Invalid ledger owner");
        require(burnQty >= 1, "Minimum burnQty one unit");
        require(tokenTypeId >= 0 && tokenTypeId < _count_tokenTypes, "Invalid ST type");

        // check ledger owner has sufficient carbon tonnage of supplied type
        require(sufficientTokens(ledgerOwner, tokenTypeId, uint256(burnQty), 0) == true, "Insufficient carbon held by ledger owner");
        // uint256 kgAvailable = 0;
        // for (uint i = 0; i < _ledger[ledgerOwner].tokenType_stIds[tokenTypeId].length; i++) {
        //     kgAvailable += _sts_currentQty[_ledger[ledgerOwner].tokenType_stIds[tokenTypeId][i]];
        // }
        // require(kgAvailable >= uint256(burnQty), "Insufficient carbon held by ledger owner");
        //require(_ledger[ledgerOwner].tokenType_sumQty[tokenTypeId] >= uint256(burnQty), "Insufficient carbon held by ledger owner");

        // burn (i.e. delete or resize) sufficient ST(s)
        uint256 ndx = 0;
        uint256 remainingToBurn = uint256(burnQty);
        while (remainingToBurn > 0) {
            uint256[] storage tokenType_stIds = _ledger[ledgerOwner].tokenType_stIds[tokenTypeId];
            uint256 stId = tokenType_stIds[ndx];
            uint256 stQty = _sts_currentQty[stId];
            uint256 batchId = _sts_batchId[stId];

            if (remainingToBurn >= stQty) {
                // burn the full ST
                _sts_currentQty[stId] = 0;

                // remove from ledger
                tokenType_stIds[ndx] = tokenType_stIds[tokenType_stIds.length - 1];
                tokenType_stIds.length--;
                //_ledger[ledgerOwner].tokenType_sumQty[tokenTypeId] -= stQty;

                // burn from batch
                _batches[batchId].burnedQty += stQty;

                remainingToBurn -= stQty;
                emit BurnedFullSecToken(stId, tokenTypeId, ledgerOwner, stQty);
            } else {
                // resize the ST (partial burn)
                _sts_currentQty[stId] -= remainingToBurn;

                // retain on ledger
                //_ledger[ledgerOwner].tokenType_sumQty[tokenTypeId] -= remainingToBurn;

                // burn from batch
                _batches[batchId].burnedQty += remainingToBurn;

                emit BurnedPartialSecToken(stId, tokenTypeId, ledgerOwner, remainingToBurn);
                remainingToBurn = 0;
            }
        }
        _tokens_totalBurnedQty += uint256(burnQty);
    }

    /**
     * @dev Returns the total global contract base unit quantities in all ST tokens burned, or partially burned
     */
    function getSecToken_totalBurnedQty() external view returns (uint256 count) {
        require(msg.sender == owner, "Restricted method");
        return _tokens_totalBurnedQty;
    }
}
