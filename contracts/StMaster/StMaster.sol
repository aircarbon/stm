pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./StMintable.sol";
import "./StBurnable.sol";
import "./CcyFundable.sol";
import "./CcyWithdrawable.sol";
import "./StTransferable.sol";

//import "../St2x/St2x.sol"; // bytecode of lib gets *removed* during LINKING (solc/truffle migrate)
import "../Lib/CcyLib.sol";
import "../Lib/LedgerLib.sol";
import "../Lib/StructLib.sol";

contract StMaster is StMintable, StBurnable, CcyFundable, CcyWithdrawable, StTransferable {

    string public name;
    string public version;
    string public unit; // the smallest (integer, non-divisible) security token unit, e.g. "KG"

    // TODO: for updateable libs - proxy dispatcher
    // https://blog.openzeppelin.com/proxy-libraries-in-solidity-79fbe4b970fd/
    //address public addr_st2;

    constructor(
        //address st2
    ) public {
        //addr_st2 = st2; // TODO: want to be able to update this post-deployment (public owner-only setter)...

        // params - global
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
        ledgerData._ledger[owner] = LedgerLib.Ledger({
            exists: true
        });
        ledgerData._ledgerOwners.push(owner);
    }

    // test lib
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
