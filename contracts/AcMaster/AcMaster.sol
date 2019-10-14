pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./EeuMintable.sol";
import "./EeuBurnable.sol";
import "./CcyFundable.sol";
import "./CcyWithdrawable.sol";
import "./EeuTransferable.sol";

contract AcMaster is EeuMintable, EeuBurnable, CcyFundable, CcyWithdrawable, EeuTransferable {
    string public version;

    /**
     * ctor
     */
    constructor() public {
        version = "0.1.0";

         // create ledger entry for contract owner - transfer fees are paid to this ledger entry
        _ledger[owner] = Ledger({
            exists: true
        });
        _ledgerOwners.push(owner);
    }

}
