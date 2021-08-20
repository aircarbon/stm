// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9
// Certik (AD): locked compiler version
pragma solidity 0.8.5;

import "./StErc20.sol";
import "./StPayable.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/TransferLib.sol";
import "../Libs/Erc20Lib.sol";
import "../Libs/LedgerLib.sol";

abstract // solc 0.6

 /**
  * @title Transferable Security Tokens
  * @author Dominic Morris (7-of-9)
  * @notice transfer or trade of security tokens
  * <pre>   - inherits Owned ownership smart contract</pre>
  * <pre>   - inherits StLedger security token ledger contract</pre>
  * <pre>   - inherits StFees fees contract</pre>
  * <pre>   - inherits StErc20 erc20 token contract</pre>
  * <pre>   - inherits StPayable payable token contract</pre>
  * <pre>   - uses StructLib interface library</pre>
  * <pre>   - uses LedgerLib runtime library</pre>
  * <pre>   - uses TransferLib runtime library</pre>
  * <pre>   - uses Erc20Lib runtime library</pre>
  */
  
contract StTransferable is Owned,
    StErc20, StPayable {

    /**
     * @dev returns the hashcode of the ledger
     * @param mod modulus operand for modulus operation on ledger index
     * @param n base integer modulus operation validation
     * @return ledgerHashcode
     * @param ledgerHashcode returns the hashcode of the ledger
     */
     
    function getLedgerHashcode(uint mod, uint n) external view returns (bytes32 ledgerHashcode) {
        return LedgerLib.getLedgerHashcode(ld, std, ctd, erc20d, /*cashflowData,*/ globalFees, mod, n);
    }

    /**
     * @dev transfer or trade operation on security tokens
     * @param transferArgs transfer or trade arguments<br/>
     * ledger_A<br/>
     * ledger_B<br/>
     * qty_A : ST quantity moving from A (excluding fees, if any)<br/>
     * k_stIds_A : if len>0: the constant/specified ST IDs to transfer (must correlate with qty_A, if supplied)<br/>
     * tokTypeId_A : ST type moving from A<br/>
     * qty_B : ST quantity moving from B (excluding fees, if any)<br/>
     * k_stIds_B : if len>0: the constant/specified ST IDs to transfer (must correlate with qty_B, if supplied)<br/>
     * tokTypeId_B : ST type moving from B<br/>
     * ccy_amount_A : currency amount moving from A (excluding fees, if any)<br/>
     * ccyTypeId_A : currency type moving from A<br/>
     * ccy_amount_B : currency amount moving from B (excluding fees, if any)<br/>
     * ccyTypeId_B : currency type moving from B<br/>
     * applyFees : apply global fee structure to the transfer (both legs)<br/>
     * feeAddrOwner : account address of fee owner
     */
     
    function transferOrTrade(StructLib.TransferArgs memory transferArgs)
    public onlyCustodian() onlyWhenReadWrite() {
        // abort if sending tokens from a non-whitelist account
        require(!(transferArgs.qty_A > 0 && !erc20d._whitelisted[transferArgs.ledger_A]), "Not whitelisted (A)"); 
        require(!(transferArgs.qty_B > 0 && !erc20d._whitelisted[transferArgs.ledger_B]), "Not whitelisted (B)");

        transferArgs.feeAddrOwner = deploymentOwner;
        TransferLib.transferOrTrade(ld, std, ctd, globalFees, transferArgs);
    }

    // FAST - fee preview exchange fee only
    /**
     * @dev returns fee preview - exchange fee only
     * @param transferArgs transfer args same as transferOrTrade
     * @return feesAll
     * @param feesAll returns fees calculation for the exchange
     */
    function transfer_feePreview_ExchangeOnly(StructLib.TransferArgs calldata transferArgs)
    external view returns (StructLib.FeesCalc[1] memory feesAll) {
        return TransferLib.transfer_feePreview_ExchangeOnly(ld, globalFees, deploymentOwner, transferArgs);
    }

    // SLOW - fee preview, with batch originator token fees (full, slow) - old/deprecate
    // 24k -- REMOVE NEXT...
    uint256 constant MAX_BATCHES_PREVIEW = 128; // library constants not accessible in contract; must duplicate TransferLib value
    
    /**
     * @dev returns all fee preview (old / deprecated)
     * @param transferArgs transfer args same as transferOrTrade
     * @return feesAll
     * @param feesAll returns fees calculation for the exchange
     */
    function transfer_feePreview(StructLib.TransferArgs calldata transferArgs)
    external view returns (StructLib.FeesCalc[1 + MAX_BATCHES_PREVIEW * 2] memory feesAll) {
        return TransferLib.transfer_feePreview(ld, std, globalFees, deploymentOwner, transferArgs);
    }

    // 24k
    // function getCcy_totalTransfered(uint256 ccyTypeId)
    // external view returns (uint256) {
    //     return ld._ccyType_totalTransfered[ccyTypeId];
    // }
    // function getSecToken_totalTransferedQty()
    // external view returns (uint256) {
    //     return ld._spot_total.transferedQty;
    // }
}
