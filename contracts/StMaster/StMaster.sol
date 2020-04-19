pragma solidity >=0.4.21 <=0.6.6;
pragma experimental ABIEncoderV2;

//import "../Interfaces/IStMaster.sol";
//import "../Interfaces/IPublicViews.sol";

import "./CcyCollateralizable.sol";
import "./StMintable.sol";
import "./StBurnable.sol";
import "./StTransferable.sol";
import "./StErc20.sol";
import "./StPayable.sol";
import "./DataLoadable.sol";
import "./StFutures.sol";

import "../Interfaces/StructLib.sol";

//
// truffle deploy using "infinite" gas?
// bytecode limit (24576): https://github.com/trufflesuite/ganache/issues/960
//
//  truffle compile --reset --all && grep \"bytecode\" build/contracts/* | awk '{print $1 " " length($3)/2}'
//
// 27321: ganache: ok / ropsten: ok / rinkeby: ok [no dataloadable, no futures]
// 30508: ganache: ## ... [no futures]
// 27741: ganache: ## / ropsten ## [no ctor setup, no futures]
// 22123: ... [upgrade sol 0.6.6: removed ctor setup, removed WL deprecated, removed payable unused]


contract StMaster
    is //IStMaster, IPublicViews,
    StMintable, StBurnable, Collateralizable, StTransferable, DataLoadable, StFutures
{
    // === STM (AC COMMODITY) ===
    // TODO: SafeMath
    // TODO: ERC20 authorize + re-entrancy guards, and .call instead of .transfer
    // todo: drop fee_fixed completely (it's == fee_min)
    // todo: etherscan -> verify contract interfaces? -- needs ctor bytecode
    // todo: change internalTransfer so it can operate on *any* stTypeId

    // (others)
    // todo: SCP - show totalSupply() for erc20's
    // todo: SCP - use decimals fields for erc20 (send/exchange text fields, or at least round to .decimals before passing to API)

    // contract properties
    string public name;

    function getContractType() external view returns(StructLib.ContractType) { return ld.contractType; }
    function getContractSeal() external view returns (bool) { return ld._contractSealed; }
    function sealContract() external { ld._contractSealed = true; }

    string contractVersion;
    string contractUnit; // the smallest (integer, non-divisible) security token unit, e.g. "TONS"
    function version() external view returns (string memory) { return contractVersion; }
    function unit() external view returns (string memory) { return contractUnit; }

    // events -- (hack: see: https://ethereum.stackexchange.com/questions/11137/watching-events-defined-in-libraries)
    // need to be defined (duplicated) here - web3 can't see event signatures in libraries
    // CcyLib events
    event AddedCcyType(uint256 id, string name, string unit);
    event CcyFundedLedger(uint256 ccyTypeId, address indexed to, int256 amount);
    event CcyWithdrewLedger(uint256 ccyTypeId, address indexed from, int256 amount);
    // TokenLib events
    event AddedSecTokenType(uint256 id, string name, StructLib.SettlementType settlementType, uint64 expiryTimestamp, uint256 underlyerTypeId, uint256 refCcyId, uint16 initMarginBips, uint16 varMarginBips);
    event SetFutureVariationMargin(uint256 tokenTypeId, uint16 varMarginBips);
    event SetFutureFeePerContract(uint256 tokenTypeId, uint256 feePerContract);
    event Burned(uint256 tokenTypeId, address indexed from, uint256 burnedQty);
    event BurnedFullSecToken(uint256 indexed stId, uint256 tokenTypeId, address indexed from, uint256 burnedQty);
    event BurnedPartialSecToken(uint256 indexed stId, uint256 tokenTypeId, address indexed from, uint256 burnedQty);
    event Minted(uint256 indexed batchId, uint256 tokenTypeId, address indexed to, uint256 mintQty, uint256 mintSecTokenCount);
    event MintedSecToken(uint256 indexed stId, uint256 indexed batchId, uint256 tokenTypeId, address indexed to, uint256 mintedQty);
    event AddedBatchMetadata(uint256 indexed batchId, string key, string value);
    event SetBatchOriginatorFee_Token(uint256 indexed batchId, StructLib.SetFeeArgs originatorFee);
    event SetBatchOriginatorFee_Currency(uint256 indexed batchId, uint16 origCcyFee_percBips_ExFee);
    // TransferLib events
    event TransferedFullSecToken(address indexed from, address indexed to, uint256 indexed stId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    event TransferedPartialSecToken(address indexed from, address indexed to, uint256 indexed splitFromSecTokenId, uint256 newSecTokenId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    event TradedCcyTok(uint256 ccyTypeId, uint256 ccyAmount, uint256 tokTypeId, address indexed /*tokens*/from, address indexed /*tokens*/to, uint256 tokQty);
    // StructLib events
    enum TransferType { User, ExchangeFee, OriginatorFee, TakePay, TakePayFee }
    event TransferedLedgerCcy(address indexed from, address indexed to, uint256 ccyTypeId, uint256 amount, TransferType transferType);
    event ReervedLedgerCcy(address indexed ledgerOwner, uint256 ccyTypeId, uint256 amount);
    // SpotFeeLib events
    event SetFeeTokFix(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_tokenQty_Fixed);
    event SetFeeCcyFix(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Fixed);
    event SetFeeTokBps(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_token_PercBips);
    event SetFeeCcyBps(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_PercBips);
    event SetFeeTokMin(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_token_Min);
    event SetFeeCcyMin(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Min);
    event SetFeeTokMax(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_token_Max);
    event SetFeeCcyMax(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Max);
    event SetFeeCcyPerMillion(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_perMillion);
    // Erc20Lib events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    // PayableLib events
    event IssuanceSubscribed(address indexed subscriber, address indexed issuer, uint256 weiSent, uint256 weiChange, uint256 tokensSubscribed, uint256 weiPrice);
    // FuturesLib events
    event FutureOpenInterest(address indexed long, address indexed short, /*uint256 shortStId,*/ uint256 tokTypeId, uint256 qty, uint256 price);
    event SetInitialMargin(uint256 tokenTypeId, address indexed ledgerOwner, uint16 initMarginBips);
    event TakePay(address indexed from, address indexed to, uint256 delta, uint256 done, address indexed feeTo, uint256 otmFee, uint256 itmFee, uint256 feeCcyId);

    constructor(
        StructLib.ContractType        _contractType,
        //StructLib.CashflowArgs memory _cashflowArgs,
        string memory                 _contractName,
        string memory                 _contractVer,
        string memory                 _contractUnit,
        string memory                 _contractSymbol,
        uint8                         _contractDecimals
        //address                       _chainlinkAggregator_btcUsd,
        //address                       _chainlinkAggregator_ethUsd
    ) StErc20(_contractSymbol, _contractDecimals)
    public {
        // chainlinkAggregator_btcUsd = _chainlinkAggregator_btcUsd;
        // chainlinkAggregator_ethUsd = _chainlinkAggregator_ethUsd;
        // cashflowData.args = _cashflowArgs;

        // set common properties
        name = _contractName;
        contractVersion = _contractVer;
        contractUnit = _contractUnit;

        // contract type
        ld.contractType = _contractType;

        // 24k bytecode limit - can be setup manually post-deployment

        // set token & ccy types
    //     if (_contractType == StructLib.ContractType.COMMODITY) {
    //         std._tt_Name[1] = 'AirCarbon CORSIA Token';     std._tt_Settle[1] = StructLib.SettlementType.SPOT;
    //         std._tt_Name[2] = 'AirCarbon Nature Token';     std._tt_Settle[2] = StructLib.SettlementType.SPOT;
    //         std._tt_Name[3] = 'AirCarbon Premium Token';    std._tt_Settle[3] = StructLib.SettlementType.SPOT;
    //         std._tt_Count = 3;
    //         ctd._ct_Ccy[1] = StructLib.Ccy({ id: 1, name: 'USD', unit: 'cents',      decimals: 2 });
    //         ctd._ct_Ccy[2] = StructLib.Ccy({ id: 2, name: 'ETH', unit: 'Wei',        decimals: 18 });
    //         ctd._ct_Ccy[3] = StructLib.Ccy({ id: 3, name: 'BTC', unit: 'Satoshi',    decimals: 8 });
    //       //ctd._ct_Ccy[4] = StructLib.Ccy({ id: 4, name: 'SGD', unit: 'cents',      decimals: 2 });
    //       //ctd._ct_Ccy[5] = StructLib.Ccy({ id: 5, name: 'EUR', unit: 'euro cents', decimals: 2 });
    //       //ctd._ct_Ccy[6] = StructLib.Ccy({ id: 6, name: 'HKD', unit: 'cents',      decimals: 2 });
    //       //ctd._ct_Ccy[7] = StructLib.Ccy({ id: 7, name: 'GBP', unit: 'pence',      decimals: 2 });
    //         ctd._ct_Count = 3;

    //         // set default ccy fee USD: $3/1000 mirrored
    //         StructLib.SetFeeArgs memory feeArgsGlobalUsd = StructLib.SetFeeArgs({
    //                fee_fixed: 0,
    //             fee_percBips: 0,
    //                  fee_min: 300,      // min $3.00
    //                  fee_max: 0,
    //           ccy_perMillion: 300,      // $3.00 per Million tokens received
    //            ccy_mirrorFee: true      // mirrored - token sender pays, too
    //         });
    //         SpotFeeLib.setFee_CcyType(ld, ctd, globalFees,
    //             1,            // USD
    //             address(0x0), // global fee
    //             feeArgsGlobalUsd
    //         );
    //     }
    //     else if (_contractType == StructLib.ContractType.CASHFLOW) {
    //         std._tt_Name[1] = 'UNI_TOKEN'; //contractName;
    //         std._tt_Count = 1;
    //         ctd._ct_Ccy[1] = StructLib.Ccy({ id: 1, name: 'ETH', unit: 'Wei',        decimals: 18 });
    //         ctd._ct_Count = 1;
    //     }
    //     else revert('Bad contract type');

    //     // create ledger entry for contract owner - transfer fees are paid to this ledger entry
    //     ld._ledger[owner] = StructLib.Ledger({
    //              exists: true,
    //     spot_customFees: StructLib.FeeStruct(),
    //   spot_sumQtyMinted: 0,
    //   spot_sumQtyBurned: 0
    //     });
    //     ld._ledgerOwners.push(owner);
    }

    // todo: for updateable libs - proxy dispatcher
    // https://blog.openzeppelin.com/proxy-libraries-in-solidity-79fbe4b970fd/
    // test lib...
    /*mapping(uint256 => St2x.SecTokenBatch) __batches;
    function call_st2() external returns (uint256) {
        //St2Interface st2 = St2Interface(addr_st2);

        //return St2x.name2();

        //St2x st2 = St2x(addr_st2);
        //st2.set_batch_id1(__batches);

        St2x.set_batch_id1(__batches);
        return __batches[42].tokenTypeId;

        // ## visibility problem...
        //st2.set_batch_id1(__batches);
        //st2.test(42);

        // ## __batches: "this type cannot be encoded" -- so still no way of passing in a mapping...
        //
        // this looks like the answer: https://ethereum.stackexchange.com/questions/6755/how-to-access-a-mapping-in-a-library
        // simplyify, repro just that struct { mapping (int,int) } call ....
        //
        //addr_st2.delegatecall(abi.encodePacked(bytes4(keccak256("set_batch_id1(mapping(uint256 => St2Interface.SecTokenBatch))")), __batches));

        //return st2.name2();
    }*/
}
