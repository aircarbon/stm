pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./EeuMintable.sol";
import "./EeuBurnable.sol";
import "./EeuTradable.sol";

contract AcMaster is EeuMintable, EeuBurnable, EeuTradable {
    string public version;

    /**
     * ctor
     */
    constructor() public {
        version = "0.0.4";

        // default EEU types
        _eeuTypeIds[0] = 'UNFCCC';
        _eeuTypeIds[1] = 'VCS';
        _count_eeuTypeIds = 2;
    }
}
