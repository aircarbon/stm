pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/StructLib.sol";
import "../Libs/CcyLib.sol";

contract CcyWithdrawable is Owned, StLedger {
    //event CcyWithdrewLedger(uint256 ccyTypeId, address ledgerOwner, int256 amount);

    /**
     * @dev Withdraws currency from a ledger entry
     * @param ccyTypeId Currency type ID
     * @param amount Amount of the currency to withdraw, in currency base units
     * @param ledgerOwner Withdrawing ledger owner
     */
    function withdraw(uint256 ccyTypeId,
                      int256  amount, // signed value: ledger ccyType_balance supports (theoretical) -ve balances
                      address ledgerOwner)
    public onlyOwner() onlyWhenReadWrite() {

        CcyLib.withdraw(ledgerData, ccyTypesData, ccyTypeId, amount, ledgerOwner);

        // require(ccyTypeId >= 1 && ccyTypeId <= ccyTypesData._count_ccyTypes, "Bad ccyTypeId");
        // require(amount > 0, "Min. amount 1"); // disallow negative withdrawing
        // require(ledgerData._ledger[ledgerOwner].exists == true, "Bad ledgerOwner");
        // require(ledgerData._ledger[ledgerOwner].ccyType_balance[ccyTypeId] >= amount, "Insufficient balance");

        // // update ledger balance
        // ledgerData._ledger[ledgerOwner].ccyType_balance[ccyTypeId] -= amount;

        // // update global total withdrawn
        // ledgerData._ccyType_totalWithdrawn[ccyTypeId] += uint256(amount);

        // emit CcyWithdrewLedger(ccyTypeId, ledgerOwner, amount);
    }

    /**
     * @dev Returns the total global amount withdrawn for the supplied currency
     */
    function getTotalCcyWithdrawn(uint256 ccyTypeId)
    external view onlyOwner() returns (uint256) {
        return ledgerData._ccyType_totalWithdrawn[ccyTypeId];
    }
}