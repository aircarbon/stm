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

const AIRCARBON_DOM10_1 = "0x3bf2a66c7057bc3737b5e6a7c0bc39b41437ffb8";
const AIRCARBON_DOM10_2 = "0x3b9a2f8c123efbd9919e0903c994efae15cf78ef";

//
// single ST-type ERC20 transfer
//

describe(`Contract Web3 Interface`, async () => {

    //
    // can run these to test web3 more quickly, e.g.
    //         Dev: ("export WEB3_NETWORK_ID=888 && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //  Ropsten AC: ("export WEB3_NETWORK_ID=3 && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
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

        // setup - mint for A
        //for (var i=0 ; i < 10 ; i++) {
            const mintTx = await CONST.web3_tx('mintSecTokenBatch', [
                CONST.tokenType.NATURE,    100000, 1,      WHITE, CONST.nullFees, 0, [], [],
            ], OWNER, OWNER_privKey);

            // setup - transferOrTrade A -> GRAY_1 (withdraw)
            const withdrawTx = await CONST.web3_tx('transferOrTrade', [ {
                    ledger_A: WHITE,                               ledger_B: GRAY_1,
                       qty_A: 100000,                         tokenTypeId_A: CONST.tokenType.NATURE,
                       qty_B: 0,                              tokenTypeId_B: 0,
                ccy_amount_A: 0,                                ccyTypeId_A: 0,
                ccy_amount_B: 0,                                ccyTypeId_B: 0,
                   applyFees: false,
                feeAddrOwner: CONST.nullAddr
            }], OWNER, OWNER_privKey);
            //await CONST.logGas(CONST.getTestContextWeb3().web3, { receipt: withdrawTx }, 'exchange => erc20 (withdraw): 1 type, 1 batch');
        //}

        // setup - fund GRAY_1 eth
        const fundTx = await CONST.web3_sendEthTestAddr(0, GRAY_1, "0.05");
    });

    it(`web3 direct - erc20 - should be able to send single token type from graylist addr to external wallet (erc20 => erc20)`, async () => {
        const erc20_1 = await CONST.web3_tx('transfer', [ AIRCARBON_DOM10_1, "25000" ], GRAY_1, GRAY_1_privKey);
        const erc20_2 = await CONST.web3_tx('transfer', [ AIRCARBON_DOM10_2, "25000" ], GRAY_1, GRAY_1_privKey);
        //await CONST.logGas(CONST.getTestContextWeb3().web3, { receipt: erc20_1 }, 'erc20 => erc20 (transfer 1): 1 type, 1 batch');
        //await CONST.logGas(CONST.getTestContextWeb3().web3, { receipt: erc20_2 }, 'erc20 => erc20 (transfer 2): 1 type, 1 batch');

        await CONST.web3_sendEthTestAddr(0, AIRCARBON_DOM10_1, "0.01");
        await CONST.web3_sendEthTestAddr(0, AIRCARBON_DOM10_2, "0.01");
    });
   
    it(`web3 direct - erc20 - should be able to send from graylist addr to whitelist addr (DEPOSIT: erc20 => exchange)`, async () => {
        const erc20_deposit = await CONST.web3_tx('transfer', [ WHITE, "50000" ], GRAY_1, GRAY_1_privKey);
        //await CONST.logGas(CONST.getTestContextWeb3().web3, { receipt: erc20_deposit }, 'erc20 => exchange (deposit): 1 type, 1 batch');
    });
});

  