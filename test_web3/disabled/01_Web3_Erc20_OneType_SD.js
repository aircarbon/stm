const assert = require('assert');
//const acmJson = require('../build/contracts/StMaster.json');
//const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const { db } = require('../../common/dist');
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

const SCOOP_TESTNETS_1 = "0x8443b1edf203f96d1a5ec98301cfebc4d3cf2b20";
const SCOOP_TESTNETS_2 = "0xe4f1925fba6cbf65c81dc8d25163c899f14cd6c1";

<<<<<<< HEAD:packages/erc20/test_web3/disabled/01_Web3_Erc20_OneType_SD.js
const SINGDAX_DOM10_1 = "0xb67762628da0fbeb4793bd54a9e09d1dfd4cb08d";
const SINGDAX_DOM10_2 = "0xa822b9557bc78d44bd89e22c4e59521e0bc2506f";
=======
const AIRCARBON_DOM10_1 = "0x3bf2a66c7057bc3737b5e6a7c0bc39b41437ffb8";
const AIRCARBON_DOM10_2 = "0x3b9a2f8c123efbd9919e0903c994efae15cf78ef";
>>>>>>> 56dfe7587b4b74f17cb5bc8714a8fb9911760224:packages/erc20/test_web3/01_Web3_Erc20_OneType_AC.js

describe(`Contract Web3 Interface`, async () => {

    //
    // can run these to test web3 more quickly, e.g.
    //         Dev: ("export WEB3_NETWORK_ID=888 && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 9120000 --exit")
    //  Ropsten AC: ("export WEB3_NETWORK_ID=3 && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 9120000 --exit")
    //

    before(async function () {
        var x;
        x = await CONST.getAccountAndKey(OWNER_NDX);
        OWNER = x.addr; OWNER_privKey = x.privKey;

        x = await CONST.getAccountAndKey(WHITE_NDX);
        WHITE = x.addr; WHITE_privKey = x.privKey;

        x = await CONST.getAccountAndKey(GRAY_1_NDX);
        GRAY_1 = x.addr; GRAY_1_privKey = x.privKey;

        x = await CONST.getAccountAndKey(GRAY_2_NDX);
        GRAY_2 = x.addr; GRAY_2_privKey = x.privKey;

        //setup - whitelist A, mint for A, transferOrTrade A -> GRAY_1
        try {
            const whitelistTx = await CONST.web3_tx('whitelist', [ WHITE ], OWNER, OWNER_privKey);
        } catch(ex) {
            // swallow - ropsten doesn't include the revert msg
            //if (ex.toString().includes("Already whitelisted")) console.log('(already whitelisted - nop)');
            //else throw(ex);
        }
        const sealedStatus = await CONST.web3_call('getContractSeal', []);
        if (!sealedStatus) {
            const sealTx = await CONST.web3_tx('sealContract', [], OWNER, OWNER_privKey);
        }

        // setup - mint for A -- CASHFLOW v1: only one minting (single issuance)
        try {
            const mintTx = await CONST.web3_tx('mintSecTokenBatch', [
                1,    100000, 1,      WHITE, CONST.nullFees, [], [],
            ], OWNER, OWNER_privKey);

            // transferOrTrade A -> GRAY_1
            const transferTradeTx = await CONST.web3_tx('transferOrTrade', [ {
                    ledger_A: WHITE,                               ledger_B: GRAY_1,
                       qty_A: 100000,                         tokenTypeId_A: 1,
                       qty_B: 0,                              tokenTypeId_B: 0,
                ccy_amount_A: 0,                                ccyTypeId_A: 0,
                ccy_amount_B: 0,                                ccyTypeId_B: 0,
                   applyFees: false,
                feeAddrOwner: CONST.nullAddr
            }], OWNER, OWNER_privKey);
        } catch(ex) {}

        // setup - fund GRAY_1 eth
<<<<<<< HEAD:packages/erc20/test_web3/disabled/01_Web3_Erc20_OneType_SD.js
        //const fundTx = await CONST.web3_sendEthTestAddr(0, GRAY_1, "0.1");
=======
        const fundTx = await CONST.web3_sendEthTestAddr(0, GRAY_1, "0.05");
>>>>>>> 56dfe7587b4b74f17cb5bc8714a8fb9911760224:packages/erc20/test_web3/01_Web3_Erc20_OneType_AC.js
    });

    it(`web3 direct - erc20 - should be able to send single token type from graylist addr to external wallet (erc20 => erc20)`, async () => {
        //await CONST.web3_tx('transfer', [ SCOOP_TESTNETS_1, "1" ], GRAY_1, GRAY_1_privKey);

        await CONST.web3_tx('transfer', [ SINGDAX_DOM10_1,  "1" ], GRAY_1, GRAY_1_privKey, false);
        await CONST.web3_sendEthTestAddr(0, SINGDAX_DOM10_1, "0.01");

        await CONST.web3_tx('transfer', [ SINGDAX_DOM10_1,  "2" ], GRAY_1, GRAY_1_privKey, false);
        await CONST.web3_sendEthTestAddr(0, SINGDAX_DOM10_1, "0.02");

        await CONST.web3_tx('transfer', [ SINGDAX_DOM10_1,  "3" ], GRAY_1, GRAY_1_privKey, false);
        await CONST.web3_sendEthTestAddr(0, SINGDAX_DOM10_1, "0.03");

<<<<<<< HEAD:packages/erc20/test_web3/disabled/01_Web3_Erc20_OneType_SD.js
        await CONST.web3_tx('transfer', [ SINGDAX_DOM10_1,  "4" ], GRAY_1, GRAY_1_privKey, false);
        await CONST.web3_sendEthTestAddr(0, SINGDAX_DOM10_1, "0.04");
        
        await CONST.web3_tx('transfer', [ SINGDAX_DOM10_1,  "5" ], GRAY_1, GRAY_1_privKey, false);
        await CONST.web3_sendEthTestAddr(0, SINGDAX_DOM10_1, "0.05");
=======
        //await CONST.web3_tx('transfer', [ SCOOP_TESTNETS_1,  "50000" ], GRAY_1, GRAY_1_privKey);
        await CONST.web3_tx('transfer', [ AIRCARBON_DOM10_1, "25000" ], GRAY_1, GRAY_1_privKey);
        await CONST.web3_tx('transfer', [ AIRCARBON_DOM10_2, "25000" ], GRAY_1, GRAY_1_privKey);
        await CONST.web3_sendEthTestAddr(0, AIRCARBON_DOM10_1, "0.05");
        await CONST.web3_sendEthTestAddr(0, AIRCARBON_DOM10_2, "0.05");
>>>>>>> 56dfe7587b4b74f17cb5bc8714a8fb9911760224:packages/erc20/test_web3/01_Web3_Erc20_OneType_AC.js

        //await CONST.web3_tx('transfer', [ SINGDAX_DOM10_1,  "1" ], GRAY_1, GRAY_1_privKey);
        //await CONST.web3_sendEthTestAddr(0, SINGDAX_DOM10_1, "0.05");
        
        //await CONST.web3_tx('transfer', [ SINGDAX_DOM10_2,  "1" ], GRAY_1, GRAY_1_privKey);
        //await CONST.web3_sendEthTestAddr(0, SINGDAX_DOM10_2, "0.05");

        //await CONST.web3_tx('transfer', [ SINGDAX_DOM10_2,  "1" ], GRAY_1, GRAY_1_privKey);
    });
   
    // it(`web3 direct - erc20 - should be able to send from graylist addr to whitelist addr (DEPOSIT: erc20 => exchange)`, async () => {
    //     // var le;
    //     // le = await CONST.web3_call('getLedgerEntry', [ GRAY_1 ]);
    //     // le.tokens.forEach(p => {
    //     //     console.log(`stId: ${p.stId} batchId: ${p.batchId} currentQty: ${p.currentQty.toString()}`);
    //     // });

    //     // const whitelistTx = await CONST.web3_tx('whitelist', [ GRAY_1 ], OWNER, OWNER_privKey);
    //     // const trade = await CONST.web3_tx('transferOrTrade', [ { 
    //     //             ledger_A: GRAY_1,                              ledger_B: WHITE,
    //     //                qty_A: 0001,                           tokenTypeId_A: CONST.tokenType.VCS,
    //     //                qty_B: 0,                              tokenTypeId_B: 0,
    //     //         ccy_amount_A: 0,                                ccyTypeId_A: 0,
    //     //         ccy_amount_B: 0,                                ccyTypeId_B: 0,
    //     //            applyFees: false,
    //     //         feeAddrOwner: CONST.nullAddr
    //     // }], OWNER, OWNER_privKey);
    //     // console.log('trade', trade);

    //     const erc20 = await CONST.web3_tx('transfer', [ WHITE, "1000" ], GRAY_1, GRAY_1_privKey);
    //     CONST.logGas(erc20, 'erc20 1 type, 1 batch');
    // });
});

  