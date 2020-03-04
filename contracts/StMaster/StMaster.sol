pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/IStMaster.sol";
import "../Interfaces/IPublicViews.sol";

import "./CcyCollateralizable.sol";
import "./StMintable.sol";
import "./StBurnable.sol";
import "./StTransferable.sol";
import "./StErc20.sol";
import "./StPayable.sol";
import "./DataLoadable.sol";

import "../Interfaces/StructLib.sol";

contract StMaster is IStMaster, IPublicViews,
    StMintable, StBurnable, Collateralizable, StTransferable, DataLoadable {

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

    function getContractType() external view returns(StructLib.ContractType) { return ledgerData.contractType; }

    function getContractSeal() external view returns (bool) { return ledgerData._contractSealed; }
    function sealContract() external { ledgerData._contractSealed = true; }

    string contractVersion;
    string contractUnit; // the smallest (integer, non-divisible) security token unit, e.g. "TONS"
    function version() external view returns (string memory) { return contractVersion; }
    function unit() external view returns (string memory) { return contractUnit; }

    // events -- (hack: see: https://ethereum.stackexchange.com/questions/11137/watching-events-defined-in-libraries)
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
    event SetBatchOriginatorFee_Token(uint256 indexed batchId, StructLib.SetFeeArgs originatorFee);
    event SetBatchOriginatorFee_Currency(uint256 indexed batchId, uint16 origCcyFee_percBips_ExFee);
    // TransferLib events
    //enum TransferType { User, ExchangeFee, OriginatorFee }
    event TransferedLedgerCcy(address indexed from, address indexed to, uint256 ccyTypeId, uint256 amount, TransferType transferType);
    event TransferedFullSecToken(address indexed from, address indexed to, uint256 indexed stId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    event TransferedPartialSecToken(address indexed from, address indexed to, uint256 indexed splitFromSecTokenId, uint256 newSecTokenId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    event TradedCcyTok(uint256 indexed ccyTypeId, uint256 ccyAmount, uint256 indexed tokTypeId, uint256 tokQty);
    //event dbg1(uint256 batchId, uint256 S, uint256 BCS, uint256 batchQty, uint256 totQty, uint256 batch_exFee_ccy, uint256 BFEE);
    // FeeLib events
    event SetFeeTokFix(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_tokenQty_Fixed);
    event SetFeeCcyFix(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Fixed);
    event SetFeeTokBps(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_token_PercBips);
    event SetFeeCcyBps(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_PercBips);
    event SetFeeTokMin(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_token_Min);
    event SetFeeCcyMin(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Min);
    event SetFeeTokMax(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_token_Max);
    event SetFeeCcyMax(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Max);
    event SetFeeCcyPerThousand(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_perThousand);
    // Erc20Lib events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    // PayableLib events
    event IssuanceSubscribed(address indexed subscriber, address indexed issuer, uint256 weiSent, uint256 weiChange, uint256 tokensSubscribed, uint256 weiPrice);

    constructor(
        StructLib.ContractType        _contractType,
        StructLib.CashflowArgs memory _cashflowArgs,
        string memory                 _contractName,
        string memory                 _contractVer,
        string memory                 _contractUnit,
        string memory                 _contractSymbol,
        uint8                         _contractDecimals,
        address                       _chainlinkAggregator_btcUsd,
        address                       _chainlinkAggregator_ethUsd
    ) StErc20(_contractSymbol, _contractDecimals)
    public {
        chainlinkAggregator_btcUsd = _chainlinkAggregator_btcUsd;
        chainlinkAggregator_ethUsd = _chainlinkAggregator_ethUsd;

        // set common properties
        name = _contractName;
        contractVersion = _contractVer;
        contractUnit = _contractUnit;

        // contract type
        ledgerData.contractType = _contractType;
        cashflowData.args = _cashflowArgs;

        // set token & ccy types
        if (_contractType == StructLib.ContractType.COMMODITY) {
            stTypesData._tokenTypeNames[1] = 'AirCarbon CORSIA Token';
            stTypesData._tokenTypeNames[2] = 'AirCarbon Nature Token';
            stTypesData._tokenTypeNames[3] = 'AirCarbon Premium Token';
            stTypesData._count_tokenTypes = 3;
            ccyTypesData._ccyTypes[1] = StructLib.Ccy({ id: 1, name: 'USD', unit: 'cents',      decimals: 2 });
            ccyTypesData._ccyTypes[2] = StructLib.Ccy({ id: 2, name: 'ETH', unit: 'Wei',        decimals: 18 });
            ccyTypesData._ccyTypes[3] = StructLib.Ccy({ id: 3, name: 'BTC', unit: 'Satoshi',    decimals: 8 });
          //ccyTypesData._ccyTypes[4] = StructLib.Ccy({ id: 4, name: 'SGD', unit: 'cents',      decimals: 2 });
          //ccyTypesData._ccyTypes[5] = StructLib.Ccy({ id: 5, name: 'EUR', unit: 'euro cents', decimals: 2 });
          //ccyTypesData._ccyTypes[6] = StructLib.Ccy({ id: 6, name: 'HKD', unit: 'cents',      decimals: 2 });
          //ccyTypesData._ccyTypes[7] = StructLib.Ccy({ id: 7, name: 'GBP', unit: 'pence',      decimals: 2 });
            ccyTypesData._count_ccyTypes = 3;

            // set default ccy fee USD: $3/1000 mirrored
            StructLib.SetFeeArgs memory feeArgsGlobalUsd = StructLib.SetFeeArgs({
                   fee_fixed: 0,
                fee_percBips: 0,
                     fee_min: 300,      // min $3.00
                     fee_max: 0,
             ccy_perThousand: 300,      // $3.00 per thousand tokens received
               ccy_mirrorFee: true      // mirrored - token sender pays, too
            });
            FeeLib.setFee_CcyType(ledgerData, ccyTypesData, globalFees,
                1,            // USD
                address(0x0), // global fee
                feeArgsGlobalUsd
            );
        }
        else if (_contractType == StructLib.ContractType.CASHFLOW) {
            stTypesData._tokenTypeNames[1] = 'UNI_TOKEN'; //contractName;
            stTypesData._count_tokenTypes = 1;
            ccyTypesData._ccyTypes[1] = StructLib.Ccy({ id: 1, name: 'ETH', unit: 'Wei',        decimals: 18 });
            ccyTypesData._count_ccyTypes = 1;
        }
        else revert('Bad contract type');

        // create ledger entry for contract owner - transfer fees are paid to this ledger entry
        ledgerData._ledger[owner] = StructLib.Ledger({
            exists: true,
        customFees: StructLib.FeeStruct()
        });
        ledgerData._ledgerOwners.push(owner);
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
