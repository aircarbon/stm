const assert = require('assert');
//const acmJson = require('../build/contracts/StMaster.json');
//const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const { db } = require('../../common/dist');
require('dotenv').config();

const CONST = require('../const.js');

//
// tests Chainlink reference data contract(s) [get_btcUsd || get_ethUsd]
// returns live data on Ropsten & mainnet, returns 42 on ganache
//

describe(`Contract Web3 Interface`, async () => {

    //
    // can run these to test web3 more quickly, e.g.
    //         Dev: ("export WEB3_NETWORK_ID=888 && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //  Ropsten AC: ("export WEB3_NETWORK_ID=3 && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //

    before(async function () {
    });

    //
    // TODO: change issuance to price in fiat, and use ref data eth/fiat values
    //        (issuance tests then change, finish issuance tests for eq-type [basic] re. updating price mid issuance)
    //
    // TODO: WalletDetailSend in SCP re. SCP upgrades for auto-convert on receipt (esp. server mode)
    //

    // it(`web3 direct - chainlink - should be able to get reference data contract values`, async () => {
    //     //console.log('addr_btcUsd', await CONST.web3_call('chainlinkAggregator_btcUsd', []));
    //     console.log('addr_ethUsd', await CONST.web3_call('chainlinkAggregator_ethUsd', []));
    //     //console.log('get_btcUsd', (await CONST.web3_call('get_btcUsd', [])).toString());
    //     console.log('get_ethUsd', (await CONST.web3_call('get_ethUsd', [])).toString());
    // });
});

  