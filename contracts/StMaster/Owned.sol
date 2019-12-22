pragma solidity 0.5.13;

contract Owned {
    address payable owner;
    bool _readOnly;

    constructor() public {
        owner = msg.sender;
        _readOnly = false;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Restricted");
        _; // required magic
    }
    modifier onlyWhenReadWrite() {
        require(_readOnly == false, "Read-only");
        _;
    }
    // modifier onlyWhenReadOnly() {
    //     require(_readOnly == true, "Set to read-only first");
    //     _;
    // }

    /**
     * @dev Sets the contract-wide read only state
     * @param readOnly State to set
     */
    function setReadOnly(bool readOnly)
    public onlyOwner() {
        _readOnly = readOnly;
    }
}
