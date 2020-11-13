
// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity >=0.4.21 <=0.7.1;
pragma experimental ABIEncoderV2;

import "./StFees.sol";
import "./StErc20.sol";

import "../Libs/LedgerLib.sol";
import "../Interfaces/StructLib.sol";
import "../Libs/PayableLib.sol";

abstract // solc 0.6
contract StPayable is
    StErc20 {
        
    // === CFT === V1 ** =>>> MVP -- CFT SPLIT LEDGER (central WL, central collateral, central spot transferOrTrade...)
    //  Cashflow type is fundamentally way less fungible than Commodity type, i.e. loan A != loan B
    //  Therefore, the only way to preserve ERC20 semanitcs for CFTs, is for each CFT *to have its own contract address*
    //    (i.e. we can't use token-types (or batch metadata) to separate different CFTs in a single contract ledger)
    //      TODO: pri0 - ledger combine/abstract (centralised collateral)
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
    //                  > TODO: transferOrTrade: update 1 ccy in CFT-C ... update 1 tok in CFT
    //                  > TODO: transfer_feePreview[_ExchangeOnly] ... >> combine/merge base output (orig tok fees w/ ccy fees...)
    //
    //                  > TODO: ledgerhashcode: ...???
    //
    //                  PROOF OF CONCEPT (READ AND WRITE ACROSS CONTRACTS...)
    //
    //          (3) CASHFLOW_CONTROLLER === (interface compatible) with COMMODITY (base) EXCEPT:
    //                  > can only add indirect (CASHFLOW_BASE) types
    //                  > only 1 mint action per sec-type (i.e. mint is passed through to the unitoken model on CASHFLOW_BASE)
    //                  > no ERC20 support (not fungible, meaningless) -- but ERC20 should work on CASHFLOW_BASE
    //
 
    // === CFT === V0 ** =>>> MVP -- CFT CORE (*no whitelisting*, i.e. all external control ERC20 accounts, no collateral: aka private equity/ledger - no exchange)
    //      TODO: pri1 - issuerPayments (EQ)   v0.1 -- MVP (any amount ok, no validations) -- test pack: changing issuancePrice mid-issuance
    //      TODO: pri1 - issuerPayments (BOND) v0.1 -- MVP basic (no validations, i.e. eq-path only -- revisit loan/interest etc. later)

    //      TODO: pri2 - PE: issuance fee on subscriptions
    //      TODO: pri3 - wallet auto-converts

//#if process.env.CONTRACT_TYPE === 'CASHFLOW_BASE'
//#     StructLib.CashflowStruct cashflowData;
//# 
//#     function getCashflowData() public view returns(StructLib.CashflowStruct memory) {
//#         return PayableLib.getCashflowData(ld, cashflowData);
//#     }
//#     
//#     //address public chainlinkAggregator_btcUsd;
//#     address public chainlinkAggregator_ethUsd;
//#     address public chainlinkAggregator_bnbUsd;
//# 
//#     // function get_btcUsd() public view returns(int256) {
//#     //     if (chainlinkAggregator_btcUsd == address(0x0)) return 100000000; // $1 - cents*satoshis
//#     //     IChainlinkAggregator ref = IChainlinkAggregator(chainlinkAggregator_btcUsd);
//#     //     return ref.latestAnswer();
//#     // }
//# 
//#     function get_ethUsd() public view returns(int256) {
//#         return PayableLib.get_chainlinkRefPrice(chainlinkAggregator_ethUsd);
//#     }
//#     function get_bnbUsd() public view returns(int256) {
//#         return PayableLib.get_chainlinkRefPrice(chainlinkAggregator_bnbUsd);
//#     }
//# 
//#     //function() external  payable  onlyWhenReadWrite() {
//#     receive() external payable onlyWhenReadWrite() {
//#         PayableLib.pay(ld, std, ctd, cashflowData, globalFees, owner, get_ethUsd(), get_usdEth(), get_bnbUsd());
//#     }
//# 
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
//#             owner
//#         );
//#     }
//#endif
}
