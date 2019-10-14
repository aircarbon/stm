pragma solidity 0.5.8;

contract Owned {
    address payable owner;
    bool _readOnly;

    constructor() public {
        owner = msg.sender;
        _readOnly = false;
    }

    /**
     * @dev Sets the contract-wide read only state
     * @param readOnly State to set
     */
    function setReadOnly(bool readOnly) public {
        require(msg.sender == owner, "Restricted method");
        _readOnly = readOnly;
    }
}
