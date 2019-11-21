pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./Owned.sol";
import "./StLedger.sol";
import "./StFees.sol";

import "../Libs/StructLib.sol";
import "../Libs/TransferLib.sol";

contract StTransferable is Owned, StLedger, StFees {
    /**
     * @dev Transfers or trades assets between ledger accounts
     * @dev allows: one-sided transfers, transfers of same asset types, and transfers (trades) of different asset types
     * @dev disallows: movement from a single origin of more than one asset-type
     * @dev optionally applies: fees per the current fee structure, and paying them to contract owner's ledger entry
     */
    function transfer(TransferLib.TransferArgs memory a) public {

        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");

        TransferLib.transfer(ledgerData, feeData, a, owner);
    }
    
    /**
     * @dev Returns the total global currency amount transfered for the supplied currency
     */
    function getCcy_totalTransfered(uint256 ccyTypeId) external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return ledgerData._ccyType_totalTransfered[ccyTypeId];
    }

    /**
     * @dev Returns the total global tonnage of carbon transfered
     */
    function getSecToken_totalTransfered() external view returns (uint256) {
        require(msg.sender == owner, "Restricted method");
        return ledgerData._tokens_totalTransferedQty;
    }
}
