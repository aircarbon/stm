pragma solidity ^0.5.13;

import "../Interfaces/IOwned.sol";

contract Owned is IOwned
{
    address payable owner;

    bool readOnlyState;
    function readOnly() external view returns (bool) { return readOnlyState; }

    constructor() public {
        owner = msg.sender;
        readOnlyState = false;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Restricted");
        _; // required magic
    }
    modifier onlyWhenReadWrite() {
        require(readOnlyState == false, "Read-only");
        _;
    }

    function setReadOnly(bool readOnlyNewState)
    external onlyOwner() {
        readOnlyState = readOnlyNewState;
    }
}
