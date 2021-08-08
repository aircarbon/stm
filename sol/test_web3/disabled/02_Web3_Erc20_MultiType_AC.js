// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

const assert = require('assert');
//const acmJson = require('../build/contracts/StMaster.json');
//const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const  db  = require('../../orm/build');

const CONST = require('../const.js');
process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

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

const AIRCARBON_DOM10_1 = "0x3bf2a66c7057bc3737b5e6a7c0bc39b41437ffb8";
const AIRCARBON_DOM10_2 = "0x3b9a2f8c123efbd9919e0903c994efae15cf78ef";

//
// multi ST-type ERC20 transfer
//

describe(`Contract Web3 Interface`, async () => {

    //
    //           Local: ("export INSTANCE_ID=local && mocha test_web3 --timeout 10000000 --exit")
    //         AWS Dev: ("export INSTANCE_ID=DEV && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //         AWS UAT: ("export INSTANCE_ID=UAT && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //

    before(async function () {
        const contractType = await CONST.web3_call('getContractType', []);
        console.log('contractType: ', contractType);
        if (contractType == CONST.contractType.CASHFLOW_BASE) this.skip(); // cashflow: only supports single type

        var x;
        x = await CONST.getAccountAndKey(OWNER_NDX);
        OWNER = x.addr; OWNER_privKey = x.privKey;

        x = await CONST.getAccountAndKey(WHITE_NDX);
        WHITE = x.addr; WHITE_privKey = x.privKey;

        x = await CONST.getAccountAndKey(GRAY_1_NDX);
        GRAY_1 = x.addr; GRAY_1_privKey = x.privKey;

        x = await CONST.getAccountAndKey(GRAY_2_NDX);
        GRAY_2 = x.addr; GRAY_2_privKey = x.privKey;

        await require('../devSetupContract.js').setDefaults();

        // setup - whitelist A, mint two types for A, transferOrTrade all A -> GRAY_1
        try {
            await CONST.web3_tx('whitelistMany', [ [WHITE] ], OWNER, OWNER_privKey);
        } catch(ex) {
            // swallow - ropsten doesn't include the revert msg
            //if (ex.toString().includes("Already whitelisted")) console.log('(already whitelisted - nop)');
            //else throw(ex);
        }
        const sealedStatus = await CONST.web3_call('getContractSeal', []);
        if (!sealedStatus) {
            await CONST.web3_tx('sealContract', [], OWNER, OWNER_privKey);
        }

        // setup - mint for A
        //for (var i=0 ; i < 10 ; i++) {
            await CONST.web3_tx('mintSecTokenBatch', [
                CONST.tokenType.TOK_T2,       100000, 1,      WHITE, CONST.nullFees, 0, [], [],
            ], OWNER, OWNER_privKey);

            await CONST.web3_tx('mintSecTokenBatch', [
                CONST.tokenType.TOK_T1,    100000, 1,      WHITE, CONST.nullFees, 0, [], [],
            ], OWNER, OWNER_privKey);

            // setup - transferOrTrade type 1: A -> GRAY_1
            await CONST.web3_tx('transferOrTrade', [ {
                    ledger_A: WHITE,                               ledger_B: GRAY_1,
                       qty_A: 100000,                           tokTypeId_A: CONST.tokenType.TOK_T2,
                       qty_B: 0,                                tokTypeId_B: 0,
                ccy_amount_A: 0,                                ccyTypeId_A: 0,
                ccy_amount_B: 0,                                ccyTypeId_B: 0,
                   applyFees: false,
                feeAddrOwner: CONST.nullAddr,
                   k_stIds_A: [], k_stIds_B: [],
                transferType: CONST.transferType.UNDEFINED,
            }], OWNER, OWNER_privKey);

            // setup - transferOrTrade type 2: A -> GRAY_1
            await CONST.web3_tx('transferOrTrade', [ {
                    ledger_A: WHITE,                               ledger_B: GRAY_1,
                       qty_A: 100000,                           tokTypeId_A: CONST.tokenType.TOK_T1,
                       qty_B: 0,                                tokTypeId_B: 0,
                ccy_amount_A: 0,                                ccyTypeId_A: 0,
                ccy_amount_B: 0,                                ccyTypeId_B: 0,
                   applyFees: false,
                feeAddrOwner: CONST.nullAddr,
                   k_stIds_A: [], k_stIds_B: [],
                transferType: CONST.transferType.UNDEFINED,
            }], OWNER, OWNER_privKey);
        //}

        // setup - fund GRAY_1 eth
        await CONST.web3_sendEthTestAddr(0, GRAY_1, "0.05");
    });

    it(`web3 direct - erc20 - should be able to send multiple token types from graylist addr to external wallet (erc20 => erc20)`, async () => {
        await CONST.web3_tx('transfer', [ AIRCARBON_DOM10_1, "200000" ], GRAY_1, GRAY_1_privKey);
        await CONST.web3_sendEthTestAddr(0, AIRCARBON_DOM10_1, "0.05");
    });
});

