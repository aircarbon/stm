// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9
pragma solidity 0.8.5;

/**
  * @title Owned
  * @author Dominic Morris (7-of-9)
  * @notice governance contract to manage access control
  */
contract Owned
{
    // CUSTODY TYPE
    enum CustodyType { SELF_CUSTODY, THIRD_PARTY_CUSTODY }

    address payable deploymentOwner;
    // Certik: (Minor) OSM-07 | Inexistent Management Functionality The Owned contract implementation should be self-sufficient and possess adding and removing owners within it.
    // Review: (Minor) OSM-07 ... pass array from parent into Owned
    // Ankur: Passing owners list from StMaster to Owned ctor
    address[] owners;

    CustodyType public custodyType;
    uint8 constant THIRDPARTY_CUSTODY_NDX = 1;

    bool readOnlyState;
    
    /**
     * @dev returns the read only state of the deployement
     * @return isReadOnly
     * @param isReadOnly returns the read only state of the deployement
     */
    function readOnly() external view returns (bool isReadOnly) { return readOnlyState; }
    constructor(address[] memory _owners, CustodyType _custodyType) {
        owners = _owners;
        custodyType = _custodyType;
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
        for (uint i = 0; i < owners.length; i++) {
            // Certik: (Minor) OSM-08 | Usage of tx.origin The use of tx.origin should be avoided for ownership-based systems given that firstly it can be tricked on-chain and secondly it will change its functionality once EIP-3074 is integrated.
            // Review: (Minor) OSM-08 | changed tx.origin to msg.sender - tested ok for cashflow base.
            if (owners[i] == msg.sender) {  _; return; }
        }
        revert("Restricted");
        _;
    }

    modifier onlyCustodian() {
        if (custodyType == CustodyType.SELF_CUSTODY) {
            for (uint i = 0; i < owners.length; i++) {
                if (owners[i] == msg.sender) {  _; return; }
            }
            revert("Restricted");
        }
        else {
            if (custodyType == CustodyType.THIRD_PARTY_CUSTODY) {
                if (owners[THIRDPARTY_CUSTODY_NDX] == msg.sender) {  _; return; } // fixed reserved addresses index for custodian address
                else { revert("Restricted"); }
            }
            revert("Bad custody type");
        }
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
