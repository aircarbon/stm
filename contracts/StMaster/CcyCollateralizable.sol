// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity >=0.4.21 <=0.7.1;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/CcyLib.sol";

contract Collateralizable is
    Owned, StLedger {

    function addCcyType(string memory name, string memory unit, uint16 decimals)
    public onlyOwner() onlyWhenReadWrite() {
        CcyLib.addCcyType(ld, ctd, name, unit, decimals);
    }

    function getCcyTypes() external view returns (StructLib.GetCcyTypesReturn memory) {
        return CcyLib.getCcyTypes(ctd);
    }

    function fundOrWithdraw(
        StructLib.FundWithdrawType direction,
        uint256 ccyTypeId,
        int256  amount,
        address ledgerOwner,
        string  calldata desc)
    public onlyOwner() onlyWhenReadWrite() {
        CcyLib.fundOrWithdraw(ld, ctd, direction, ccyTypeId, amount, ledgerOwner, desc);
    }
    // function fund(uint256 ccyTypeId,
    //               int256  amount,
    //               address ledgerOwner)
    // public onlyOwner() onlyWhenReadWrite() {
    //     CcyLib.fund(ld, ctd, ccyTypeId, amount, ledgerOwner);
    // }
    // function withdraw(uint256 ccyTypeId,
    //                   int256  amount,
    //                   address ledgerOwner)
    // public onlyOwner() onlyWhenReadWrite() {
    //     CcyLib.withdraw(ld, ctd, ccyTypeId, amount, ledgerOwner);
    // }

    // 24k
    // function getTotalCcyFunded(uint256 ccyTypeId)
    // external view returns (uint256) {
    //     return ld._ccyType_totalFunded[ccyTypeId];
    // }
    // function getTotalCcyWithdrawn(uint256 ccyTypeId)
    // external view returns (uint256) {
    //     return ld._ccyType_totalWithdrawn[ccyTypeId];
    // }
}