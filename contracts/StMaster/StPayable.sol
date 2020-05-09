
pragma solidity >=0.4.21 <=0.6.6;
pragma experimental ABIEncoderV2;

//import "../Interfaces/IStPayable.sol";

import "./StFees.sol";
import "./StErc20.sol";

import "../Libs/LedgerLib.sol";
import "../Interfaces/StructLib.sol";
import "../Libs/PayableLib.sol";

//import "../Interfaces/IChainlinkAggregator.sol";

//
// 24k gas limit -- disabled for commodity branch...
//

abstract // solc 0.6
contract StPayable is
    //IStPayable,
    StErc20 {

    // === CFT === V0 ** =>>> MVP -- CFT CORE (*no whitelisting*, i.e. all external control ERC20 accounts, no collateral: aka private equity/ledger - no exchange)
    //      TODO: pri0 - issuerPayments (BOND) v0.1 -- basic (no validations, i.e. eq-path only?)
    //      TODO: pri0 - issuerPayments (EQ)   v0.1 -- test pack: changing issuancePrice mid-issuance

    // === CFT === V1 ** =>>> MVP -- CFT SPLIT LEDGER (central WL, central collateral, central spot transferOrTrade...)
    //      TODO: pri1 - ledger combine/abstract (centralised collateral)

    //      TODO: pri2 - PE: issuance fee on subscriptions
    //      TODO: pri3 - wallet auto-converts

    StructLib.CashflowStruct cashflowData;
    //address public chainlinkAggregator_btcUsd;
    address public chainlinkAggregator_ethUsd;

    function getCashflowData() public view returns(StructLib.CashflowStruct memory) {
        return PayableLib.getCashflowData(ld, cashflowData);
    }
    // function get_btcUsd() public view returns(int256) {
    //     if (chainlinkAggregator_btcUsd == address(0x0)) return 100000000; // $1 - cents*satoshis
    //     IChainlinkAggregator ref = IChainlinkAggregator(chainlinkAggregator_btcUsd);
    //     return ref.latestAnswer();
    // }
    function get_ethUsd() public view returns(int256) {
        return PayableLib.get_ethUsd(chainlinkAggregator_ethUsd);
        // if (chainlinkAggregator_ethUsd == address(0x0)) return 100000000; // $1 - cents*satoshis
        // IChainlinkAggregator ref = IChainlinkAggregator(chainlinkAggregator_ethUsd);
        // return ref.latestAnswer();
    }

    //function() external  payable  onlyWhenReadWrite() {
    receive() external payable onlyWhenReadWrite() {
        PayableLib.pay(ld, cashflowData, ctd, globalFees, owner, get_ethUsd());
    }

    function setIssuerValues(
        // address issuer,
        // StructLib.SetFeeArgs memory originatorFee,
        uint256 wei_currentPrice,
        uint256 cents_currentPrice,
        uint256 qty_saleAllocation
    ) external onlyWhenReadWrite() {
        PayableLib.setIssuerValues(
            ld,
            cashflowData,
            wei_currentPrice,
            cents_currentPrice,
            qty_saleAllocation
        );
    }
}
