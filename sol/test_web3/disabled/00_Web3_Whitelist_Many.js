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

describe(`Contract Web3 Interface`, async () => {

    //
    //           Local: ("export INSTANCE_ID=local && mocha test_web3 --timeout 10000000 --exit")
    //         AWS Dev: ("export INSTANCE_ID=DEV && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //         AWS UAT: ("export INSTANCE_ID=UAT && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //

    const test_accounts = [];
    const CHUNK_SIZE = 100;
    const CHUNKS = 100;

    before(async function () {
        await require('../devSetupContract.js').setDefaults();

        const sealedStatus = await CONST.web3_call('getContractSeal', []);
        if (sealedStatus) {
            throw('contract must be unsealed');
        }

        console.log('creating test accounts...');
        for (let i=0 ; i < CHUNK_SIZE * CHUNKS ; i++) {
            const x = await CONST.getAccountAndKey(i);
            test_accounts.push(x.addr);
        }
        console.log('test_accounts.length: ', test_accounts.length);
    });

    it(`web3 direct - whitelist many - should be able to write & read a large number of accounts to the whitelist`, async () => {
        const O = await CONST.getAccountAndKey(0);

        for (var i=0; i < CHUNKS; i++) {
            console.log(`Whitelisting ${CHUNK_SIZE} addresses (chunk ${i} of ${CHUNKS})...`);
            const tx = await CONST.web3_tx('whitelistMany', [ test_accounts.slice(i * CHUNK_SIZE, (i+1) * CHUNK_SIZE) ], O.addr, O.privKey);
            await CONST.logGas(CONST.getTestContextWeb3().web3, { receipt: tx.receipt }, 'whitelistMany');
        }

        const wl = await CONST.web3_call('getWhitelist', []);
        console.log('wl.length: ', wl.length);
    });
});

