pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "../Interfaces/StructLib.sol";

/**
 * @notice Public views
 */
contract IPublicViews {

//
// IStTransferable
//
    /**
     * @notice Returns a keccak256 hash of all contract data
     * @dev Contract owner's ledger entry and its whitelist entry are excluded from the hash calculation; they are expected to change across contract upgrades
     */
    function getLedgerHashcode() external view returns (bytes32);

    /**
     * @notice Returns a fee preview for the supplied transfer
     * @param a StructLib.TransferArgs arguments
     * @return Exchange fees at index 0, batch originator fees at subsequent indexes
     */
    uint256 constant MAX_BATCHES_PREVIEW = 128; // library constants not accessible in contract; must duplicate TransferLib value
    function transfer_feePreview(StructLib.TransferArgs calldata a)
    external view returns (StructLib.FeesCalc[1 + MAX_BATCHES_PREVIEW * 2] memory feesAll);

//
// IStPayable
//
    /**
     * @notice Returns current BTC/USD rate according to Chainlink reference data contract
     */
    function get_btcUsd() public/*called internally*/ view returns(int256);

    /**
     * @notice Returns current ETH/USD rate according to Chainlink reference data contract
     */
    function get_ethUsd() public/*called internally*/ view returns(int256);

    /**
     * @notice Returns cashflow data
     */
    function getCashflowData() public/*called internally*/ view returns(StructLib.CashflowStruct memory);

//
// IStMaster
//
    /**
     * @notice Contract version
     */
    function version() external view returns (string memory);

    /**
     * @notice The security token unit name, e.g. "TONS" or carbon, "Token" for generic CFT tokens
     */
    function unit() external view returns (string memory);

    /**
     * @notice Returns the contract type: COMMODITY (0) or CASHFLOW (1)
     */
    function getContractType() external view returns(StructLib.ContractType);

    /**
     * @notice Returns whether or not the contract is sealed
     */
    function getContractSeal() external view returns (bool);

//
// IStLedger
//
    /**
     * @notice Returns current token types
     */
    function getSecTokenTypes() external view returns (StructLib.GetSecTokenTypesReturn memory);

    /**
     * @notice Returns all account addresses in the ledger
     */
    function getLedgerOwners() external view returns (address[] memory);

    /**
     * @notice Returns a single account address in the ledger
     */
    function getLedgerOwnerCount() external view returns (uint256);

    /**
     * @notice Returns a single account address in the ledger
     */
    function getLedgerOwner(uint256 index) external view returns (address);

    /**
     * @notice Returns the ledger entry for a single account
     */
    function getLedgerEntry(address account) external view returns (StructLib.LedgerReturn memory);

    /**
     * @notice Returns a token by ID
     */
    function getSecToken(uint256 id) external view returns (StructLib.SecTokenReturn memory);

    /**
     * @notice Returns the global token batch count
     */
    function getSecTokenBatchCount() external view returns (uint256);

    /**
     * @notice Returns a token batch by ID
     */
    function getSecTokenBatch(uint256 batchId) external view returns (StructLib.SecTokenBatch memory);

//
// IOwned
//
    /**
     * @notice Returns the current read-only contract state
     */
    function readOnly() external view returns (bool);

//
// IErc20
//
    /**
     * @notice Returns the token's name
     */
    function name() external view returns (string memory);

    /**
     * @notice Returns the token's symbol
     */
     function symbol() external view returns (string memory);

    /**
     * @notice Returns the number of decimals to divide by when displaying the token's balance
     */
     function decimals() external view returns (uint8);

    /**
     * @notice Returns the total minted supply of the token
     */
    function totalSupply() external view returns (uint256);

    /**
     * @notice Returns the token balance for the supplied address
     */
    function balanceOf(address account) external view returns (uint256);

//
// ICcyCollateralizable
//
    /**
     * @notice Returns the current currency types
     */
    function getCcyTypes() external view returns (StructLib.GetCcyTypesReturn memory);
}