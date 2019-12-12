pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./StructLib.sol";
import "./TransferLib.sol";

library Erc20Lib {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // WHITELIST
    function whitelist(StructLib.Erc20Struct storage erc20Data, address addr) public {
        require(!erc20Data._whitelisted[addr], "Already whitelisted");
        require(!erc20Data._whitelistClosed, "Whitelist sealed");
        erc20Data._whitelist.push(addr);
        erc20Data._whitelisted[addr] = true;
    }
    function seal(StructLib.Erc20Struct storage erc20Data) public {
        erc20Data._whitelistClosed = true;
    }

    // TRANSFER
    // struct Erc20TransferLibArgs {
    //     StructLib.LedgerStruct  ledgerData;
    //     StructLib.StTypesStruct  stTypesData;
    //     StructLib.CcyTypesStruct  ccyTypesData;
    //     StructLib.Erc20Struct  erc20Data;
    //     StructLib.FeeStruct  globalFees;
    //     address owner; // fees: disabled for erc20 - not used
    //     address recipient;
    //     uint256 amount;
    // }
    function transfer(
        StructLib.LedgerStruct storage ledgerData,
        StructLib.StTypesStruct storage stTypesData,
        StructLib.FeeStruct storage globalFees, address owner, // fees: disabled for erc20 - not used
        address recipient, uint256 amount
    ) public returns (bool) {

        uint256 remainingToTransfer = amount;
        while (remainingToTransfer > 0) {
            for (uint256 tokenTypeId = 1; tokenTypeId <= stTypesData._count_tokenTypes; tokenTypeId++) {

                // sum qty tokens of this type
                uint256[] memory tokenType_stIds = ledgerData._ledger[msg.sender].tokenType_stIds[tokenTypeId];
                uint256 qtyType;
                for (uint256 ndx = 0; ndx < tokenType_stIds.length; ndx++) {
                    qtyType += ledgerData._sts[tokenType_stIds[ndx]].currentQty;
                }

                // transfer
                uint256 qtyTransfer = qtyType <= remainingToTransfer ? qtyType : remainingToTransfer;
                TransferLib.TransferArgs memory a = TransferLib.TransferArgs({
                        ledger_A: msg.sender,
                        ledger_B: recipient,
                           qty_A: qtyTransfer,
                   tokenTypeId_A: tokenTypeId,
                           qty_B: 0,
                   tokenTypeId_B: 0,
                    ccy_amount_A: 0,
                     ccyTypeId_A: 0,
                    ccy_amount_B: 0,
                     ccyTypeId_B: 0,
                       applyFees: false,
                    feeAddrOwner: owner
                });
                TransferLib.transferOrTrade(ledgerData, globalFees, a);
                remainingToTransfer -= qtyType;
            }
        }
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }
}