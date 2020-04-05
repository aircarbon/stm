pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/ICcyCollateralizable.sol";

import "./Owned.sol";
import "./StLedger.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/CcyLib.sol";

contract Collateralizable is ICcyCollateralizable,
    Owned, StLedger {

    function addCcyType(string memory name, string memory unit, uint16 decimals)
    public onlyOwner() onlyWhenReadWrite() {
        CcyLib.addCcyType(ld, ctd, name, unit, decimals);
    }

    function getCcyTypes() external view returns (StructLib.GetCcyTypesReturn memory) {
        return CcyLib.getCcyTypes(ctd);
    }

    function fund(uint256 ccyTypeId,
                  int256  amount,
                  address ledgerOwner)
    public onlyOwner() onlyWhenReadWrite() {
        CcyLib.fund(ld, ctd, ccyTypeId, amount, ledgerOwner);
    }

    function getTotalCcyFunded(uint256 ccyTypeId)
    external view returns (uint256) {
        return ld._ccyType_totalFunded[ccyTypeId];
    }

    function withdraw(uint256 ccyTypeId,
                      int256  amount,
                      address ledgerOwner)
    public onlyOwner() onlyWhenReadWrite() {
        CcyLib.withdraw(ld, ctd, ccyTypeId, amount, ledgerOwner);
    }

    function getTotalCcyWithdrawn(uint256 ccyTypeId)
    external view returns (uint256) {
        return ld._ccyType_totalWithdrawn[ccyTypeId];
    }
}