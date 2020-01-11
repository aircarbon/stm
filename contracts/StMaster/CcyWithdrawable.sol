pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/StructLib.sol";
import "../Libs/CcyLib.sol";

contract CcyWithdrawable is Owned, StLedger {
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
    }

    /**
     * @dev Returns the total global amount withdrawn for the supplied currency
     */
    function getTotalCcyWithdrawn(uint256 ccyTypeId)
    external view onlyOwner() returns (uint256) {
        return ledgerData._ccyType_totalWithdrawn[ccyTypeId];
    }
}