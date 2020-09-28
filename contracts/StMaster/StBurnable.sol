// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity >=0.4.21 <=0.7.1;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/TokenLib.sol";

contract StBurnable is Owned, StLedger {

    function burnTokens(
        address          ledgerOwner,
        uint256          tokTypeId,
        int256           burnQty,
        uint256[] memory stIds      // IFF supplied (len > 0): sum of supplied STs current qty must == supplied burnQty
    )
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.burnTokens(ld, std, TokenLib.BurnTokenArgs({
               ledgerOwner: ledgerOwner,
                 tokTypeId: tokTypeId,
                   burnQty: burnQty,
                   k_stIds: stIds
        }));
    }

    // 24k
    function getSecToken_totalBurnedQty()
    external view returns (uint256 count) { return ld._spot_totalBurnedQty; }
}
