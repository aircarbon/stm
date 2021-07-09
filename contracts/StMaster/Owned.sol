// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity ^0.8.0;

/**
  * @title Owned
  * @author Dominic Morris (7-of-9)
  * @notice governance contract to manage access control
  */
contract Owned
{
    address payable deploymentOwner;
    // Certik: (Minor) OSM-07 | Inexistent Management Functionality The Owned contract implementation should be self-sufficient and possess adding and removing owners within it.
    // Review: TODO - (Minor) OSM-07 ... pass array from parent into Owned
    address[] owners;

    bool readOnlyState;
    
    /**
     * @dev returns the read only state of the deployement
     * @return isReadOnly
     * @param isReadOnly returns the read only state of the deployement
     */
    function readOnly() external view returns (bool isReadOnly) { return readOnlyState; }

    constructor() { // TODO: address[] _owners...
        deploymentOwner = payable(msg.sender); // payable used in solidity version 0.8.0 onwards
        readOnlyState = false;
    }

    /**
     * @dev returns the deployment owner addresses
     * @return deploymentOwners
     * @param deploymentOwners owner's account addresses of deployment owners
     */
    function getOwners() external view returns (address[] memory deploymentOwners) { return owners; }
    
    /**
     * @dev modifier to limit access to deployment owners onlyOwner
     */
    modifier onlyOwner() {
        // CFT: tx.origin (not msg.sender) -- we want the TX origin to be checked, not the calling cashflow controller
        //require(tx.origin == deploymentOwner, "Restricted"); 
        //require(found, "Restricted"); 

        // TODO: Confirmed -- could add CFT-C address into the owners[] for basetypes...
        // CFT-C: owners[] = [ addr1, 2, 3, 4 ... n ]
        // CFT-B: owners[] = [ addrCftC, addrCftC, addrCftC, addrCftC, addrCftC, addrCftC, addrCftC, addrCftC, addrCftC, ... n ]
        for (uint i = 0; i < owners.length; i++) {
            // Certik: (Minor) OSM-08 | Usage of tx.origin The use of tx.origin should be avoided for ownership-based systems given that firstly it can be tricked on-chain and secondly it will change its functionality once EIP-3074 is integrated.
            // Review: TODO HIPRI - (Minor) OSM-08 | Breaks on usage of msg.sender for CFT
            if (owners[i] == tx.origin) {  _; return; } // TODO: change to msg.sender....
        }
        revert("Restricted");
        _;
    }
    
    /**
     * @dev access modifier to allow read-write only when the READ-ONLY mode is off
     */
    modifier onlyWhenReadWrite() {
        require(readOnlyState == false, "Read-only");
        _;
    }

    /**
     * @dev change the control state to READ-ONLY [in case of emergencies or security threats as part of disaster recovery] 
     * @param readOnlyNewState only state: true or false
     */
    function setReadOnly(bool readOnlyNewState) external onlyOwner() {
        readOnlyState = readOnlyNewState;
    }
}
