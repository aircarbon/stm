// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity >=0.4.21 <=0.7.1;

contract Owned
{
    address payable owner;

    bool readOnlyState;
    function readOnly() external view returns (bool) { return readOnlyState; }

    constructor() public {
        owner = msg.sender;
        readOnlyState = false;
    }

    modifier onlyOwner() {
        require(tx.origin == owner, "Restricted"); // CFT: not msg.sender -- we want the TX origin to be checked, not the calling cashflow controller
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
