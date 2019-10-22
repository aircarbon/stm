pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./SecTokenMintable.sol";
import "./SecTokenBurnable.sol";
import "./CcyFundable.sol";
import "./CcyWithdrawable.sol";
import "./SecTokenTransferable.sol";

contract StMaster is SecTokenMintable, SecTokenBurnable, CcyFundable, CcyWithdrawable, SecTokenTransferable {
    string public name;
    string public version;
    
    string public unit; // the smallest (integer, non-divisible) security token unit, e.g. "KG"

    /**
     * ctor
     */
    constructor() public {
        // params - global
        name = "SecTok_Master";
        version = "0.2";
        unit = "KG";

        // params - token types
        _tokenTypeNames[0] = 'CER - UNFCCC - Certified Emission Reduction';
        _tokenTypeNames[1] = 'VCS - VERRA - Verified Carbon Standard';
        _count_tokenTypes = 2;

        // params - currency types
        _ccyTypes[0] = Ccy({ id: 0, name: 'USD', unit: 'cents' });
        _ccyTypes[1] = Ccy({ id: 1, name: 'ETH', unit: 'Wei'   });
        _count_ccyTypes = 2;

         // create ledger entry for contract owner - transfer fees are paid to this ledger entry
        _ledger[owner] = Ledger({
            exists: true
        });
        _ledgerOwners.push(owner);
    }
}
