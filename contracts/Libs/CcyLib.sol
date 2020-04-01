pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

library CcyLib {
    event AddedCcyType(uint256 id, string name, string unit);
    event CcyFundedLedger(uint256 ccyTypeId, address indexed ledgerOwner, int256 amount);
    event CcyWithdrewLedger(uint256 ccyTypeId, address indexed ledgerOwner, int256 amount);

    // CCY TYPES
    function addCcyType(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CcyTypesStruct storage ccyTypesData,
        string memory name,
        string memory unit,
        uint16 decimals)
    public {
        require(ledgerData.contractType == StructLib.ContractType.COMMODITY, "Bad cashflow request");

        for (uint256 ccyTypeId = 1; ccyTypeId <= ccyTypesData._ct_Count; ccyTypeId++) {
            require(keccak256(abi.encodePacked(ccyTypesData._ct_Ccy[ccyTypeId].name)) != keccak256(abi.encodePacked(name)),
                    "Currency type name already exists");
        }

        ccyTypesData._ct_Count++;
        ccyTypesData._ct_Ccy[ccyTypesData._ct_Count] = StructLib.Ccy({
              id: ccyTypesData._ct_Count,
            name: name,
            unit: unit,
        decimals: decimals
        });
        emit AddedCcyType(ccyTypesData._ct_Count, name, unit);
    }

    function getCcyTypes(
        StructLib.CcyTypesStruct storage ccyTypesData)
    public view
    returns (StructLib.GetCcyTypesReturn memory) {
        StructLib.Ccy[] memory ccyTypes;
        ccyTypes = new StructLib.Ccy[](ccyTypesData._ct_Count);

        for (uint256 ccyTypeId = 1; ccyTypeId <= ccyTypesData._ct_Count; ccyTypeId++) {
            ccyTypes[ccyTypeId - 1] = StructLib.Ccy({
                    id: ccyTypesData._ct_Ccy[ccyTypeId].id,
                  name: ccyTypesData._ct_Ccy[ccyTypeId].name,
                  unit: ccyTypesData._ct_Ccy[ccyTypeId].unit,
              decimals: ccyTypesData._ct_Ccy[ccyTypeId].decimals
            });
        }

        StructLib.GetCcyTypesReturn memory ret = StructLib.GetCcyTypesReturn({
            ccyTypes: ccyTypes
        });
        return ret;
    }

    // FUNDING
    function fund(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CcyTypesStruct storage ccyTypesData,
        uint256 ccyTypeId,
        int256  amount, // signed value: ledger ccyType_balance supports (theoretical) -ve balances
        address ledgerOwner)
    public {
        require(ledgerData._contractSealed, "Contract is not sealed");
        require(ccyTypeId >= 1 && ccyTypeId <= ccyTypesData._ct_Count, "Bad ccyTypeId");
        require(amount >= 0, "Min. amount 1"); // allow funding zero (initializes empty ledger entry), disallow negative funding

        // we keep amount as signed value - ledger allows -ve balances (currently unused capability)
        //uint256 fundAmount = uint256(amount);

        // create ledger entry as required
        StructLib.initLedgerIfNew(ledgerData, ledgerOwner);
        // if (ledgerData._ledger[ledgerOwner].exists == false) {
        //     ledgerData._ledger[ledgerOwner] = StructLib.Ledger({
        //               exists: true,
        //           customFees: StructLib.FeeStruct()
        //     });
        //     ledgerData._ledgerOwners.push(ledgerOwner);
        // }

        // update ledger balance
        ledgerData._ledger[ledgerOwner].ccyType_balance[ccyTypeId] += amount;

        // update global total funded
        ledgerData._ccyType_totalFunded[ccyTypeId] += uint256(amount);

        emit CcyFundedLedger(ccyTypeId, ledgerOwner, amount);
    }

    // WITHDRAWING
    function withdraw(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.CcyTypesStruct storage ccyTypesData,
        uint256 ccyTypeId,
        int256  amount, // signed value: ledger ccyType_balance supports (theoretical) -ve balances
        address ledgerOwner)
    public {
        require(ledgerData._contractSealed, "Contract is not sealed");
        require(ccyTypeId >= 1 && ccyTypeId <= ccyTypesData._ct_Count, "Bad ccyTypeId");
        require(amount > 0, "Min. amount 1"); // disallow negative withdrawing
        require(ledgerData._ledger[ledgerOwner].exists == true, "Bad ledgerOwner");
        require(ledgerData._ledger[ledgerOwner].ccyType_balance[ccyTypeId] >= amount, "Insufficient balance");

        // update ledger balance
        ledgerData._ledger[ledgerOwner].ccyType_balance[ccyTypeId] -= amount;

        // update global total withdrawn
        ledgerData._ccyType_totalWithdrawn[ccyTypeId] += uint256(amount);

        emit CcyWithdrewLedger(ccyTypeId, ledgerOwner, amount);
    }
}

