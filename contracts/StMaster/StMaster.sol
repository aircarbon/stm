pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./StMintable.sol";
import "./StBurnable.sol";
import "./CcyFundable.sol";
import "./CcyWithdrawable.sol";
import "./StTransferable.sol";

// bytecode of libs get *removed* during LINKING (solc/truffle migrate)
import "../Libs/StructLib.sol";
//import "../Libs/CcyLib.sol";
//import "../Libs/LedgerLib.sol";

contract StMaster is StMintable, StBurnable, CcyFundable, CcyWithdrawable, StTransferable {
    // contact properties
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
    event TransferedLedgerCcy(address from, address to, uint256 ccyTypeId, uint256 amount, bool isFee);
    event TransferedFullSecToken(address from, address to, uint256 stId, uint256 mergedToSecTokenId, /*uint256 tokenTypeId,*/ uint256 qty, bool isFee);
    event TransferedPartialSecToken(address from, address to, uint256 splitFromSecTokenId, uint256 newSecTokenId, uint256 mergedToSecTokenId, /*uint256 tokenTypeId,*/ uint256 qty, bool isFee);
    // FeeLib events
    event SetFeeTokFix(uint256 tokenTypeId, address ledgerOwner, uint256 fee_tokenQty_Fixed);
    event SetFeeCcyFix(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_Fixed);
    event SetFeeTokBps(uint256 tokenTypeId, address ledgerOwner, uint256 fee_token_PercBips);
    event SetFeeCcyBps(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_PercBips);
    event SetFeeTokMin(uint256 tokenTypeId, address ledgerOwner, uint256 fee_token_Min);
    event SetFeeCcyMin(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_Min);
    event SetFeeTokMax(uint256 tokenTypeId, address ledgerOwner, uint256 fee_token_Max);
    event SetFeeCcyMax(uint256 ccyTypeId, address ledgerOwner, uint256 fee_ccy_Max);

    constructor() public {
        // set contract properties
        name = "SecTok_Master";
        version = "0.4";
        unit = "KG";

        // params - token types
        stTypesData._tokenTypeNames[0] = 'CER - UNFCCC - Certified Emission Reduction';
        stTypesData._tokenTypeNames[1] = 'VCS - VERRA - Verified Carbon Standard';
        stTypesData._count_tokenTypes = 2;

        // params - currency types
        ccyTypesData._ccyTypes[0] = StructLib.Ccy({ id: 0, name: 'SGD', unit: 'cents' });
        ccyTypesData._ccyTypes[1] = StructLib.Ccy({ id: 1, name: 'ETH', unit: 'Wei'   });
        ccyTypesData._count_ccyTypes = 2;

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
