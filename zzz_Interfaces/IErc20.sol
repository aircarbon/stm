pragma solidity >=0.4.21 <=0.6.10;

/**
 * @notice Partial ERC20
 */
interface IErc20 {

    // /**
    //  * @notice Returns the token's name
    //  */
    // function name() external view returns (string memory);

    // /**
    //  * @notice Returns the token's symbol
    //  */
    //  function symbol() external view returns (string memory);

    // /**
    //  * @notice Returns the number of decimals to divide by when displaying the token's balance
    //  */
    //  function decimals() external view returns (uint8);

    // /**
    //  * @notice Returns the total minted supply of the token
    //  */
    // function totalSupply() external view returns (uint256);

    // /**
    //  * @notice Returns the token balance for the supplied address
    //  */
    // function balanceOf(address account) external view returns (uint256);

    /**
     * @notice Emitted when `value` tokens are moved from one account (`from`) to another (`to`)
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by a call to {approve}. `value` is the new allowance
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @notice Transfers the supplied number of tokens from the caller to the supplied `recipient`
     * @dev `value` may be zero
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    // APPROVALS -- TODO/NOP: see https://docs.google.com/document/d/1YLPtQxZu1UAvO9cZ1O2RPXBbT0mooh4DYKjA_jp-RLM/edit
    // function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    // function allowance(address owner, address spender) external view returns (uint256);
    // function approve(address spender, uint256 amount) external returns (bool);
}