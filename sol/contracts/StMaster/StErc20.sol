// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9
// Certik (AD): locked compiler version
pragma solidity 0.8.5;

import "./StFees.sol";

import "../Interfaces/StructLib.sol";
import "../Libs/TransferLib.sol";
import "../Libs/LedgerLib.sol";
import "../Libs/Erc20Lib.sol";

/**
  * Manages ERC20 operations & data
  * @title ERC20 Compatibility for Security Token Master
  * @author Dominic Morris (7-of-9) and Ankur Daharwal (ankurdaharwal)
  * @notice a standard ERC20 implementation
  * @dev 
  * <pre>   - inherits Owned ownership smart contract</pre>
  * <pre>   - inherits StLedger security token ledger contract</pre>
  * <pre>   - inherits StFees fee management contract</pre>
  * <pre>   - inherits StructLib interface library</pre>
  * <pre>   - inherits Erc20Lib runtime library</pre>
  * <pre>   - inherits LedgerLib runtime library</pre>
  * <pre>   - inherits TransferLib runtime library</pre>
  */

abstract contract StErc20 is StFees
{
    StructLib.Erc20Struct erc20d;

    // TODO: move WL stuff out of erc20
    // WHITELIST - add entry & retreive full whitelist
    // function whitelist(address addr) public onlyOwner() {
    //     Erc20Lib.whitelist(ld, erc20d, addr);
    // }
    
    /**
     * @dev add multiple whitelist account addresses by deployment owners only
     * @param addr list of account addresses to be whitelisted
     */

    // Certik: SES-02 | Function Visibility Optimization
    // Review: Replaced public with external and memory with calldata for gas optimization
    function whitelistMany(address[] calldata addr) external onlyOwner() {
        for (uint256 i = 0; i < addr.length; i++) {
            Erc20Lib.whitelist(ld, erc20d, addr[i]);
        }
    }
    
    /**
     * @dev return all whitelist addresses
     * @return whitelistAddresses
     * @param whitelistAddresses list of all whitelisted account addresses
     */
    // Certik: SES-03 | Return Variable Utilization
    // Resolved (AD): Utilized return variable for gas optimization
    function getWhitelist() external view returns (address[] memory whitelistAddresses) {
        whitelistAddresses = erc20d._whitelist;
    }
 
//#if process.env.CONTRACT_TYPE === 'CASHFLOW_BASE' || process.env.CONTRACT_TYPE === 'COMMODITY'
    /// @notice symbol standard ERC20 token symbol
    string public symbol;
    /// @notice decimals standard ERC20 token decimal for level of precision of issued tokens
    uint8 public decimals;

    /**
     * @dev standard ERC20 token
     * @param _symbol token symbol
     * @param _decimals level of precision of the tokens
     */
    constructor(string memory _symbol, uint8 _decimals) {
        symbol = _symbol;
        decimals = _decimals;

        // this index is used for allocating whitelist addresses to users (getWhitelistNext()))
        // we skip/reserve the first ten whitelisted address (0 = owner, 1-9 for expansion)
        //erc20d._nextWhitelistNdx = 10;
    }

    // ERC20 - core
    
    /**
     * @dev standard ERC20 token total supply
     * @return availableQty
     * @param availableQty returns total available quantity (minted quantity - burned quantitypublic
     */
    // Certik: SES-03 | Return Variable Utilization
    // Resolved (AD): Utilized return variable for gas optimization
    function totalSupply() public view returns (uint256 availableQty) {
        availableQty = ld._spot_totalMintedQty - ld._spot_totalBurnedQty;
    }
    
    /**
     * @dev standard ERC20 token balanceOf
     * @param account account address to check the balance of
     * @return balance
     * @param balance returns balance of the account address provided
     */
    // Certik: SES-03 | Return Variable Utilization
    // Resolved (AD): Utilized return variable for gas optimization
    function balanceOf(address account) public view returns (uint256 balance) {
        StructLib.LedgerReturn memory ret = LedgerLib.getLedgerEntry(ld, std, ctd, account);
        balance = ret.spot_sumQty;
    }
    
    /**
     * @dev standard ERC20 token transfer
     * @param recipient receiver's account address
     * @param amount to be transferred to the recipient
     * @return transferStatus
     * @param transferStatus returns status of transfer: true or false 
     */
    // Certik: SES-03 | Return Variable Utilization
    // Resolved (AD): Utilized return variable for gas optimization
    function transfer(address recipient, uint256 amount) public returns (bool transferStatus) {
        require(balanceOf(msg.sender) >= amount, "Insufficient tokens");

        transferStatus = Erc20Lib.transfer(ld, std, ctd, globalFees, Erc20Lib.transferErc20Args({
      deploymentOwner: deploymentOwner,
            recipient: recipient,
               amount: amount
        }));
    }

    // ERC20 - approvals
    
    /**
     * @dev standard ERC20 token allowance
     * @param sender (owner) of the erc20 tokens
     * @param spender of the erc20 tokens
     * @return spendAllowance 
     * @param spendAllowance returns the erc20 allowance as per approval by owner
     */
    // Certik: SES-03 | Return Variable Utilization
    // Resolved (AD): Utilized return variable for gas optimization
    function allowance(address sender, address spender) public view returns (uint256 spendAllowance) { 
        spendAllowance = erc20d._allowances[sender][spender];
    }
    
    /**
     * @dev standard ERC20 token approve
     * @param spender spender of the erc20 tokens to be give approval for allowance
     * @param amount amount to be approved for allowance for spending on behalf of the owner
     * @return approvalStatus 
     * @param approvalStatus returns approval status
     */
    // Certik: SES-03 | Return Variable Utilization
    // Resolved (AD): Utilized return variable for gas optimization
    function approve(address spender, uint256 amount) public returns (bool approvalStatus) { 
        approvalStatus = Erc20Lib.approve(ld, erc20d, spender, amount);
    }
    
    /**
     * @dev standard ERC20 token transferFrom
     * @param sender ERC20 token sender
     * @param recipient ERC20 tkoen receiver
     * @param amount amount to be transferred
     * @return transferFromStatus
     * @param transferFromStatus returns status of transfer: true or false 
     */
    // Certik: SES-03 | Return Variable Utilization
    // Resolved (AD): Utilized return variable for gas optimization
    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool transferFromStatus) { 
        transferFromStatus = Erc20Lib.transferFrom(ld, std, ctd, globalFees, erc20d, sender, Erc20Lib.transferErc20Args({
      deploymentOwner: deploymentOwner,
            recipient: recipient,
               amount: amount
        }));
    }
//#endif
}
