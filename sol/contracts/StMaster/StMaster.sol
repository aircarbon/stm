// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity ^0.8.0;

import "./CcyCollateralizable.sol";
import "./StMintable.sol";
import "./StBurnable.sol";
import "./StTransferable.sol";
import "./StErc20.sol";
import "./StPayable.sol";
import "./DataLoadable.sol";
import "./StFutures.sol";

import "../Interfaces/StructLib.sol";

// https://diligence.consensys.net/blog/2019/09/how-to-prepare-for-a-smart-contract-audit/

/** truffle deploy using "infinite" gas?
 *  bytecode limit (24576): https://github.com/trufflesuite/ganache/issues/960
 *  https://github.com/ethereum/EIPs/issues/1662
 */

/** 
 * node process_sol_js && truffle compile --reset --all && grep \"bytecode\" build/contracts/* | awk '{print $1 " " length($3)/2}'
 *  22123: ... [upgrade sol 0.6.6: removed ctor setup, removed WL deprecated, removed payable unused]
 *  23576: ... FTs v0 (paused) - baseline
 *  22830: ... [removed all global counters, except total minted & burned]
 *  22911: ... [removed isWL and getWLCount]
 *  24003: ... [restored cashflowArgs; optimizer runs down to 10]
 *  24380: ... [added stIds[] to burn & transferArgs; optimizer runs down to 1]
 *  24560: ... [split ledger - wip; at limit]
 *  24241: ... [refactor/remove SecTokenReturn in favour of LedgerSecTokenReturn]
 *  24478: ... [+ _tokens_base_id, getSecToken_BaseId()]
 *  23275: ... [+ _owners[], getOwners] 
 */

 // FIXME: 24kb limit exceeded after custody flag addition

 /**
  * @title Security Token Master
  * @author Dominic Morris (7-of-9) and Ankur Daharwal (ankurdaharwal)
  * @notice STMaster is configured at the deployment time to one of:<br/>
  * <pre>   - commodity token (CT): a semi-fungible (multi-batch), multi-type & single-version commodity underlying; or</pre>
  * <pre>   - cashflow token (CFT): a fully-fungible, multi-type & multi-version (recursive/linked contract deployments) cashflow-generating underlyings.</pre>
  * <pre>   - cashflow controller (CFC): singleton cashflow token governance contract; keeps track of global ledger and states across n CFTs</pre>
  * It is an EVM-compatible set of smart contracts written in Solidity, comprising:<br/><br/>
  * <pre>   (a) asset-backed, multi token/collateral-type atomic spot cash collateral trading & on-chain settlement;</pre>
  * <pre>   (b) scalable, semi-fungible & metadata-backed extendible type-system;</pre>
  * <pre>   (c) upgradable contracts: cryptographic checksumming of v+0 and v+1 contract data fields;</pre>
  * <pre>   (d) full ERC20 implementation (inc. transferFrom, allowance, approve) for self-custody;</pre>
  * <pre>   (e) multiple reserved contract owner/operator addresses, for concurrent parallel/batched operations via independent account-nonce sequencing;</pre>
  * <pre>   (f) split ledger: hybrid permission semantics - owner-controller ("whitelisted") addresses for centralised spot trade execution,<br/>
  *       alongside third-party controlled ("graylisted") addresses for self-custody;</pre>
  * <pre>   (g) generic metadata batch minting via extendible (append-only, immutable) KVP collection;</pre>
  * <pre>   (h) hybrid on/off chain futures settlement engine (take & pay period processing, via central clearing account),<br/>
  *       with on-chain position management & position-level P&L;</pre>
  * <pre>   (i) decentralized issuance of cashflow tokens & corporate actions: subscriber cashflow (e.g. ETH/BNB) <br/>
  *       processing of (USD-priced or ETH/BNB-priced) token issuances, and (inversely) issuer cashflow processing of CFT-equity or CFT-loan payments.</pre>
  * @dev All function calls are currently implemented without side effects
  */

contract StMaster
    is
    StMintable, StBurnable, Collateralizable, StTransferable, DataLoadable, StFutures
{
    // === STM (AC COMMODITY) ===
    // TODO: getLedgerHashcode() segmented...
    // TODO: type-rename...
    // TODO: ERC20 authorize + re-entrancy guards, and .call instead of .transfer
    // todo: drop fee_fixed completely (it's == fee_min)
    // todo: etherscan -> verify contract interfaces? -- needs ctor bytecode
    // todo: change internalTransfer so it can operate on *any* stTypeId

    // (others)
    // todo: SCP - show totalSupply() for erc20's
    // todo: SCP - use decimals fields for erc20 (send/exchange text fields, or at least round to .decimals before passing to API)

    // contract properties
    string public name;

    /**
     * @dev returns the contract type
     * @return contractType
     * @param contractType returns the contract type<br/>0: commodity token<br/>1: cashflow token<br/>2: cashflow controller
     */
    function getContractType() external view returns(StructLib.ContractType contractType) { return ld.contractType; }

    /**
     * @dev returns the contract seal status
     * @return isSealed
     * @param isSealed returns the contract seal status : true or false
     */
    function getContractSeal() external view returns (bool isSealed) { return ld._contractSealed; }
    
    /**
     * @dev permanenty seals the contract; once sealed, no further addresses can be whitelisted
     */
     function sealContract() external { ld._contractSealed = true; }

    string contractVersion;
    string contractUnit; // the smallest (integer, non-divisible) security token unit, e.g. "KGs" or "TONS"

    /**
     * @dev returns the contract version
     * @return deploymentVersion
     * @param deploymentVersion returns the contract version
     */
    function version() external view returns (string memory deploymentVersion) { return contractVersion; }

    /**
     * @dev returns the contract unit
     * @return deploymentUnit
     * @param deploymentUnit returns the contract unit : kg or ton for commodity type and N/A for cashflow type
     */
    function unit() external view returns (string memory deploymentUnit) { return contractUnit; }

    // events -- (hack: see: https://ethereum.stackexchange.com/questions/11137/watching-events-defined-in-libraries)
    // need to be defined (duplicated) here - web3 can't see event signatures in libraries
    // CcyLib events
    event AddedCcyType(uint256 id, string name, string unit);
    event CcyFundedLedger(uint256 ccyTypeId, address indexed to, int256 amount, string desc);
    event CcyWithdrewLedger(uint256 ccyTypeId, address indexed from, int256 amount, string desc);
    // TokenLib events
    event AddedSecTokenType(uint256 id, string name, StructLib.SettlementType settlementType, uint64 expiryTimestamp, uint256 underlyerTypeId, uint256 refCcyId, uint16 initMarginBips, uint16 varMarginBips);
    event SetFutureVariationMargin(uint256 tokTypeId, uint16 varMarginBips);
    event SetFutureFeePerContract(uint256 tokTypeId, uint256 feePerContract);
    event Burned(uint256 tokTypeId, address indexed from, uint256 burnedQty);
    event BurnedFullSecToken(uint256 indexed stId, uint256 tokTypeId, address indexed from, uint256 burnedQty);
    event BurnedPartialSecToken(uint256 indexed stId, uint256 tokTypeId, address indexed from, uint256 burnedQty);
    event Minted(uint256 indexed batchId, uint256 tokTypeId, address indexed to, uint256 mintQty, uint256 mintSecTokenCount);
    event MintedSecToken(uint256 indexed stId, uint256 indexed batchId, uint256 tokTypeId, address indexed to, uint256 mintedQty);
    event AddedBatchMetadata(uint256 indexed batchId, string key, string value);
    event SetBatchOriginatorFee_Token(uint256 indexed batchId, StructLib.SetFeeArgs originatorFee);
    event SetBatchOriginatorFee_Currency(uint256 indexed batchId, uint16 origCcyFee_percBips_ExFee);
    // TransferLib events
    event TransferedFullSecToken(address indexed from, address indexed to, uint256 indexed stId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    event TransferedPartialSecToken(address indexed from, address indexed to, uint256 indexed splitFromSecTokenId, uint256 newSecTokenId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    event TradedCcyTok(uint256 ccyTypeId, uint256 ccyAmount, uint256 tokTypeId, address indexed /*tokens*/from, address indexed /*tokens*/to, uint256 tokQty, uint256 ccyFeeFrom, uint256 ccyFeeTo);
    // StructLib events
    enum TransferType { Undefined, User, ExchangeFee, OriginatorFee, TakePayFee, SettleTake, SettlePay, MintFee, BurnFee, WithdrawFee, DepositFee, DataFee, OtherFee1, OtherFee2,OtherFee3, OtherFee4, OtherFee5, RelatedTransfer, Adjustment, ERC20, Subscription }
    event TransferedLedgerCcy(address indexed from, address indexed to, uint256 ccyTypeId, uint256 amount, TransferType transferType);
    event ReservedLedgerCcy(address indexed ledgerOwner, uint256 ccyTypeId, uint256 amount);
    // SpotFeeLib events
    event SetFeeTokFix(uint256 tokTypeId, address indexed ledgerOwner, uint256 fee_tokenQty_Fixed);
    event SetFeeCcyFix(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Fixed);
    event SetFeeTokBps(uint256 tokTypeId, address indexed ledgerOwner, uint256 fee_token_PercBips);
    event SetFeeCcyBps(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_PercBips);
    event SetFeeTokMin(uint256 tokTypeId, address indexed ledgerOwner, uint256 fee_token_Min);
    event SetFeeCcyMin(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Min);
    event SetFeeTokMax(uint256 tokTypeId, address indexed ledgerOwner, uint256 fee_token_Max);
    event SetFeeCcyMax(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Max);
    event SetFeeCcyPerMillion(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_perMillion);
    // Erc20Lib 
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    // PayableLib events
    event IssuanceSubscribed(address indexed subscriber, address indexed issuer, uint256 weiSent, uint256 weiChange, uint256 tokensSubscribed, uint256 weiPrice);
    // Issuer Payment events
    event IssuerPaymentProcessed(uint32 indexed paymentId, address indexed issuer, uint256 totalAmount, uint32 totalBatchCount);
    event IssuerPaymentBatchProcessed(uint32 indexed paymentId, uint32 indexed paymentBatchId, address indexed issuer, uint256 weiSent, uint256 weiChange);
    event SubscriberPaid(uint32 indexed paymentId, uint32 indexed paymentBatchId, address indexed issuer, address subscriber, uint256 amount);
    // FuturesLib events
    event FutureOpenInterest(address indexed long, address indexed short, uint256 shortStId, uint256 tokTypeId, uint256 qty, uint256 price, uint256 feeLong, uint256 feeShort);
    event SetInitialMarginOverride(uint256 tokTypeId, address indexed ledgerOwner, uint16 initMarginBips);
    //event TakePay(address indexed from, address indexed to, uint256 delta, uint256 done, address indexed feeTo, uint256 otmFee, uint256 itmFee, uint256 feeCcyId);
    event TakePay2(address indexed from, address indexed to, uint256 ccyId, uint256 delta, uint256 done, uint256 fee);
    event Combine(address indexed to, uint256 masterStId, uint256 countTokensCombined);

    // DBG
    // event dbg1(uint256 id, uint256 typeId);
    // event dbg2(uint256 postIdShifted);
    
    /**
    * @dev deploys the STMaster contract as a commodity token (CT) or cashflow token (CFT)
    * @param _owners array of addresses to identify the deployment owners
    * @param _contractType 0: commodity token<br/>1: cashflow token<br/>2: cashflow controller
    * @param _custodyType 0: self custody<br/>1: 3rd party custody
    * @param _contractName smart contract name
    * @param _contractVer smart contract version
    * @param _contractUnit measuring unit for commodity types (ex: KG, tons or N/A)
    */
    constructor(
        address[] memory              _owners,
        StructLib.ContractType        _contractType,
        Owned.CustodyType             _custodyType,
//#if process.env.CONTRACT_TYPE === 'CASHFLOW_BASE'
//#         StructLib.CashflowArgs memory _cashflowArgs,
//#endif
        string memory                 _contractName,
        string memory                 _contractVer,
        string memory                 _contractUnit
//#if process.env.CONTRACT_TYPE === 'CASHFLOW_BASE' || process.env.CONTRACT_TYPE === 'COMMODITY'
        ,
        string memory                 _contractSymbol,
        uint8                         _contractDecimals
//#endif
//#if process.env.CONTRACT_TYPE === 'CASHFLOW_BASE'
//#     ,
//#   //address                       _chainlinkAggregator_btcUsd,
//#     address                       _chainlinkAggregator_ethUsd,
//#     address                       _chainlinkAggregator_bnbUsd
//#endif
    ) 
//#if process.env.CONTRACT_TYPE === 'CASHFLOW_BASE' || process.env.CONTRACT_TYPE === 'COMMODITY'
        StErc20(_contractSymbol, _contractDecimals)
//#endif
        Owned(_owners, _custodyType)
    {

//#if process.env.CONTRACT_TYPE === 'CASHFLOW_BASE'
//#         cashflowData.args = _cashflowArgs;
//#         //chainlinkAggregator_btcUsd = _chainlinkAggregator_btcUsd;
//#         chainlinkAggregator_ethUsd = _chainlinkAggregator_ethUsd;
//#         chainlinkAggregator_bnbUsd = _chainlinkAggregator_bnbUsd;
//#endif

        // set common properties
        name = _contractName;
        contractVersion = _contractVer;
        contractUnit = _contractUnit;

        // contract type
        ld.contractType = _contractType;
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
        return __batches[42].tokTypeId;

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
