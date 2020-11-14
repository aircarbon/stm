// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity >=0.4.21 <=0.7.1;

contract Owned
{
    address payable deploymentOwner;
    address[] owners;

    bool readOnlyState;
    function readOnly() external view returns (bool) { return readOnlyState; }

    constructor() {
        deploymentOwner = msg.sender;
        readOnlyState = false;
    }

    function getOwners() external view returns (address[] memory) { return owners; }

    modifier onlyOwner() {
        // CFT: tx.origin (not msg.sender) -- we want the TX origin to be checked, not the calling cashflow controller
        //require(tx.origin == deploymentOwner, "Restricted"); 
        //require(found, "Restricted"); 
        
        for (uint i = 0; i < owners.length; i++) {
            if (owners[i] == tx.origin) {  _; return; }
        }
        revert("Restricted");
        _;
    }
    modifier onlyWhenReadWrite() {
        require(readOnlyState == false, "Read-only");
        _;
    }

    function setReadOnly(bool readOnlyNewState) external onlyOwner() {
        readOnlyState = readOnlyNewState;
    }
}
