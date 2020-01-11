pragma solidity ^0.5.13;

contract Owned {
    address payable owner;
    bool public readOnly;

    constructor() public {
        owner = msg.sender;
        readOnly = false;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Restricted");
        _; // required magic
    }
    modifier onlyWhenReadWrite() {
        require(readOnly == false, "Read-only");
        _;
    }
    // modifier onlyWhenReadOnly() {
    //     require(readOnly == true, "Set to read-only first");
    //     _;
    // }

    /**
     * @dev Sets the contract-wide read only state
     * @param _readOnly State to set
     */
    function setReadOnly(bool _readOnly)
    public onlyOwner() {
        readOnly = _readOnly;
    }
}
