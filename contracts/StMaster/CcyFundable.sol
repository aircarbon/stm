pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/LedgerLib.sol";
import "../Libs/StructLib.sol";

contract CcyFundable is Owned, StLedger {
    event CcyFundedLedger(uint256 ccyTypeId, address ledgerOwner, int256 amount);

    /**
     * @dev Funds a ledger entry with a currency amount
     * @param ccyTypeId Currency type ID
     * @param amount Amount of the currency to fund, in currency base units
     * @param ledgerOwner Ledger owner to fund
     */
    function fund(uint256 ccyTypeId,
                  int256  amount, // signed value: ledger ccyType_balance supports (theoretical) -ve balances
                  address ledgerOwner)
    public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(ccyTypeId >= 0 && ccyTypeId < ccyTypesData._count_ccyTypes, "Invalid currency type");
        require(amount >= 0, "Invalid amount"); // allow funding zero (initializes empty ledger entry), disallow negative funding

        // we keep amount as signed value - ledger allows -ve balances (currently unused capability)
        //uint256 fundAmount = uint256(amount);

        // create ledger entry as required
        if (ledgerData._ledger[ledgerOwner].exists == false) {
            ledgerData._ledger[ledgerOwner] = StructLib.Ledger({
                  exists: true
            });
            ledgerData._ledgerOwners.push(ledgerOwner);
        }

        // update ledger balance
        ledgerData._ledger[ledgerOwner].ccyType_balance[ccyTypeId] += amount;

        // update global total funded
        ledgerData._ccyType_totalFunded[ccyTypeId] += uint256(amount);

        emit CcyFundedLedger(ccyTypeId, ledgerOwner, amount);
    }

    /**
     * @dev Returns the total global amount funded for the supplied currency
     */
    function getTotalCcyFunded(uint256 ccyTypeId) external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return ledgerData._ccyType_totalFunded[ccyTypeId];
    }
}