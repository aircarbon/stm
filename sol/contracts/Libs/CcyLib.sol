// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9
// Certik (AD): locked compiler version
pragma solidity 0.8.5;

import "../Interfaces/StructLib.sol";

library CcyLib {
    event AddedCcyType(uint256 id, string name, string unit);
    event CcyFundedLedger(uint256 ccyTypeId, address indexed to, int256 amount, string desc);
    event CcyWithdrewLedger(uint256 ccyTypeId, address indexed from, int256 amount, string desc);

    // CCY TYPES
    function addCcyType(
        StructLib.LedgerStruct storage ld,
        StructLib.CcyTypesStruct storage ctd,
        string memory name,
        string memory unit,
        uint16 decimals)
    public {
        require(ld.contractType == StructLib.ContractType.COMMODITY ||
                ld.contractType == StructLib.ContractType.CASHFLOW_CONTROLLER, "Bad cashflow request"); // disallow ccy's on base cashflow contract

        require(ctd._ct_Count < 32/*MAX_CCYS*/, "Too many currencies");
        // Certik: CLL-02 | Inefficient storage read
        // Resolved (AD): Utilized a local variable to store ctd._ct_Count to save gas cost
        uint256 ccyTypesCount = ctd._ct_Count;
        for (uint256 ccyTypeId = 1; ccyTypeId <= ccyTypesCount; ccyTypeId++) {
            require(keccak256(abi.encodePacked(ctd._ct_Ccy[ccyTypeId].name)) != keccak256(abi.encodePacked(name)), "Currency type name already exists");
        }

        ctd._ct_Count++;
        ctd._ct_Ccy[ctd._ct_Count] = StructLib.Ccy({
              id: ctd._ct_Count,
            name: name,
            unit: unit,
        decimals: decimals
        });
        emit AddedCcyType(ctd._ct_Count, name, unit);
    }

    function getCcyTypes(
        StructLib.CcyTypesStruct storage ctd)
    public view
    returns (StructLib.GetCcyTypesReturn memory ccys) {
        StructLib.Ccy[] memory ccyTypes;
        // Certik: CLL-05 | Inefficient storage read
        // Resolved (AD): Utilized a local variable to store ctd._ct_Count to save gas cost
        uint256 ccyTypesCount = ctd._ct_Count;
        ccyTypes = new StructLib.Ccy[](ccyTypesCount);

        for (uint256 ccyTypeId = 1; ccyTypeId <= ccyTypesCount; ccyTypeId++) {
            ccyTypes[ccyTypeId - 1] = StructLib.Ccy({
                    id: ctd._ct_Ccy[ccyTypeId].id,
                  name: ctd._ct_Ccy[ccyTypeId].name,
                  unit: ctd._ct_Ccy[ccyTypeId].unit,
              decimals: ctd._ct_Ccy[ccyTypeId].decimals
            });
        }
        // Certik: CLL-04 | Explicitly returning local variable
        // Resolved (AD): Refactored to remove the local variable declaration and explicit return statement in order to reduce the overall cost of gas
        ccys = StructLib.GetCcyTypesReturn({
            ccyTypes: ccyTypes
        });
    }

    // FUND & WITHDRAW
    function fundOrWithdraw(
        StructLib.LedgerStruct storage   ld,
        StructLib.CcyTypesStruct storage ctd,
        StructLib.FundWithdrawType       direction,
        uint256                          ccyTypeId,
        int256                           amount,
        address                          ledgerOwner,
        string                           calldata desc)
    public  {
        if (direction == StructLib.FundWithdrawType.FUND) {
            fund(ld, ctd, ccyTypeId, amount, ledgerOwner, desc);
        }
        else if (direction == StructLib.FundWithdrawType.WITHDRAW) {
            withdraw(ld, ctd, ccyTypeId, amount, ledgerOwner, desc);
        }
        else revert("Bad direction");
    }

    function fund(
        StructLib.LedgerStruct storage   ld,
        StructLib.CcyTypesStruct storage ctd,
        uint256                          ccyTypeId,
        int256                           amount, // signed value: ledger supports -ve balances
        address                          ledgerOwner,
        string                           calldata desc)
    private {
        // allow funding while not sealed - for initialization of owner ledger (see testSetupContract.js)
        //require(ld._contractSealed, "Contract is not sealed");
        require(ccyTypeId >= 1 && ccyTypeId <= ctd._ct_Count, "Bad ccyTypeId");
        require(amount >= 0, "Bad amount"); // allow funding zero (initializes empty ledger entry), disallow negative funding

        // we keep amount as signed value - ledger allows -ve balances (currently unused capability)
        //uint256 fundAmount = uint256(amount);

        // create ledger entry as required
        StructLib.initLedgerIfNew(ld, ledgerOwner);

        // update ledger balance
        ld._ledger[ledgerOwner].ccyType_balance[ccyTypeId] += amount;

        emit CcyFundedLedger(ccyTypeId, ledgerOwner, amount, desc);
    }

    function withdraw(
        StructLib.LedgerStruct storage   ld,
        StructLib.CcyTypesStruct storage ctd,
        uint256                          ccyTypeId,
        int256                           amount,
        address                          ledgerOwner,
        string                           calldata desc)
    private {
        require(ld._contractSealed, "Contract is not sealed");
        require(ccyTypeId >= 1 && ccyTypeId <= ctd._ct_Count, "Bad ccyTypeId");
        require(amount > 0, "Bad amount");
        // Certik: CLL-06 | Comparison with literal true
        // Resolved (AD): Substituted the literal true comparison with the expression itself
        require(ld._ledger[ledgerOwner].exists, "Bad ledgerOwner");

        require((ld._ledger[ledgerOwner].ccyType_balance[ccyTypeId] - ld._ledger[ledgerOwner].ccyType_reserved[ccyTypeId]) >= amount, "Insufficient balance");

        // update ledger balance
        ld._ledger[ledgerOwner].ccyType_balance[ccyTypeId] -= amount;

        // update global total withdrawn
        // 24k
        //ld._ccyType_totalWithdrawn[ccyTypeId] += uint256(amount);

        emit CcyWithdrewLedger(ccyTypeId, ledgerOwner, amount, desc);
    }
}

