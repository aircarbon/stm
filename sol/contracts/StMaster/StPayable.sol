// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9
// Certik (AD): locked compiler version
pragma solidity 0.8.5;

import "./StFees.sol";
import "./StErc20.sol";

import "../Libs/LedgerLib.sol";
import "../Interfaces/StructLib.sol";
import "../Interfaces/ReentrancyGuard.sol";
import "../Libs/PayableLib.sol";

abstract // solc 0.6

 /**
  * @title Payable Security Tokens
  * @author Ankur Daharwal (ankurdaharwal) and Dominic Morris (7-of-9)
  * @notice all security token payable operations including token purchasing and issuer payments
  * <pre>   - inherits StFees fee contract</pre>
  * <pre>   - inherits StErc20 token contract</pre>
  * <pre>   - uses StructLib interface library</pre>
  * <pre>   - uses LedgerLib runtime library</pre>
  * <pre>   - uses PayableLib runtime library</pre>
  */

contract StPayable is
    StErc20, ReentrancyGuard {
        
    // === CFT - Cashflow Types === V1/MVP DONE ** =>>> CFT SPLIT LEDGER (decentralized token balances w/ central WL, collateral balances, and centralized spot transferOrTrade entry point...)
    //
    //  Cashflow type is fundamentally way less fungible than Commodity type, i.e. loanA != loanB, equityA != equityB, etc.
    //  Only way to preserve ERC20 semanitcs for CFTs, is for each CFT to have its own contract address;
    //    (i.e. we can't use token-types (or batch metadata) to separate different CFTs in a single contract ledger)
    //
    //          (1) CASHFLOW_CONTROLLER: new contract type
    //                  (a) its n tokTypes wrap n CASHFLOW-type contracts
    //                  (b) so addSecTokType() for CFT-C needs to take the address of a deployed CFT contract...
    //
    //          (2) CASHFLOW_CONTROLLER: is entry point for the split ledger - all clients talk only to it
    //                  > mint: DONE (passthrough to base)
    //                  > getSecToken: DONE (passthrough to bases)
    //                  > getLedgerEntry: DONE (return (a) n ccy's from CFT-C ... UNION ... (b) n tok's from n CFT's)
    //                  > burn: DONE (passthrough to base)
    //                  > DONE: transferOrTrade: update 1 ccy in CFT-C ... update 1 tok in CFT
    //                  > DONE: transfer_feePreview[_ExchangeOnly] ... >> combine/merge base output (orig tok fees w/ ccy fees...)
    //                  > DONE: ledgerhashcode (delegations to base)
    //
    //          (3) CASHFLOW_CONTROLLER === (interface compatible) with COMMODITY (base) EXCEPT:
    //                  > can only add indirect (CASHFLOW_BASE) types
    //                  > only 1 mint action per sec-type (i.e. mint is passed through to the unitoken model on CASHFLOW_BASE)
    //                  > no ERC20 support (not fungible, meaningless) -- ERC20 works only on CASHFLOW_BASE
    //
    // === CFT ====>>> V2...
    //  >>> TODO: PoC data load/compare JS tests for CFT-C and CFT-B...
    //      TODO: pri2 - PI: softcap/escrow/timelimits, etc...
    //      TODO: pri2 - PI: issuance fee on subscriptions..
    //      done/v1: pri1 - issuerPayments (EQ)   v0.1 -- MVP (any amount ok, no validations) -- test pack: changing issuancePrice mid-issuance
    //      done/v1: pri1 - issuerPayments (BOND) v0.1 -- MVP basic (no validations, i.e. eq-path only / simple term-structure table -- revisit loan/interest etc. later)

//#if process.env.CONTRACT_TYPE === 'CASHFLOW_BASE'
//#     StructLib.CashflowStruct cashflowData;
//# //#
//#     /**
//#      * @dev returns cashflow data for a cashflow token (base)
//#      * @return cashFlowData
//#      * @param cashFlowData returns cashflow data for a cashflow token (base)
//#      */
//#     function getCashflowData() public view returns(StructLib.CashflowStruct memory cashFlowData) {
//#         return PayableLib.getCashflowData(ld, cashflowData);
//#     }
//# 
//#     StructLib.IssuerPaymentBatchStruct ipbd; // current issuer payment batch
//# 
//#     /**
//#      * @dev returns current issuer payment batch for cashflow token (base)
//#      * @return issuerPaymentBatch
//#      * @param issuerPaymentBatch returns current issuer payment batch for cashflow token (base)
//#      */
//#     function getIssuerPaymentBatch() public view returns(StructLib.IssuerPaymentBatchStruct memory issuerPaymentBatch) {
//#         return PayableLib.getIssuerPaymentBatch(ipbd);
//#     }
//#     
//#     //address public chainlinkAggregator_btcUsd;
//#     address public chainlinkAggregator_ethUsd;
//#     address public chainlinkAggregator_bnbUsd;
//# 
//#     // function get_btcUsd() public view returns(int256) {
//#     //     if (chainlinkAggregator_btcUsd == address(0x0)) return -1;
//#     //     IChainlinkAggregator ref = IChainlinkAggregator(chainlinkAggregator_btcUsd);
//#     //     return ref.latestAnswer();
//#     // }
//# 
//#     /**
//#      * @dev returns chainlink ETH price in USD
//#      * @return ethPriceInUSD
//#      * @param ethPriceInUSD returns chainlink ETH price in USD
//#      */
//#     function get_ethUsd() public view returns(int256 ethPriceInUSD) {
//#         if (chainlinkAggregator_ethUsd == address(0x0)) return -1;
//#         return PayableLib.get_chainlinkRefPrice(chainlinkAggregator_ethUsd);
//#     }
//# 
//#     /**
//#      * @dev returns chainlink BNB price in USD
//#      * @return bnbPriceInUSD
//#      * @param bnbPriceInUSD returns chainlink BNB price in USD
//#      */
//#     function get_bnbUsd() public view returns(int256 bnbPriceInUSD) {
//#         if (chainlinkAggregator_bnbUsd == address(0x0)) return -1;
//#         return PayableLib.get_chainlinkRefPrice(chainlinkAggregator_bnbUsd);
//#     }
//# 
//#     //function() external  payable  onlyWhenReadWrite() {
//#     
//#     /**
//#      * @dev token subscriptions in USD, ETH or BNB for cashflow token (base)
//#      */
//#     receive() external payable nonReentrant() onlyWhenReadWrite() {
//#         PayableLib.pay(ld, std, ctd, cashflowData, globalFees, deploymentOwner, get_ethUsd(), get_bnbUsd());
//#     }
//#     
//#     //function() external  payable  onlyWhenReadWrite() {
//#     /**
//#      * @dev issuer payments in ETH or BNB for cashflow token (base)
//#      * @param count next token holders from ledger to be paid in the payment batch
//#      */
//#     function receiveIssuerPaymentBatch(uint32 count) external payable nonReentrant() onlyWhenReadWrite() {
//#         PayableLib.issuerPay(count, ipbd, ld, cashflowData);
//#     }
//# 
//#     /**
//#      * @dev set issuance values (only issuer)
//#      * @param wei_currentPrice set token price in wei
//#      * @param cents_currentPrice set token price in cents
//#      * @param qty_saleAllocation set max token sale allocation amount
//#      */
//#     function setIssuerValues(
//#         // address issuer,
//#         // StructLib.SetFeeArgs memory originatorFee,
//#         uint256 wei_currentPrice,
//#         uint256 cents_currentPrice,
//#         uint256 qty_saleAllocation
//#     ) external onlyWhenReadWrite() {
//#         PayableLib.setIssuerValues(
//#             ld,
//#             cashflowData,
//#             wei_currentPrice,
//#             cents_currentPrice,
//#             qty_saleAllocation,
//#             deploymentOwner
//#         );
//#     }
//#endif
}
