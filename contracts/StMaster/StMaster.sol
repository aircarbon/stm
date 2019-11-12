pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./StMintable.sol";
import "./StBurnable.sol";
import "./CcyFundable.sol";
import "./CcyWithdrawable.sol";
import "./StTransferable.sol";

contract StMaster is StMintable, StBurnable, CcyFundable, CcyWithdrawable, StTransferable {
    string public name;
    string public version;

    string public unit; // the smallest (integer, non-divisible) security token unit, e.g. "KG"

    function getName() external view returns (string memory) { return name; }
    function getVersion() external view returns (string memory) { return version; }
    function getUnit() external view returns (string memory) { return unit; }

    /**
     * ctor
     */
    constructor() public {
        // params - global
        name = "SecTok_Master";
        version = "0.3";
        unit = "KG";

        // params - token types
        _tokenTypeNames[0] = 'CER - UNFCCC - Certified Emission Reduction';
        _tokenTypeNames[1] = 'VCS - VERRA - Verified Carbon Standard';
        _count_tokenTypes = 2;

        // params - currency types
        _ccyTypes[0] = Ccy({ id: 0, name: 'SGD', unit: 'cents' });
        _ccyTypes[1] = Ccy({ id: 1, name: 'ETH', unit: 'Wei'   });
        _count_ccyTypes = 2;
    
         // create ledger entry for contract owner - transfer fees are paid to this ledger entry
        _ledger[owner] = Ledger({
            exists: true
        });
        _ledgerOwners.push(owner);
    }
}
