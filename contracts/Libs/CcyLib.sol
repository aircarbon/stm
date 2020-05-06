pragma solidity >=0.4.21 <=0.6.6;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

library CcyLib {
    event AddedCcyType(uint256 id, string name, string unit);
    event CcyFundedLedger(uint256 ccyTypeId, address indexed to, int256 amount);
    event CcyWithdrewLedger(uint256 ccyTypeId, address indexed from, int256 amount);

    // CCY TYPES
    function addCcyType(
        StructLib.LedgerStruct storage ld,
        StructLib.CcyTypesStruct storage ctd,
        string memory name,
        string memory unit,
        uint16 decimals)
    public {
        require(ld.contractType == StructLib.ContractType.COMMODITY ||
               (ld.contractType == StructLib.ContractType.CASHFLOW && ctd._ct_Count == 0), "Bad cashflow request"); // only allow single ccy-type for cashflow contract
        require(ctd._ct_Count < 32/*MAX_CCYS*/, "Too many currencies");

        for (uint256 ccyTypeId = 1; ccyTypeId <= ctd._ct_Count; ccyTypeId++) {
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
    returns (StructLib.GetCcyTypesReturn memory) {
        StructLib.Ccy[] memory ccyTypes;
        ccyTypes = new StructLib.Ccy[](ctd._ct_Count);

        for (uint256 ccyTypeId = 1; ccyTypeId <= ctd._ct_Count; ccyTypeId++) {
            ccyTypes[ccyTypeId - 1] = StructLib.Ccy({
                    id: ctd._ct_Ccy[ccyTypeId].id,
                  name: ctd._ct_Ccy[ccyTypeId].name,
                  unit: ctd._ct_Ccy[ccyTypeId].unit,
              decimals: ctd._ct_Ccy[ccyTypeId].decimals
            });
        }

        StructLib.GetCcyTypesReturn memory ret = StructLib.GetCcyTypesReturn({
            ccyTypes: ccyTypes
        });
        return ret;
    }

    // FUNDING
    function fund(
        StructLib.LedgerStruct storage   ld,
        StructLib.CcyTypesStruct storage ctd,
        uint256 ccyTypeId,
        int256  amount, // signed value: ledger supports -ve balances
        address ledgerOwner)
    public {
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

        // update global total funded
        // 24k
        //ld._ccyType_totalFunded[ccyTypeId] += uint256(amount);

        emit CcyFundedLedger(ccyTypeId, ledgerOwner, amount);
    }

    // WITHDRAWING
    function withdraw(
        StructLib.LedgerStruct storage   ld,
        StructLib.CcyTypesStruct storage ctd,
        uint256 ccyTypeId,
        int256  amount,
        address ledgerOwner)
    public {
        require(ld._contractSealed, "Contract is not sealed");
        require(ccyTypeId >= 1 && ccyTypeId <= ctd._ct_Count, "Bad ccyTypeId");
        require(amount > 0, "Bad amount");
        require(ld._ledger[ledgerOwner].exists == true, "Bad ledgerOwner");

        require((ld._ledger[ledgerOwner].ccyType_balance[ccyTypeId] - ld._ledger[ledgerOwner].ccyType_reserved[ccyTypeId]) >= amount, "Insufficient balance");

        // update ledger balance
        ld._ledger[ledgerOwner].ccyType_balance[ccyTypeId] -= amount;

        // update global total withdrawn
        // 24k
        //ld._ccyType_totalWithdrawn[ccyTypeId] += uint256(amount);

        emit CcyWithdrewLedger(ccyTypeId, ledgerOwner, amount);
    }
}

