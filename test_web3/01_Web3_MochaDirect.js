const assert = require('assert');
//const acmJson = require('../build/contracts/StMaster.json');
//const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');

require('dotenv').config();

const CONST = require('../const.js');

const OWNER_NDX = 0;
const WHITE_NDX = 1;
const GRAY_1_NDX = 800;
const GRAY_2_NDX = 801;
var OWNER, OWNER_privKey;
var WHITE, WHITE_privKey;
var GRAY_1, GRAY_1_privKey;
var GRAY_2, GRAY_2_privKey;

describe('Contract Web3 Interface', async () => {

    //
    // can run these to test web3 more quickly, e.g.
    //      Dev: ("export NETWORK=development && mocha test_web3 --timeout 120000 --exit")
    //  Ropsten: ("export NETWORK=ropsten_ac && mocha test_web3 --timeout 120000 --exit")
    //

    before(async () => {
        var x;
        x = await CONST.getAccountAndKey(OWNER_NDX);
        OWNER = x.addr; OWNER_privKey = x.privKey;

        x = await CONST.getAccountAndKey(WHITE_NDX);
        WHITE = x.addr; WHITE_privKey = x.privKey;

        x = await CONST.getAccountAndKey(GRAY_1_NDX);
        GRAY_1 = x.addr; GRAY_1_privKey = x.privKey;

        x = await CONST.getAccountAndKey(GRAY_2_NDX);
        GRAY_2 = x.addr; GRAY_2_privKey = x.privKey;

        // // setup - whitelist A, mint for A, transferOrTrade A -> GRAY_1
        // try {
        //     const whitelistTx = await CONST.web3_tx('whitelist', [ WHITE ], OWNER, OWNER_privKey);
        // } catch(ex) {
        //     if (ex.toString().includes("Already whitelisted")) console.log('(already whitelisted - nop)');
        //     else throw(ex);
        // }

        // // setup - mint for A
        // for (var i=0 ; i < 10 ; i++) { // ## repro "excessive batches"
        //     const mintTx = await CONST.web3_tx('mintSecTokenBatch', [
        //         CONST.tokenType.VCS,    CONST.tonCarbon, 1,      WHITE, CONST.nullFees, [], [],
        //     ], OWNER, OWNER_privKey);

        //     // setup - transferOrTrade A -> GRAY_1
        //     const transferTradeTx = await CONST.web3_tx('transferOrTrade', [ {
        //             ledger_A: WHITE,                               ledger_B: GRAY_1,
        //                qty_A: CONST.tonCarbon,                tokenTypeId_A: CONST.tokenType.VCS,
        //                qty_B: 0,                              tokenTypeId_B: 0,
        //         ccy_amount_A: 0,                                ccyTypeId_A: 0,
        //         ccy_amount_B: 0,                                ccyTypeId_B: 0,
        //         applyFees: false,
        //         feeAddrOwner: CONST.nullAddr
        //     }], OWNER, OWNER_privKey);
        // }

        // // setup - fund GRAY_1 eth
        // const fundTx = await CONST.web3_sendEthTestAddr(0, GRAY_1_NDX, "0.1");
    });

    it('web3 direct - erc20 - should be able to send from graylist addr to whitelist addr (i.e. DEPOSIT: erc20 => exchange)', async () => {
        // var le;
        // le = await CONST.web3_call('getLedgerEntry', [ GRAY_1 ]);
        // le.tokens.forEach(p => {
        //     console.log(`stId: ${p.stId} batchId: ${p.batchId} currentQty: ${p.currentQty.toString()}`);
        // });

        // const whitelistTx = await CONST.web3_tx('whitelist', [ GRAY_1 ], OWNER, OWNER_privKey);
        // const trade = await CONST.web3_tx('transferOrTrade', [ { 
        //             ledger_A: GRAY_1,                              ledger_B: WHITE,
        //                qty_A: 0001,                           tokenTypeId_A: CONST.tokenType.VCS,
        //                qty_B: 0,                              tokenTypeId_B: 0,
        //         ccy_amount_A: 0,                                ccyTypeId_A: 0,
        //         ccy_amount_B: 0,                                ccyTypeId_B: 0,
        //            applyFees: false,
        //         feeAddrOwner: CONST.nullAddr
        // }], OWNER, OWNER_privKey);
        // console.log('trade', trade);

        const erc20 = await CONST.web3_tx('transfer', [ WHITE, "1000" ], GRAY_1, GRAY_1_privKey);
        console.log('erc20', erc20);
    });

    // TODO (DEFINITELY!) -- test sending across >1 type... (VCS & UNFCCC)

    // ##. ropsten: "insufficient data for uint256 type (arg="fee_tok_B", coderType="uint256", value="0x00000000")"
    // ?? expecting "insufficient funds"
    // it('web3 direct - erc20 - should be able to send from graylist addr to graylist addr (i.e. erc20 => erc20)', async () => {
    //     //...
    // });

    // it('web3 direct - misc - should be able to derive exchange whitelist addresses and private keys from the mnemonic phrase', async () => {
    //     const { addr: fromAddr, privKey: fromPrivKey } = await CONST.getAccountAndKey(0);
    //     const { addr: toAddr,   privKey: toPrivKey }   = await CONST.getAccountAndKey(1);
    //     assert(fromPrivKey == '0cf8f198ace6d2d92a2c1cd7f3fc9b42e2af3b7fd7e64371922cb73a81493c1a');
    // });

    // it('Should be able to send ETH from exchange whitelist addresses', async function(done) {
    //     const data = await CONST.web3_sendEthTestAddr(0, 1, "0.01");
    //     console.log('web3_sendEthTestAddr resolved:', data);
    //     //return CONST.web3_sendEthTestAddr(0, 1, "0.01");
    // });
});

  