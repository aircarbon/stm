pragma solidity ^0.5.13;

import "../Interfaces/IOwned.sol";

contract Owned is IOwned
{
    address payable owner;
    bool public readOnly;

    constructor() public {
        owner = msg.sender;
        readOnly = false;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Restricted");
        _; // required magic
    }
    modifier onlyWhenReadWrite() {
        require(readOnly == false, "Read-only");
        _;
    }
    // modifier onlyWhenReadOnly() {
    //     require(readOnly == true, "Set to read-only first");
    //     _;
    // }

    function setReadOnly(bool _readOnly)
    external onlyOwner() {
        readOnly = _readOnly;
    }
}
