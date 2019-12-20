pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";

import "../Libs/StructLib.sol";
import "../Libs/CcyLib.sol";

contract CcyFundable is Owned, StLedger {
    /**
     * @dev Funds a ledger entry with a currency amount
     * @param ccyTypeId Currency type ID
     * @param amount Amount of the currency to fund, in currency base units
     * @param ledgerOwner Ledger owner to fund
     */
    function fund(uint256 ccyTypeId,
                  int256  amount, // signed value: ledger ccyType_balance supports (theoretical) -ve balances
                  address ledgerOwner)
    public onlyOwner() onlyWhenReadWrite() {

        CcyLib.fund(ledgerData, ccyTypesData, ccyTypeId, amount, ledgerOwner);
        // require(ccyTypeId >= 1 && ccyTypeId <= ccyTypesData._count_ccyTypes, "Bad ccyTypeId");
        // require(amount >= 0, "Invalid amount"); // allow funding zero (initializes empty ledger entry), disallow negative funding

        // // we keep amount as signed value - ledger allows -ve balances (currently unused capability)
        // //uint256 fundAmount = uint256(amount);

        // // create ledger entry as required
        // if (ledgerData._ledger[ledgerOwner].exists == false) {
        //     ledgerData._ledger[ledgerOwner] = StructLib.Ledger({
        //           exists: true
        //     });
        //     ledgerData._ledgerOwners.push(ledgerOwner);
        // }

        // // update ledger balance
        // ledgerData._ledger[ledgerOwner].ccyType_balance[ccyTypeId] += amount;

        // // update global total funded
        // ledgerData._ccyType_totalFunded[ccyTypeId] += uint256(amount);

        // emit CcyFundedLedger(ccyTypeId, ledgerOwner, amount);
    }

    /**
     * @dev Returns the total global amount funded for the supplied currency
     */
    function getTotalCcyFunded(uint256 ccyTypeId)
    external view onlyOwner() returns (uint256) {
        return ledgerData._ccyType_totalFunded[ccyTypeId];
    }
}