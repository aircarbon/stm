pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "./CcyFundable.sol";
import "./CcyWithdrawable.sol";
import "./StMintable.sol";
import "./StBurnable.sol";
import "./StTransferable.sol";
import "./StErc20.sol";
import "./StDataLoadable.sol";
import "./StPayable.sol";

import "../Libs/StructLib.sol";

contract StMaster is StMintable, StBurnable, CcyFundable, CcyWithdrawable, StTransferable, StDataLoadable {

    // contract properties
    string public name;
    string public version;
    string public unit; // the smallest (integer, non-divisible) security token unit, e.g. "KG"

    // events -- (hack: see: https://ethereum.stackexchange.com/questions/11137/watching-events-defined-in-libraries)
    // CcyLib events
    event AddedCcyType(uint256 id, string name, string unit);
    event CcyFundedLedger(uint256 ccyTypeId, address indexed ledgerOwner, int256 amount);
    event CcyWithdrewLedger(uint256 ccyTypeId, address indexed ledgerOwner, int256 amount);
    // TokenLib events
    event AddedSecTokenType(uint256 id, string name);
    event BurnedFullSecToken(uint256 indexed stId, uint256 tokenTypeId, address indexed ledgerOwner, uint256 burnedQty);
    event BurnedPartialSecToken(uint256 indexed stId, uint256 tokenTypeId, address indexed ledgerOwner, uint256 burnedQty);
    event MintedSecTokenBatch(uint256 indexed batchId, uint256 tokenTypeId, address indexed batchOwner, uint256 mintQty, uint256 mintSecTokenCount);
    event MintedSecToken(uint256 indexed stId, uint256 indexed batchId, uint256 tokenTypeId, address indexed ledgerOwner, uint256 mintedQty);
    event AddedBatchMetadata(uint256 indexed batchId, string key, string value);
    event SetBatchOriginatorFee(uint256 indexed batchId, StructLib.SetFeeArgs originatorFee);
    // TransferLib events
    enum TransferType { User, ExchangeFee, OriginatorFee }
    event TransferedLedgerCcy(address indexed from, address indexed to, uint256 ccyTypeId, uint256 amount, TransferType transferType);
    event TransferedFullSecToken(address indexed from, address indexed to, uint256 indexed stId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    event TransferedPartialSecToken(address indexed from, address indexed to, uint256 indexed splitFromSecTokenId, uint256 newSecTokenId, uint256 mergedToSecTokenId, uint256 qty, TransferType transferType);
    // FeeLib events
    event SetFeeTokFix(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_tokenQty_Fixed);
    event SetFeeCcyFix(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Fixed);
    event SetFeeTokBps(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_token_PercBips);
    event SetFeeCcyBps(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_PercBips);
    event SetFeeTokMin(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_token_Min);
    event SetFeeCcyMin(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Min);
    event SetFeeTokMax(uint256 tokenTypeId, address indexed ledgerOwner, uint256 fee_token_Max);
    event SetFeeCcyMax(uint256 ccyTypeId, address indexed ledgerOwner, uint256 fee_ccy_Max);
    // Erc20Lib events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    //
    // #### scp -- Uncaught (in promise) Error: Node error: {"code":-32000,"message":"gas required exceeds allowance (5000000) or always failing transaction"}
    //   (only form testnets --- could be nonce is wrong?)
    //      NEED TO SUPPORT SEND-TO-SELF ...
    //
    // #### scp -- slow load; correlates with ALL ERC20 ASSETS populating -- looks like all ETH TX's -- into the cache?!!?!
    //  >> receiving tx's for testnets sent from d+10, and not sent to testnets ...
    //  >> STALE SOCKET? hard repro 
    //  >> could put some guard in process path if addr is invalid?
    //
    // >>> scp -- test send erc20 commodity multi-type from wallet...
    //
    //
    // -- J 1+3 --
    // PRI 0 ** CASHFLOWS re. SD ** >>> MVP
    //
    //   >>> new deployer (or flag on deployer) > to deploy "CashFlowMaster" w/ other
    //    > done: limit batches=1 + limit StTypes=1
    //    > done: CashflowArgs in ctor(), display on web-admin
    //
    //    > SINGLE ISSUANCE / SINGLE SUBSCRIBER -- first payable received:
    //        > TODO: manual minting: switch IPFS default fields...
    //
    //        > require 1 batch minted (sits locked with issuer to start with) - return funds otherwise
    //        > issuer receives all from payable, minus fees
    //        > payer receives all tokens from issuer
    //
    //          TODO: could split this up later - issued batch has total ETH amount to buy all,
    //                and fractions thereof result in partial subscription - MULTI-SUBSCRIBER
    //          TODO: >1 batch minting (dilutes, due to pro-rata) - MULTI-ISSUANCE
    //
    //    > SUBSEQUENT PAYABLE
    //        > require: already subscribed
    //        > require: payer is issuer
    //        > pro-rata ledger owners
    //
    //    > before first payable received:
    //        > can ONLY mint (exactly once), batch sits with issuer (locked, effectively)
    //

    function getContractType() public view returns(StructLib.ContractType) { return ledgerData.contractType; }

    constructor(
        StructLib.ContractType contractType,
        StructLib.CashflowArgs memory cashflowArgs,
        string memory contractName,
        string memory contractVer,
        string memory contractUnit,
        string memory contractSymbol,
        uint8 contractDecimals
    ) StErc20(contractSymbol, contractDecimals)
    public {
        // set common properties
        name = contractName;
        version = contractVer;
        unit = contractUnit;

        // contract type
        ledgerData.contractType = contractType;
        cashflowData.args = cashflowArgs;

        // set token & ccy types
        if (contractType == StructLib.ContractType.COMMODITY) {
            stTypesData._tokenTypeNames[1] = 'CER - UNFCCC - Certified Emission Reduction';
            stTypesData._tokenTypeNames[2] = 'VCS - VERRA - Verified Carbon Standard';
            stTypesData._count_tokenTypes = 2;
            ccyTypesData._ccyTypes[1] = StructLib.Ccy({ id: 1, name: 'SGD', unit: 'cents',      decimals: 2 }); // gas: ~500k (!) for pre-populating these
            ccyTypesData._ccyTypes[2] = StructLib.Ccy({ id: 2, name: 'ETH', unit: 'Wei',        decimals: 18 });
            ccyTypesData._ccyTypes[3] = StructLib.Ccy({ id: 3, name: 'BTC', unit: 'Satoshi',    decimals: 8 });
            ccyTypesData._ccyTypes[4] = StructLib.Ccy({ id: 4, name: 'USD', unit: 'cents',      decimals: 2 });
            ccyTypesData._ccyTypes[5] = StructLib.Ccy({ id: 5, name: 'EUR', unit: 'euro cents', decimals: 2 });
            ccyTypesData._ccyTypes[6] = StructLib.Ccy({ id: 6, name: 'HKD', unit: 'cents',      decimals: 2 });
            ccyTypesData._ccyTypes[7] = StructLib.Ccy({ id: 7, name: 'GBP', unit: 'pence',      decimals: 2 });
            ccyTypesData._count_ccyTypes = 7;
        }
        else if (contractType == StructLib.ContractType.CASHFLOW) {
            stTypesData._tokenTypeNames[1] = contractName;
            stTypesData._count_tokenTypes = 1;
            ccyTypesData._ccyTypes[1] = StructLib.Ccy({ id: 1, name: 'ETH', unit: 'Wei',        decimals: 18 });
            ccyTypesData._count_ccyTypes = 1;
        }
        else revert('Bad contract type');

        // create ledger entry for contract owner - transfer fees are paid to this ledger entry
        ledgerData._ledger[owner] = StructLib.Ledger({
            exists: true,
        customFees: StructLib.FeeStruct()
        });
        ledgerData._ledgerOwners.push(owner);
    }

    //
    // -- LAUNCH LIST --
    //
    // ADMIN:
    //   > fee preview on transfer
    //   > batch fee on mint
    //   > explorer v1
    //   > all accounts[0] refs and privkey to move to config
    //   > [add ccy-type, add eeu-type (can run from truffle, not needed)]
    //
    // PROD AWS
    //   > me to setup, sole account
    //   > me to deploy (how much manual?)
    //   > me to set config
    //
    // SOL
    //   > TODO: bunch libs to reduce # of deployments needed
    //   > TODO: cleanup (SafeMath) + audit...
    //
    //   > todo: increase/finalize MAX_BATCHES_PREVIEW
    //   > todo: drop fee_fixed completely (it's == fee_min)
    //
    //   > todo: change internalTransfer so it can operate on *any* stTypeId... (???) > workaround is to mint only one type (VCS/UNFCCC can still be encoded in meta)
    //   > todo: ERC20 authorize() support (???)
    //
    // TODO: Thom - get ETH re. mainnet testing
    // (todo: infura - ropsten deployment)
    //    > CLEANUP: SafeMath...
    //
    // ====== MAINNET ======
    //
    // BONDING CURVES... can we use them?
    //
    // WITHDRAW FEES - (whitelist => erc20) - defer
    //
    // SPLITTING TX'S - defer
    //  ** fee-preview: returns enough data (qty?) for an orchestrator to split up a large multi-batch transfer TX into separate components?
    //    >> with MAX_BATCHES_PREVIEW exceeded ... change to more(bool) ... ?
    //  ** fee-preview: tests general / using it for splitting multi-batch transfers
    //

    /**
     * @dev Immutably seals the contract. Once sealed, no further whitelist entries can be added, and no bulk data load actions can be performed.
     */
    function sealContract() public {
        ledgerData._contractSealed = true;
    }
    function getContractSeal() external view returns (bool) {
        return ledgerData._contractSealed;
    }

    // TODO: for updateable libs - proxy dispatcher
    // https://blog.openzeppelin.com/proxy-libraries-in-solidity-79fbe4b970fd/
    // test lib...
    /*mapping(uint256 => St2x.SecTokenBatch) __batches;
    function call_st2() external returns (uint256) {
        //St2Interface st2 = St2Interface(addr_st2);

        //return St2x.name2();

        //St2x st2 = St2x(addr_st2);
        //st2.set_batch_id1(__batches);

        St2x.set_batch_id1(__batches);
        return __batches[42].tokenTypeId;

        // ## visibility problem...
        //st2.set_batch_id1(__batches);
        //st2.test(42);

        // ## __batches: "this type cannot be encoded" -- so still no way of passing in a mapping...
        //
        // this looks like the answer: https://ethereum.stackexchange.com/questions/6755/how-to-access-a-mapping-in-a-library
        // simplyify, repro just that struct { mapping (int,int) } call ....
        //
        //addr_st2.delegatecall(abi.encodePacked(bytes4(keccak256("set_batch_id1(mapping(uint256 => St2Interface.SecTokenBatch))")), __batches));

        //return st2.name2();
    }*/
}
