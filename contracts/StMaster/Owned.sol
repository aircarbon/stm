// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity >=0.4.21 <=0.7.1;

contract Owned
{
    address payable owner;
    address[] owners;

    bool readOnlyState;
    function readOnly() external view returns (bool) { return readOnlyState; }

    constructor() {
        owner = msg.sender;
        owners.push(owner);
        readOnlyState = false;
    }

    function getOwners() external view returns (address[] memory) { return owners; }

    modifier onlyOwner() {
        // CFT: tx.origin (not msg.sender) -- we want the TX origin to be checked, not the calling cashflow controller
        require(tx.origin == owner, "Restricted"); 
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
