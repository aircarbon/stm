pragma solidity >=0.4.21 <=0.6.6;
pragma experimental ABIEncoderV2;

//import "../Interfaces/IStBurnable.sol";

import "./Owned.sol";
import "./StLedger.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/TokenLib.sol";

contract StBurnable is Owned, StLedger {

    function burnTokens(
        address ledgerOwner,
        uint256 tokenTypeId,
        int256  burnQty)
    public onlyOwner() onlyWhenReadWrite() {
        TokenLib.burnTokens(ld, std, ledgerOwner, tokenTypeId, burnQty);
    }

    function getSecToken_totalBurnedQty()
    external view returns (uint256 count) {
        return ld._spot_totalBurnedQty;
    }
}
