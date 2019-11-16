pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "../Interfaces/St2Interface.sol";

library St2x /*is St2Interface*/ {
    //string public name2;
    function name2() external pure returns (string memory) {
        return "St2x Lives";
    }

    // struct SecTokenBatch {
    //     uint256 id;                                             // global sequential id: 1-based
    //     uint256 mintedTimestamp;                                // minting block.timestamp
    //     uint256 tokenTypeId;                                    // token type of the batch
    //     uint256 mintedQty;                                      // total unit qty minted in the batch
    //     uint256 burnedQty;                                      // total unit qty burned from the batch
    //     // string[] metaKeys;                                      // metadata keys
    //     // string[] metaValues;                                    // metadata values
    // }

    //
    // ### problem is visibility of param mapping() functions on abstract contract (can't be public!)
    //
    // TODO: #1 try passing in a struct (instead of a direct mapping)?
    //
    //       #2 try referencing by address.call(bytes(4...)) e.g. https://ethereum.stackexchange.com/questions/44383/creating-a-function-that-calls-another-contract
    //          (interface goes away in that case?)
    //

    // *** Batch LIST
    //mapping(uint256 => SecTokenBatch) _batches;                 // main batch list: all ST batches, by batch ID
    function set_batch_id1(mapping(uint256 => St2Interface.SecTokenBatch) storage _batches) external {
        St2Interface.SecTokenBatch memory newBatch = St2Interface.SecTokenBatch({
                         id: 42,
            mintedTimestamp: block.timestamp,
                tokenTypeId: 9999,
                  mintedQty: uint256(99),
                  burnedQty: 0
                //    metaKeys: new string[1],
                //  metaValues: new string[1]
        });
        _batches[42] = newBatch;
    }

    // constructor() public {
    //     name2 = "St2x Lives!";
    // }
}
