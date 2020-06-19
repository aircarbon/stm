// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.4.21 <=0.6.10;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/TokenLib.sol";

contract StBurnable is Owned, StLedger {

    function burnTokens(
        address          ledgerOwner,
        uint256          tokTypeId,   // tokTypeId AND (
        int256           burnQty,     //   burnQty
        uint256[] memory stIds        //   OR stIds)
    )
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.burnTokens(ld, std, ledgerOwner, tokTypeId, burnQty, stIds);
    }

    // 24k
    function getSecToken_totalBurnedQty()
    external view returns (uint256 count) { return ld._spot_totalBurnedQty; }
}
