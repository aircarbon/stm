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

describe(`Contract Web3 Interface`, async () => {

    //
    //           Local: ("export INSTANCE_ID=local && mocha test_web3 --timeout 10000000 --exit")
    //         AWS Dev: ("export INSTANCE_ID=DEV && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //         AWS UAT: ("export INSTANCE_ID=UAT && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //

    before(async function () {
    });

    it(`web3 direct - transfer_feePreview_ExchangeOnly()`, async () => {
        const data = await CONST.web3_call('transfer_feePreview_ExchangeOnly', [{
            ledger_A: (await CONST.getAccountAndKey(98)).addr,
            ledger_B: (await CONST.getAccountAndKey(99)).addr,
            qty_A: 1,         tokTypeId_A: 1,
            qty_B: 0,         tokTypeId_B: 0,
            ccy_amount_A: 0,  ccyTypeId_A: 0,
            ccy_amount_B: 1,  ccyTypeId_B: 1,
            applyFees: true,
            feeAddrOwner: (await CONST.getAccountAndKey(0)).addr,
        }]);
        console.log(data);
    });
});

