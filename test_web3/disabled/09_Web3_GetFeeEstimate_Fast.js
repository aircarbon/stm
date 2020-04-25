const assert = require('assert');
//const acmJson = require('../build/contracts/StMaster.json');
//const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const { db } = require('../../common/dist');
require('dotenv').config();

const CONST = require('../const.js');

describe(`Contract Web3 Interface`, async () => {

    //
    // can run these to test web3 more quickly, e.g.
    //             Dev: ("export WEB3_NETWORK_ID=888 && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //      Ropsten AC: ("export WEB3_NETWORK_ID=3 && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //  Rinkeby Infura: ("export WEB3_NETWORK_ID=4 && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //

    before(async function () {
    });

    it(`web3 direct - transfer_feePreview_ExchangeOnly()`, async () => {
        const data = await CONST.web3_call('transfer_feePreview_ExchangeOnly', [{
            ledger_A: (await CONST.getAccountAndKey(98)).addr,
            ledger_B: (await CONST.getAccountAndKey(99)).addr,
            qty_A: 1,       tokenTypeId_A: 1,
            qty_B: 0,       tokenTypeId_B: 0,
            ccy_amount_A: 0,  ccyTypeId_A: 0,
            ccy_amount_B: 1,  ccyTypeId_B: 1,
            applyFees: true,
            feeAddrOwner: (await CONST.getAccountAndKey(0)).addr,
        }]);
        console.log(data);
    });
});

  