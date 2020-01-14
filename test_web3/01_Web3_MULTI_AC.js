const assert = require('assert');
//const acmJson = require('../build/contracts/StMaster.json');
//const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const { db } = require('../../common/dist');
require('dotenv').config();
const _ = require('lodash');

const CONST = require('../const.js');

var OWNER, OWNER_privKey;
const OWNER_NDX = 0;

// whitelisted minters
const WHITE_MINTER_START_NDX = 1;
const WHITE_MINTER_COUNT = 2;
const BATCHES_PER_WHITE_MINTER = 4;
const WHITE_MINTERS = [];

// whitelisted buyers
const WHITE_BUYER_START_NDX = WHITE_MINTER_START_NDX + WHITE_MINTER_COUNT;
const WHITE_BUYER_COUNT = 2;
const BUYS_PER_WHITE_BUYER = 1;
const WHITE_BUYERS = [];

// const GRAY_1_NDX = 800;
// const GRAY_2_NDX = 801;

// var WHITE, WHITE_privKey;
// var GRAY_1, GRAY_1_privKey;
// var GRAY_2, GRAY_2_privKey;

const SCOOP_TESTNETS_1 = "0x8443b1edf203f96d1a5ec98301cfebc4d3cf2b20";
const SCOOP_TESTNETS_2 = "0xe4f1925fba6cbf65c81dc8d25163c899f14cd6c1";

const AIRCARBON_DOM10_1 = "0x3bf2a66c7057bc3737b5e6a7c0bc39b41437ffb8";
const AIRCARBON_DOM10_2 = "0x3b9a2f8c123efbd9919e0903c994efae15cf78ef";

//
// populates larger volumes of random/representative test data
//

describe(`Contract Web3 Interface`, async () => {

    //
    // can run these to test web3 more quickly, e.g.
    //         Dev: ("export WEB3_NETWORK_ID=888 && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 120000 --exit")
    //  Ropsten AC: ("export WEB3_NETWORK_ID=3 && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 120000 --exit")
    //

    before(async function () {
        var x;
        x = await CONST.getAccountAndKey(OWNER_NDX);
        OWNER = x.addr; OWNER_privKey = x.privKey;

        // setup whitelist: minters
        for (var whiteNdx = WHITE_MINTER_START_NDX; whiteNdx < WHITE_MINTER_START_NDX + WHITE_MINTER_COUNT; whiteNdx++) {
            x = await CONST.getAccountAndKey(whiteNdx);
            WHITE_MINTERS.push({ndx: whiteNdx, addr: x.addr, privKey: x.privKey});
            try {
                const whitelistTx = await CONST.web3_tx('whitelist', [ x.addr ], OWNER, OWNER_privKey);
            } catch(ex) {} // swallow - ropsten doesn't include the revert msg
        }

        // setup whitelist: buyers
        for (var whiteNdx = WHITE_BUYER_START_NDX; whiteNdx < WHITE_BUYER_START_NDX + WHITE_BUYER_COUNT; whiteNdx++) {
            x = await CONST.getAccountAndKey(whiteNdx);
            WHITE_BUYERS.push({ndx: whiteNdx, addr: x.addr, privKey: x.privKey});
            try {
                const whitelistTx = await CONST.web3_tx('whitelist', [ x.addr ], OWNER, OWNER_privKey);
            } catch(ex) {}
        }
        
        // seal
        const sealedStatus = await CONST.web3_call('getContractSeal', []);
        if (!sealedStatus) {
            const sealTx = await CONST.web3_tx('sealContract', [], OWNER, OWNER_privKey);
        }

        // add sec token type
        if (!(await CONST.web3_call('getSecTokenTypes',[])).tokenTypes.some(p => p.name == 'NEW_TOK_TYPE_A')) {
            await CONST.web3_tx('addSecTokenType', [ 'NEW_TOK_TYPE_A' ], OWNER, OWNER_privKey);
        }

        // add ccy type
        if (!(await CONST.web3_call('getCcyTypes',[])).ccyTypes.some(p => p.name == 'NEW_CCY_TYPE_A')) {
            await CONST.web3_tx('addCcyType', [ 'NEW_CCY_TYPE_A', 'cents', 2 ], OWNER, OWNER_privKey);
        }

        // setup - fund GRAY_1 eth
        //const fundTx = await CONST.web3_sendEthTestAddr(0, GRAY_1, "0.05");
    });

    it(`web3 direct - multi - should be able to mint multiple batches for all whitelist minters`, async () => {
        const curTokTypes = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes;

        for (var whiteNdx = 0; whiteNdx < WHITE_MINTERS.length ; whiteNdx++) {
            const W = WHITE_MINTERS[whiteNdx];

            console.group(`MINTING FOR WHITELIST LEDGER ${W.addr}...`);
            for (var batchNdx = 0; batchNdx < BATCHES_PER_WHITE_MINTER ; batchNdx++) {
                const batchFees = {
                    fee_fixed: batchNdx * 10,
                    fee_percBips: batchNdx * 5,
                    fee_min: batchNdx * 10,
                    fee_max: batchNdx * 50,
                };
                const mintTx = await CONST.web3_tx('mintSecTokenBatch', [
                    (batchNdx % curTokTypes.length) + 1, ((batchNdx+1) * 100000), 1, W.addr, batchFees, [], [],
                ], OWNER, OWNER_privKey);
            }
            console.groupEnd();
        }
    });

    it(`web3 direct - multi - should be able to fund (tokens & ccy), trade & withdraw (tokens & ccy) for all whitelist buyers`, async () => {
        const curTokTypes = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes;
        // todo: fund white buyer (deposit ccy)
        //       trade different ccy's white minters
        //       withdraw some ccy
        //       withdraw some tokens to erc20
        //       deposit tokens back erc20
        //
        //...
    });
   
});

  