pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";
import "./TransferLib.sol";

library Erc20Lib {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // WHITELIST - add [single]
    function whitelist(StructLib.LedgerStruct storage ld, StructLib.Erc20Struct storage erc20d, address addr) public {
        require(!erc20d._whitelisted[addr], "Already whitelisted");
        require(!ld._contractSealed, "Contract is sealed");
        erc20d._whitelist.push(addr);
        erc20d._whitelisted[addr] = true;
    }
    // WHITELIST - get next, and advance current index [single]
    function getWhitelistNext(StructLib.LedgerStruct storage ld, StructLib.Erc20Struct storage erc20d) public view returns (address) {
        require(ld._contractSealed, "Contract is not sealed");
        require(erc20d._nextWhitelistNdx < erc20d._whitelist.length, "Insufficient whitelist entries");
        return erc20d._whitelist[erc20d._nextWhitelistNdx];
    }
    function incWhitelistNext(StructLib.LedgerStruct storage ld, StructLib.Erc20Struct storage erc20d) public {
        require(ld._contractSealed, "Contract is not sealed");
        require(erc20d._nextWhitelistNdx < erc20d._whitelist.length, "Insufficient whitelist entries");
        erc20d._nextWhitelistNdx++;
    }

    // TRANSFER
    function transfer(
        StructLib.LedgerStruct storage ld,
        StructLib.StTypesStruct storage std,
        StructLib.CcyTypesStruct storage ctd,
        StructLib.FeeStruct storage globalFees, address owner, // fees: disabled for erc20 - not used
        address recipient, uint256 amount
    ) public returns (bool) {
        require(ld._contractSealed, "Contract is not sealed");

        uint256 remainingToTransfer = amount;
        while (remainingToTransfer > 0) {
            // iterate ST types
            for (uint256 tokenTypeId = 1; tokenTypeId <= std._tt_Count; tokenTypeId++) {

                // sum qty tokens of this type
                uint256[] memory tokenType_stIds = ld._ledger[msg.sender].tokenType_stIds[tokenTypeId];
                uint256 qtyType;
                for (uint256 ndx = 0; ndx < tokenType_stIds.length; ndx++) {
                    require(ld._sts[tokenType_stIds[ndx]].currentQty > 0, "Unexpected token quantity");
                    qtyType += uint256(ld._sts[tokenType_stIds[ndx]].currentQty);
                }

                // transfer this type up to required amount
                uint256 qtyTransfer = remainingToTransfer >= qtyType ? qtyType : remainingToTransfer;

                if (qtyTransfer > 0) {
                    StructLib.TransferArgs memory a = StructLib.TransferArgs({
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
                    TransferLib.transferOrTrade(ld, ctd, globalFees, a);
                    remainingToTransfer -= qtyTransfer;
                }
            }
        }
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }
}