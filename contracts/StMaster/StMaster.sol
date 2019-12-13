pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./CcyFundable.sol";
import "./CcyWithdrawable.sol";
import "./StMintable.sol";
import "./StBurnable.sol";
import "./StTransferable.sol";
import "./StErc20.sol";

import "../Libs/StructLib.sol"; // bytecode of libs get *removed* during linking (solc/truffle migrate)

contract StMaster is StMintable, StBurnable, CcyFundable, CcyWithdrawable, StTransferable {
    // contract properties
    string public name;
    string public version;
    string public unit; // the smallest (integer, non-divisible) security token unit, e.g. "KG"

    // events -- (hack: see: https://ethereum.stackexchange.com/questions/11137/watching-events-defined-in-libraries)
    // CcyLib events
    event AddedCcyType(uint256 id, string name, string unit);
    event CcyFundedLedger(uint256 ccyTypeId, address ledgerOwner, int256 amount);
    event CcyWithdrewLedger(uint256 ccyTypeId, address ledgerOwner, int256 amount);
    // TokenLib events
    event AddedSecTokenType(uint256 id, string name);
    event BurnedFullSecToken(uint256 stId, uint256 tokenTypeId, address ledgerOwner, uint256 burnedQty);
    event BurnedPartialSecToken(uint256 stId, uint256 tokenTypeId, address ledgerOwner, uint256 burnedQty);
    event MintedSecTokenBatch(uint256 batchId, uint256 tokenTypeId, address batchOwner, uint256 mintQty, uint256 mintSecTokenCount);
    event MintedSecToken(uint256 stId, uint256 batchId, uint256 tokenTypeId, address ledgerOwner, uint256 mintedQty);
    event AddedBatchMetadata(uint256 batchId, string key, string value);
    event SetBatchOriginatorFee(uint256 batchId, StructLib.SetFeeArgs originatorFee);
    // TransferLib events
    enum TransferType { User, ExchangeFee, OriginatorFee }
    event TransferedLedgerCcy(address from, address to, uint256 ccyTypeId, uint256 amount, TransferType transferType);
    event TransferedFullSecToken(address from, address to, uint256 stId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    event TransferedPartialSecToken(address from, address to, uint256 splitFromSecTokenId, uint256 newSecTokenId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    // FeeLib events
    event SetFeeTokFix(uint256 tokenTypeId, address ledgerOwner, uint256 fee_tokenQty_Fixed);
    event SetFeeCcyFix(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_Fixed);
    event SetFeeTokBps(uint256 tokenTypeId, address ledgerOwner, uint256 fee_token_PercBips);
    event SetFeeCcyBps(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_PercBips);
    event SetFeeTokMin(uint256 tokenTypeId, address ledgerOwner, uint256 fee_token_Min);
    event SetFeeCcyMin(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_Min);
    event SetFeeTokMax(uint256 tokenTypeId, address ledgerOwner, uint256 fee_token_Max);
    event SetFeeCcyMax(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_Max);
    // Erc20Lib events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    //
    // LAUNCH LIST
    //
    // PRI 0 ** ERC20 **
    //   main tests, re. permissions
    //
    // PERF/IDEA: change internalTransfer so it can operate on *any* stTypeId...? stTypeId is only a property of batch -- any good reason to restrict it?
    //            (less operations if it worked on any type?)
    //
    // PRI 0 ** CASHFLOWS re. SD **
    //   ....?!
    //
    // PRI 1 -- NEW-CONTRACT (DATA COPY) (so can defer splitting, and address anything else)
    //   > just need to be able to read out *all* data from storage (new contract can then have writers)
    //   > new Lib for this: DataReader -- needs to take paginated outputs
    //
    // ====== MAINNET ======
    //
    // BONDING CURVES... can we use them?
    //
    // WITHDRAW FEES - (whitelist => erc20) - defer
    //
    // SPLITTING TX'S - defer
    //  ** fee-preview: returns enough data (qty?) for an orchestrator to split up a large multi-batch transfer TX into separate components?
    //    >> with MAX_BATCHES_PREVIEW exceeded ... change to more(bool) ... ?
    //  ** fee-preview: tests general / using it for splitting multi-batch transfers
    //

    constructor(
        string memory contractName,
        string memory contractVer,
        string memory contractUnit,
        string memory contractSymbol,
        uint8 contractDecimals
    ) StErc20(contractSymbol, contractDecimals)
    public {
        // set contract properties
        name = contractName; //"SecTok_Master";
        version = contractVer; //"0.7";
        unit = contractUnit; //"KG";

        // params - token types
        stTypesData._tokenTypeNames[1] = 'CER - UNFCCC - Certified Emission Reduction';
        stTypesData._tokenTypeNames[2] = 'VCS - VERRA - Verified Carbon Standard';
        stTypesData._count_tokenTypes = 2;

        // params - currency types
        ccyTypesData._ccyTypes[1] = StructLib.Ccy({ id: 1, name: 'SGD', unit: 'cents',      decimals: 2 }); // gas: ~500k (!) for pre-populating these
        ccyTypesData._ccyTypes[2] = StructLib.Ccy({ id: 2, name: 'ETH', unit: 'Wei',        decimals: 18 });
        ccyTypesData._ccyTypes[3] = StructLib.Ccy({ id: 3, name: 'BTC', unit: 'Satoshi',    decimals: 8 });
        ccyTypesData._ccyTypes[4] = StructLib.Ccy({ id: 4, name: 'USD', unit: 'cents',      decimals: 2 });
        ccyTypesData._ccyTypes[5] = StructLib.Ccy({ id: 5, name: 'EUR', unit: 'euro cents', decimals: 2 });
        ccyTypesData._ccyTypes[6] = StructLib.Ccy({ id: 6, name: 'HKD', unit: 'cents',      decimals: 2 });
        ccyTypesData._ccyTypes[7] = StructLib.Ccy({ id: 7, name: 'GBP', unit: 'pence',      decimals: 2 });
        ccyTypesData._count_ccyTypes = 7;

         // create ledger entry for contract owner - transfer fees are paid to this ledger entry
        ledgerData._ledger[owner] = StructLib.Ledger({
            exists: true,
        customFees: StructLib.FeeStruct()
        });
        ledgerData._ledgerOwners.push(owner);
    }

    // TODO: for updateable libs - proxy dispatcher
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
