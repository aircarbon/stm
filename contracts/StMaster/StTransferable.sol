pragma solidity 0.5.13;
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
     * @param a TransferLib.TransferArgs arguments
     */
    function transfer(TransferLib.TransferArgs memory a) public {
        require(msg.sender == owner, "Restricted method");
        require(_readOnly == false, "Contract is read only");
        a.feeAddrOwner = owner;
        TransferLib.transfer(ledgerData, globalFees, a);//, owner);
    }

    /**
     * @dev Returns a fee preview for the supplied transfer; implemented in-line so that view function access is gas-free (internal contract view calls aren't free)
     * @param a TransferLib.TransferArgs arguments
     */
    uint256 constant MAX_BATCHES = 100; // library constants not accessible in contract; must duplicate TransferLib value
    function transfer_feePreview(
        TransferLib.TransferArgs calldata a
    )
    external view
    returns (TransferLib.FeesCalc[MAX_BATCHES] memory feesAll) {
        require(msg.sender == owner, "Restricted method");

         // exchange fees - calc total payable (fixed + basis points), cap & collar
        StructLib.FeeStruct storage exFeeStruct_ccy_A = ledgerData._ledger[a.ledger_A].customFees.ccyType_Set[a.ccyTypeId_A]   ? ledgerData._ledger[a.ledger_A].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_A = ledgerData._ledger[a.ledger_A].customFees.tokType_Set[a.tokenTypeId_A] ? ledgerData._ledger[a.ledger_A].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_ccy_B = ledgerData._ledger[a.ledger_B].customFees.ccyType_Set[a.ccyTypeId_B]   ? ledgerData._ledger[a.ledger_B].customFees : globalFees;
        StructLib.FeeStruct storage exFeeStruct_tok_B = ledgerData._ledger[a.ledger_B].customFees.tokType_Set[a.tokenTypeId_B] ? ledgerData._ledger[a.ledger_B].customFees : globalFees;

        TransferLib.FeesCalc memory exFees = TransferLib.FeesCalc({ // exchange fees
            fee_ccy_A: TransferLib.applyCapCollar(exFeeStruct_ccy_A.ccy, a.ccyTypeId_A, uint256(a.ccy_amount_A), TransferLib.calcFee(exFeeStruct_ccy_A.ccy, a.ccyTypeId_A, uint256(a.ccy_amount_A))),
            fee_ccy_B: TransferLib.applyCapCollar(exFeeStruct_ccy_B.ccy, a.ccyTypeId_B, uint256(a.ccy_amount_B), TransferLib.calcFee(exFeeStruct_ccy_B.ccy, a.ccyTypeId_B, uint256(a.ccy_amount_B))),
            fee_tok_A: TransferLib.applyCapCollar(exFeeStruct_tok_A.tok, a.tokenTypeId_A, a.qty_A,               TransferLib.calcFee(exFeeStruct_tok_A.tok, a.tokenTypeId_A, a.qty_A)),
            fee_tok_B: TransferLib.applyCapCollar(exFeeStruct_tok_B.tok, a.tokenTypeId_B, a.qty_B,               TransferLib.calcFee(exFeeStruct_tok_B.tok, a.tokenTypeId_B, a.qty_B)),
            fee_to: a.feeAddrOwner
        });
        feesAll[0] = exFees;
        //return exFees.fee_ccy_A + exFees.fee_ccy_B + exFees.fee_tok_A + exFees.fee_tok_B;
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
