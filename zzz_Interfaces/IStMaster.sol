pragma solidity >=0.4.21 <=0.6.10;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

/**
 * @notice Security Token Master
 * COMMODITY-type: semi-fungible, multi-type & multi-batch;
 * COMMODITY-type: fungible, uni-type & uni-batch CASHFLOW-type
 * @dev Contrct type (CASHFLOW or COMMODITY) is set through implementing contract's ctor
 */
 interface IStMaster {

    // CcyLib events
    // event AddedCcyType(uint256 id, string name, string unit);
    // event CcyFundedLedger(uint256 ccyTypeId, address indexed to, int256 amount);
    // event CcyWithdrewLedger(uint256 ccyTypeId, address indexed from, int256 amount);
    // // TokenLib events
    // event AddedSecTokenType(uint256 id, string name, StructLib.SettlementType settlementType, uint64 expiryTimestamp, uint256 underlyerTypeId, uint256 refCcyId, uint16 initMarginBips, uint16 varMarginBips);
    // event SetFutureVariationMargin(uint256 tokTypeId, uint16 varMarginBips);
    // event SetFutureFeePerContract(uint256 tokTypeId, uint256 feePerContract);
    // event BurnedFullSecToken(uint256 indexed stId, uint256 tokTypeId, address indexed from, uint256 burnedQty);
    // event BurnedPartialSecToken(uint256 indexed stId, uint256 tokTypeId, address indexed from, uint256 burnedQty);
    // event MintedSecTokenBatch(uint256 indexed batchId, uint256 tokTypeId, address indexed to, uint256 mintQty, uint256 mintSecTokenCount);
    // event MintedSecToken(uint256 indexed stId, uint256 indexed batchId, uint256 tokTypeId, address indexed to, uint256 mintedQty);
    // event AddedBatchMetadata(uint256 indexed batchId, string key, string value);
    // event SetBatchOriginatorFee_Token(uint256 indexed batchId, StructLib.SetFeeArgs originatorFee);
    // event SetBatchOriginatorFee_Currency(uint256 indexed batchId, uint16 origCcyFee_percBips_ExFee);
    // // TransferLib events
    // event TransferedFullSecToken(address indexed from, address indexed to, uint256 indexed stId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    // event TransferedPartialSecToken(address indexed from, address indexed to, uint256 indexed splitFromSecTokenId, uint256 newSecTokenId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    // event TradedCcyTok(uint256 ccyTypeId, uint256 ccyAmount, uint256 tokTypeId, address indexed /*tokens*/from, address indexed /*tokens*/to, uint256 tokQty);
    // // StructLib events
    // enum TransferType { User, ExchangeFee, OriginatorFee, TakePay, TakePayFee, SettleTake, SettlePay }
    // event TransferedLedgerCcy(address indexed from, address indexed to, uint256 ccyTypeId, uint256 amount, TransferType transferType);
    // event ReervedLedgerCcy(address indexed ledgerOwner, uint256 ccyTypeId, uint256 amount);
    // // SpotFeeLib events
    // event SetFeeTokFix(uint256 tokTypeId, address indexed ledgerOwner, uint256 fee_tokenQty_Fixed);
    // event SetFeeCcyFix(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Fixed);
    // event SetFeeTokBps(uint256 tokTypeId, address indexed ledgerOwner, uint256 fee_token_PercBips);
    // event SetFeeCcyBps(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_PercBips);
    // event SetFeeTokMin(uint256 tokTypeId, address indexed ledgerOwner, uint256 fee_token_Min);
    // event SetFeeCcyMin(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Min);
    // event SetFeeTokMax(uint256 tokTypeId, address indexed ledgerOwner, uint256 fee_token_Max);
    // event SetFeeCcyMax(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Max);
    // event SetFeeCcyPerMillion(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_perMillion);
    // // Erc20Lib events
    // event Transfer(address indexed from, address indexed to, uint256 value);
    // event Approval(address indexed owner, address indexed spender, uint256 value);
    // // PayableLib events
    // event IssuanceSubscribed(address indexed subscriber, address indexed issuer, uint256 weiSent, uint256 weiChange, uint256 tokensSubscribed, uint256 weiPrice);
    // // FuturesLib events
    // event FutureOpenInterest(address indexed long, address indexed short, uint256 shortStId, uint256 tokTypeId, uint256 qty, uint256 price, uint256 feeLong, uint256 feeShort);
    // event SetInitialMarginOverride(uint256 tokTypeId, address indexed ledgerOwner, uint16 initMarginBips);
    // event TakePay(address indexed otm, address indexed itm, uint256 delta, uint256 done);
    // event TakePay2(address indexed from, address indexed to, uint256 ccyId, uint256 delta, uint256 done, uint256 fee);
    // event dbg(int256 feePerSide);

    // /**
    //  * @notice Contract version
    //  */
    // function version() external view returns (string memory);

    // /**
    //  * @notice The security token unit name, e.g. "TONS" or carbon, "Token" for generic CFT tokens
    //  */
    // function unit() external view returns (string memory);

    // /**
    //  * @notice Returns the contract type: COMMODITY (0) or CASHFLOW (1)
    //  */
    // function getContractType() external view returns(StructLib.ContractType);

    // /**
    //  * @notice Returns whether or not the contract is sealed
    //  */
    // function getContractSeal() external view returns (bool);

    /**
     * @notice Seals the contract
     */
    function sealContract() external;
}