// SPDX-License-Identifier: AGPL-3.0-only
// Author: https://github.com/7-of-9
pragma solidity >=0.4.21 <=0.7.1;

/**
  * @title Owned
  * @author Dominic Morris (7-of-9)
  * @notice governance contract to manage access control
  */
contract Owned
{
    address payable deploymentOwner;
    address[] owners;

    bool readOnlyState;
    
    /**
     * @dev returns the read only state of the deployement
     * @return isReadOnly
     * @param isReadOnly returns the read only state of the deployement
     */
    function readOnly() external view returns (bool isReadOnly) { return readOnlyState; }

    constructor() {
        deploymentOwner = msg.sender;
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
        
        for (uint i = 0; i < owners.length; i++) {
            if (owners[i] == tx.origin) {  _; return; }
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
