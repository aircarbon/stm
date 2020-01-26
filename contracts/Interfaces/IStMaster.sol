pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Libs/StructLib.sol";

/**
 * @notice Security Token Master
 * COMMODITY-type: semi-fungible, multi-type & multi-batch;
 * COMMODITY-type: fungible, uni-type & uni-batch CASHFLOW-type
 * @dev Contrct type (CASHFLOW or COMMODITY) is set through implementing contract's ctor
 */
 interface IStMaster {

    // CcyLib events
    event AddedCcyType(uint256 id, string name, string unit);
    event CcyFundedLedger(uint256 ccyTypeId, address indexed ledgerOwner, int256 amount);
    event CcyWithdrewLedger(uint256 ccyTypeId, address indexed ledgerOwner, int256 amount);
    // TokenLib events
    event AddedSecTokenType(uint256 id, string name);
    event BurnedFullSecToken(uint256 indexed stId, uint256 tokenTypeId, address indexed ledgerOwner, uint256 burnedQty);
    event BurnedPartialSecToken(uint256 indexed stId, uint256 tokenTypeId, address indexed ledgerOwner, uint256 burnedQty);
    event MintedSecTokenBatch(uint256 indexed batchId, uint256 tokenTypeId, address indexed batchOwner, uint256 mintQty, uint256 mintSecTokenCount);
    event MintedSecToken(uint256 indexed stId, uint256 indexed batchId, uint256 tokenTypeId, address indexed ledgerOwner, uint256 mintedQty);
    event AddedBatchMetadata(uint256 indexed batchId, string key, string value);
    event SetBatchOriginatorFee(uint256 indexed batchId, StructLib.SetFeeArgs originatorFee);
    // TransferLib events
    enum TransferType { User, ExchangeFee, OriginatorFee }
    event TransferedLedgerCcy(address indexed from, address indexed to, uint256 ccyTypeId, uint256 amount, TransferType transferType);
    event TransferedFullSecToken(address indexed from, address indexed to, uint256 indexed stId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    event TransferedPartialSecToken(address indexed from, address indexed to, uint256 indexed splitFromSecTokenId, uint256 newSecTokenId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    // FeeLib events
    event SetFeeTokFix(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_tokenQty_Fixed);
    event SetFeeCcyFix(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Fixed);
    event SetFeeTokBps(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_token_PercBips);
    event SetFeeCcyBps(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_PercBips);
    event SetFeeTokMin(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_token_Min);
    event SetFeeCcyMin(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Min);
    event SetFeeTokMax(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_token_Max);
    event SetFeeCcyMax(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Max);
    // Erc20Lib events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    // PayableLib events
    event IssuanceSubscribed(address indexed subscriber, address indexed issuer, uint256 weiSent, uint256 weiChange, uint256 tokensSubscribed, uint256 weiPrice);

    // /**
    //  * @notice Contract version
    //  */
    // function version() external view returns (string memory);

    // /**
    //  * @notice The security token unit name, e.g. "KG" or carbon, "Token" for generic CFT tokens
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