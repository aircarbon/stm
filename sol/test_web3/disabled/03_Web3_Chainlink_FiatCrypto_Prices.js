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

//
// tests Chainlink reference data contract(s) [get_btcUsd || get_ethUsd]
// returns live data on Ropsten & mainnet, returns 42 on ganache
//

describe(`Contract Web3 Interface`, async () => {

    //
    //               Local: "export INSTANCE_ID=local && mocha test_web3 --timeout 10000000 --exit"
    //   SD BSC Testnet 97: "export INSTANCE_ID=UAT_97_SD_RichGlory && mocha test_web3 --timeout 10000000 --exit"
    //                      "export INSTANCE_ID=UAT_97_SD_SBGLand && mocha test_web3 --timeout 10000000 --exit"
    //

    before(async function () {
    });

    //
    // TODO: change issuance to price in fiat, and use ref data eth/fiat values
    //        (issuance tests then change, finish issuance tests for eq-type [basic] re. updating price mid issuance)
    //
    // TODO: WalletDetailSend in SCP re. SCP upgrades for auto-convert on receipt (esp. server mode)
    //

    it(`web3 direct - chainlink - should be able to get reference data contract values`, async () => {
        console.log('addr_ethUsd', await CONST.web3_call('chainlinkAggregator_ethUsd', [], process.env.ADD_TYPE__CONTRACT_NAME));
        console.log('get_ethUsd', (await CONST.web3_call('get_ethUsd', [], process.env.ADD_TYPE__CONTRACT_NAME)).toString());

        console.log('addr_bnbUsd', await CONST.web3_call('chainlinkAggregator_bnbUsd', [], process.env.ADD_TYPE__CONTRACT_NAME));
        console.log('get_bnbUsd', (await CONST.web3_call('get_bnbUsd', [], process.env.ADD_TYPE__CONTRACT_NAME)).toString());
    });
});

