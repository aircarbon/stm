pragma solidity 0.5.8;

// abstract contract (not interface)
contract St2Interface {
    function set_batch_id1(mapping(uint256 => SecTokenBatch) storage _batches) internal; // ###

    function name2() public pure returns (string memory);

    // function test(Test calldata test) external;
    // struct Test {
    //     mapping(uint256 => string) testMapping;
    // }

    struct SecTokenBatch {
        uint256 id;                                             // global sequential id: 1-based
        uint256 mintedTimestamp;                                // minting block.timestamp
        uint256 tokenTypeId;                                    // token type of the batch
        uint256 mintedQty;                                      // total unit qty minted in the batch
        uint256 burnedQty;                                      // total unit qty burned from the batch
      // string[] metaKeys;                                      // metadata keys
      // string[] metaValues;                                    // metadata values
    }
}
