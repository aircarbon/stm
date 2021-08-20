// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Certik (AD): locked compiler version
pragma solidity 0.8.5;

/**
  * @title Migrations
  * @author Dominic Morris (7-of-9)
  * @notice smart contract migrations contract
  */
contract Migrations {
    address public owner;
    uint256 public last_completed_migration;

    /**
     * @dev initialize the migrations contract
     */
    constructor() {
        owner = msg.sender;
    }

    modifier restricted() {
        if (msg.sender == owner) _;
    }

    /**
     * @dev set the migration as completed
     * @param completed completion attempt #
     */
    function setCompleted(uint256 completed) public restricted {
        last_completed_migration = completed;
    }
    
    /**
     * @dev upgrade contract and intialize migration
     * @param new_address new address for migration of old contract
     */
    function upgrade(address new_address) public restricted {
        Migrations upgraded = Migrations(new_address);
        upgraded.setCompleted(last_completed_migration);
    }
}
