pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";

library CcyLib {
    event AddedCcyType(uint256 id, string name, string unit);
    event CcyFundedLedger(uint256 ccyTypeId, address ledgerOwner, int256 amount);
    event CcyWithdrewLedger(uint256 ccyTypeId, address ledgerOwner, int256 amount);

    // CCY TYPES
    function addCcyType(
        StructLib.CcyTypesStruct storage ccyTypesData,
        string memory name,
        string memory unit,
        uint16 decimals)
    public {
        for (uint256 ccyTypeId = 1; ccyTypeId <= ccyTypesData._count_ccyTypes; ccyTypeId++) {
            require(keccak256(abi.encodePacked(ccyTypesData._ccyTypes[ccyTypeId].name)) != keccak256(abi.encodePacked(name)),
                    "Currency type name already exists");
        }

        ccyTypesData._count_ccyTypes++;
        ccyTypesData._ccyTypes[ccyTypesData._count_ccyTypes] = StructLib.Ccy({
              id: ccyTypesData._count_ccyTypes,
            name: name,
            unit: unit,
        decimals: decimals
        });
        emit AddedCcyType(ccyTypesData._count_ccyTypes, name, unit);
    }

    function getCcyTypes(
        StructLib.CcyTypesStruct storage ccyTypesData)
    public view
    returns (StructLib.GetCcyTypesReturn memory) {
        StructLib.Ccy[] memory ccyTypes;
        ccyTypes = new StructLib.Ccy[](ccyTypesData._count_ccyTypes);

        for (uint256 ccyTypeId = 1; ccyTypeId <= ccyTypesData._count_ccyTypes; ccyTypeId++) {
            ccyTypes[ccyTypeId - 1] = StructLib.Ccy({
                    id: ccyTypesData._ccyTypes[ccyTypeId].id,
                  name: ccyTypesData._ccyTypes[ccyTypeId].name,
                  unit: ccyTypesData._ccyTypes[ccyTypeId].unit,
              decimals: ccyTypesData._ccyTypes[ccyTypeId].decimals
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
        require(ccyTypeId >= 1 && ccyTypeId <= ccyTypesData._count_ccyTypes, "Bad ccyTypeId");
        require(amount >= 0, "Min. amount 1"); // allow funding zero (initializes empty ledger entry), disallow negative funding

        // we keep amount as signed value - ledger allows -ve balances (currently unused capability)
        //uint256 fundAmount = uint256(amount);

        // create ledger entry as required
        if (ledgerData._ledger[ledgerOwner].exists == false) {
            ledgerData._ledger[ledgerOwner] = StructLib.Ledger({
                      exists: true,
                  customFees: StructLib.FeeStruct()
            });
            ledgerData._ledgerOwners.push(ledgerOwner);
        }

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
        require(ccyTypeId >= 1 && ccyTypeId <= ccyTypesData._count_ccyTypes, "Bad ccyTypeId");
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

