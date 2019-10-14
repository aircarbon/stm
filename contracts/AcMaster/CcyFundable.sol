pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./AcLedger.sol";

contract CcyFundable is Owned, AcLedger {
    event CcyFundedLedger(uint256 ccyTypeId, address ledgerOwner, int256 amount);

    /**
     * @dev Funds a ledger entry with a currency amount
     * @param ccyTypeId Currency type ID
     * @param amount Amount of the currency to fund, in currency base units
     * @param ledgerOwner Ledger owner to fund
     */
    function fund(uint256 ccyTypeId, int256 amount, address ledgerOwner) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        require(ccyTypeId >= 0 && ccyTypeId < _count_ccyTypes, "Invalid currency type");
        require(amount >= 0, "Invalid amount"); // allow funding zero - initializes empty ledger entry

        // we keep amount as signed value - ledger allows -ve balances (currently unused capability)
        //uint256 fundAmount = uint256(amount);

        // create ledger entry as required
        if (_ledger[ledgerOwner].exists == false) {
            _ledger[ledgerOwner] = Ledger({
                  exists: true
            });
            _ledgerOwners.push(ledgerOwner);
        }

        // update ledger balance
        _ledger[ledgerOwner].ccyType_balance[ccyTypeId] += amount;

        // update global total funded
        _ccyType_totalFunded[ccyTypeId] += uint256(amount);

        emit CcyFundedLedger(ccyTypeId, ledgerOwner, amount);
    }

    /**
     * @dev Returns the total global amount funded for the supplied currency
     */
    function getTotalFunded(uint256 ccyTypeId) external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return _ccyType_totalFunded[ccyTypeId];
    }
}