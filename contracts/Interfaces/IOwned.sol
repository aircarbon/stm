pragma solidity ^0.5.13;

/**
 * @notice Method modifiers & read-only state
 */
 contract IOwned {
    // /**
    //  * @notice Returns the current read-only contract state
    //  */
    // function readOnly() public returns (bool);

    /**
     * @notice Modifier for methods only available to the contract owner
     */
    modifier onlyOwner() {
        _; // "Not Implemented"
    }

    /**
     * @notice Modifier for methods only available when contract is not in read-only state
     */
    modifier onlyWhenReadWrite() {
        _; // "Not Implemented"
    }

    /**
     * @notice Sets the contract current read-only state
     */
    function setReadOnly(bool _readOnly) external onlyOwner() { revert("Not implemented"); }
}
