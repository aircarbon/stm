pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./AcLedger.sol";

contract CcyWithdrawable is Owned, AcLedger {
    event CcyWithdrewLedger(uint256 ccyTypeId, address ledgerOwner, int256 amount);

    /**
     * @dev Withdraws currency from a ledger entry
     * @param ccyTypeId Currency type ID
     * @param amount Amount of the currency to withdraw, in currency base units
     * @param ledgerOwner Withdrawing ledger owner
     */
    function withdraw(uint256 ccyTypeId,
                      int256  amount, // signed value: ledger ccyType_balance supports (theoretical) -ve balances
                      address ledgerOwner)
    public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(ccyTypeId >= 0 && ccyTypeId < _count_ccyTypes, "Invalid currency type");
        require(amount > 0, "Minimum one currency unit required"); // disallow negative withdrawing
        require(_ledger[ledgerOwner].exists == true, "Invalid ledger owner");
        require(_ledger[ledgerOwner].ccyType_balance[ccyTypeId] >= amount, "Insufficient ledger owner balance");

        // update ledger balance
        _ledger[ledgerOwner].ccyType_balance[ccyTypeId] -= amount;

        // update global total withdrawn
        _ccyType_totalWithdrawn[ccyTypeId] += uint256(amount);

        emit CcyWithdrewLedger(ccyTypeId, ledgerOwner, amount);
    }

    /**
     * @dev Returns the total global amount withdrawn for the supplied currency
     */
    function getTotalCcyWithdrawn(uint256 ccyTypeId) external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return _ccyType_totalWithdrawn[ccyTypeId];
    }
}