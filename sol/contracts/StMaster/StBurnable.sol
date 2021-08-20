// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9
// Certik (AD): locked compiler version
pragma solidity 0.8.5;

import "./StLedger.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/TokenLib.sol";

 /**
  * @title Burnable Security Tokens
  * @author Dominic Morris (7-of-9)
  * @notice retirement of security tokens
  * <pre>   - inherits Owned ownership smart contract</pre>
  * <pre>   - inherits StLedger security token ledger contract</pre>
  * <pre>   - uses StructLib interface library</pre>
  * <pre>   - uses TokenLib runtime library</pre>
  */
abstract contract StBurnable is StLedger {

    /**
     * @dev burning of security tokens
     * @param ledgerOwner account address of the ledger owner of the security token batch
     * @param tokTypeId token type of the token batch
     * @param burnQty amount to be burned
     * @param stIds sum of supplied STs current qty must equal supplied burnQty
     */
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
    /**
     * @dev returns the security token total burned quantity
     * @return totalBurnedQty
     * @param totalBurnedQty returns the security token total burned quantity
     */
    function getSecToken_totalBurnedQty()
    external view returns (uint256 totalBurnedQty) { return ld._spot_totalBurnedQty; }
}
