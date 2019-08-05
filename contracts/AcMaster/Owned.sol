pragma solidity 0.5.8;

contract Owned {
    address payable owner;

    constructor() public {
        owner = msg.sender;
    }
}
