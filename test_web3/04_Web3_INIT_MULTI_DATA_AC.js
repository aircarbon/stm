const assert = require('assert');
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const { db } = require('../../db/dist');
const _ = require('lodash');
const chalk = require('chalk');

const CONST = require('../const.js');
process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

//
// INITIALIZES a deployed contract, & optionally populates it with arbitrary volumes of random/representative test data
//

// if false, will produce an empty state: only whitelisted accounts + sealed
// if true, will perform a number of test actions: setting fees, minting, trading, etc.
const EXEC_TEST_ACTIONS = false;

// owner
const OWNER_NDX = 0;
var OWNER, OWNER_privKey;

// internal/reserved whitelisted - the contract reserves the first ten addresses for internal/test/exchange use
const WHITELIST_RESERVED_COUNT = 10; // static - don't change: should match the hardcoded value in the smart contract
const WHITE_RESERVED = [];

// whitelisted minters
const WHITE_MINTER_START_NDX = WHITELIST_RESERVED_COUNT;// + 1;
const WHITE_MINTER_COUNT = 2;
const BATCHES_PER_WHITE_MINTER = 4;
const WHITE_MINTERS = [];

// whitelisted buyers
const WHITE_BUYER_START_NDX = WHITE_MINTER_START_NDX + WHITE_MINTER_COUNT;
const WHITE_BUYER_COUNT = 2;
const BUYS_PER_WHITE_BUYER = 3;
const WHITE_BUYERS = [];

// whitelisted manual test accounts
const TEST_ACCOUNT_START_NDX = WHITE_BUYER_START_NDX + WHITE_BUYER_COUNT;
const TEST_ACCOUNT_COUNT = 100;
const TEST_ACCOUNTS = [];

// off-exchange "graylist" external address
const GRAY_NDX = 800;
var GRAY, GRAY_privKey;

describe(`Contract Web3 Interface`, async () => {

    //
    //           Local: ("export INSTANCE_ID=local && mocha test_web3 --timeout 10000000 --exit")
    //         AWS Dev: ("export INSTANCE_ID=DEV && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //         AWS UAT: ("export INSTANCE_ID=UAT && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //        AWS DEMO: ("export INSTANCE_ID=DEMO && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //        AWS PROD: ("export INSTANCE_ID=PROD && export CONTRACT_TYPE=COMMODITY && mocha test_web3 --timeout 10000000 --exit")
    //

    before(async function () {
        await require('../devSetupContract.js').setDefaults();

        /*var x;
        x = await CONST.getAccountAndKey(OWNER_NDX);
        OWNER = x.addr; OWNER_privKey = x.privKey;

        x = await CONST.getAccountAndKey(GRAY_NDX);
        GRAY = x.addr; GRAY_privKey = x.privKey;
        const sendEthTx = await CONST.web3_sendEthTestAddr(0, GRAY, "0.01"); // setup - fund GRAY eth

        const sealedStatus = await CONST.web3_call('getContractSeal', []);
        var allWhitelisted = await CONST.web3_call('getWhitelist', []);
        console.log('allWhitelisted', allWhitelisted);
        console.log('sealedStatus', sealedStatus);

        if (sealedStatus == false) {

            // setup whitelist: reserved/internal
            var whiteNdx = 0;
            const submittedToWhitelist = []
            var wlMany = []
            for (whiteNdx = 0; whiteNdx < WHITELIST_RESERVED_COUNT; whiteNdx++) {
                x = await CONST.getAccountAndKey(whiteNdx);
                if (!allWhitelisted.map(p => p.toLowerCase()).includes(x.addr.toLowerCase())) {
                    wlMany.push(x.addr);
                }
                WHITE_RESERVED.push({ndx: whiteNdx, addr: x.addr, privKey: x.privKey});
            }
            console.log(chalk.inverse(`SETUP RESERVED WL (count=${wlMany.length}) last whiteNdx=${whiteNdx}...`));
            try {
                if (wlMany.length > 0) {
                    await CONST.web3_tx('whitelistMany', [ wlMany ], OWNER, OWNER_privKey);
                }
            } catch(ex) { console.warn(ex); }
            //whitelistChunked(wlMany, OWNER, OWNER_privKey);
            submittedToWhitelist.concat(wlMany);

            // setup whitelist: test minters
            wlMany = []
            for (whiteNdx = WHITELIST_RESERVED_COUNT; whiteNdx < WHITE_MINTER_START_NDX + WHITE_MINTER_COUNT; whiteNdx++) {
                x = await CONST.getAccountAndKey(whiteNdx);
                if (!allWhitelisted.map(p => p.toLowerCase()).includes(x.addr.toLowerCase())) {
                    wlMany.push(x.addr);
                }
                WHITE_MINTERS.push({ndx: whiteNdx, addr: x.addr, privKey: x.privKey});
            }
            console.log(chalk.inverse(`SETUP MINTERS WL (count=${wlMany.length}) last whiteNdx=${whiteNdx}...`));
            try {
                if (wlMany.length > 0) {
                    await CONST.web3_tx('whitelistMany', [ wlMany ], OWNER, OWNER_privKey);
                }
            } catch(ex) { console.warn(ex); }
            //await whitelistChunked(wlMany, OWNER, OWNER_privKey);
            submittedToWhitelist.concat(wlMany);

            // setup whitelist: test buyers
            wlMany = []
            for (whiteNdx = WHITE_MINTER_START_NDX + WHITE_MINTER_COUNT; whiteNdx < WHITE_BUYER_START_NDX + WHITE_BUYER_COUNT; whiteNdx++) {
                x = await CONST.getAccountAndKey(whiteNdx);
                if (!allWhitelisted.map(p => p.toLowerCase()).includes(x.addr.toLowerCase())) {
                    wlMany.push(x.addr);
                }
                WHITE_BUYERS.push({ndx: whiteNdx, addr: x.addr, privKey: x.privKey});
            }
            console.log(chalk.inverse(`SETUP BUYERS WL (count=${wlMany.length}) last whiteNdx=${whiteNdx}...`));
            try {
                if (wlMany.length > 0) {
                    await CONST.web3_tx('whitelistMany', [ wlMany ], OWNER, OWNER_privKey);
                }
            } catch(ex) { console.warn(ex); }
            //await whitelistChunked(wlMany, OWNER, OWNER_privKey);
            submittedToWhitelist.concat(wlMany);

            //
            // setup whitelist: manual testing exchange accounts -- BATCHED/CHUNKED --
            //
            wlMany = []
            for (whiteNdx = WHITE_BUYER_START_NDX + WHITE_BUYER_COUNT; whiteNdx < TEST_ACCOUNT_START_NDX + TEST_ACCOUNT_COUNT; whiteNdx++) {
                x = await CONST.getAccountAndKey(whiteNdx);
                if (!allWhitelisted.map(p => p.toLowerCase()).includes(x.addr.toLowerCase())) {
                    wlMany.push(x.addr);
                }
                TEST_ACCOUNTS.push({ndx: whiteNdx, addr: x.addr, privKey: x.privKey});
            }
            console.log(chalk.inverse(`SETUP TEST ACCOUNTS WL (count=${wlMany.length}) last whiteNdx=${whiteNdx}...`));
            await whitelistChunked(wlMany, OWNER, OWNER_privKey);
            submittedToWhitelist.concat(wlMany);

                async function whitelistChunked(wlMany, OWNER, OWNER_privKey) {
                    if (wlMany.length > 0) {
                        const wlChunked = _.chunk(wlMany, 50);
                        //console.log('wlMany', wlMany);
                        //console.log('wlChunked', wlChunked);
                        for (let chunk of wlChunked) {
                            //console.log('chunk', chunk);
                            try {
                                await CONST.web3_tx('whitelistMany', [ chunk ], OWNER, OWNER_privKey);
                            } catch(ex) { console.warn(ex); }
                        }
                    }
                }

            // dbg - get counts & whitelist
            allWhitelisted = await CONST.web3_call('getWhitelist', []);
            console.log(chalk.inverse(`DONE WHITELISTING...`));
            console.log('allWhitelisted.length: ', allWhitelisted.length);
            //console.dir(allWhitelisted);
            //console.dir(submittedToWhitelist);
            const allSubmittedPresent = _.every(submittedToWhitelist, p => allWhitelisted.includes(p));
            console.log('allSubmittedPresent: ', allSubmittedPresent);
            assert(allSubmittedPresent == true, '!!!');

            // seal
            if (!sealedStatus) {
                await CONST.web3_tx('sealContract', [], OWNER, OWNER_privKey);
            }
        }
        else {
            console.log(`already sealed: WL - NOP (WL count=${allWhitelisted.length}).`);
        }

        if (EXEC_TEST_ACTIONS) {
            // add sec token type
            if (!(await CONST.web3_call('getSecTokenTypes',[])).tokenTypes.some(p => p.name == 'NEW_TOK_TYPE_A')) {
                await CONST.web3_tx('addSecTokenType', [ 'NEW_TOK_TYPE_A', CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr ], OWNER, OWNER_privKey);
            }

            // add ccy type
            if (!(await CONST.web3_call('getCcyTypes',[])).ccyTypes.some(p => p.name == 'NEW_CCY_TYPE_A')) {
                await CONST.web3_tx('addCcyType', [ 'NEW_CCY_TYPE_A', 'cents', 2 ], OWNER, OWNER_privKey);
            }
        }*/
    });

    it(`web3 direct - multi - should be able to mint multiple batches for all whitelist minters`, async () => {
        if (!EXEC_TEST_ACTIONS) { console.log('skipping (!EXEC_TEST_ACTIONS)'); return; }

        const curTokTypes = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes;
        for (var whiteNdx = 0; whiteNdx < WHITE_MINTERS.length ; whiteNdx++) {
            const WM = WHITE_MINTERS[whiteNdx];

            console.group(chalk.inverse(`MINTING FOR ${WM.addr}...`));
            for (var batchNdx = 0; batchNdx < BATCHES_PER_WHITE_MINTER ; batchNdx++) {
                const batchFees = {
                    ccy_mirrorFee: false,
                    ccy_perMillion: 0,
                    fee_fixed: batchNdx * 10,
                    fee_percBips: batchNdx * 5,
                    fee_min: batchNdx * 10,
                    fee_max: batchNdx * 50,
                };
                const origCcyFee_percBips_ExFee = batchFees.fee_percBips;
                await CONST.web3_tx('mintSecTokenBatch', [
                    (batchNdx % curTokTypes.length) + 1, ((batchNdx+1) * 1000000), 1, WM.addr, batchFees, origCcyFee_percBips_ExFee, [], [],
                ], OWNER, OWNER_privKey);
            }
            console.groupEnd();
        }
    });

    it(`web3 direct - multi - should be able to fund (tokens & ccy), trade & withdraw (tokens & ccy) for all whitelist buyers`, async () => {
        if (!EXEC_TEST_ACTIONS) { console.log('skipping (!EXEC_TEST_ACTIONS)'); return; }

        const curTokTypes = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes;
        const ccyTypes = (await CONST.web3_call('getCcyTypes', [])).ccyTypes;

        for (var whiteNdx = WHITE_BUYER_START_NDX; whiteNdx < WHITE_BUYER_START_NDX + WHITE_BUYER_COUNT; whiteNdx++) {
            const BUYER = WHITE_BUYERS[whiteNdx - WHITE_BUYER_START_NDX];

            // fund white buyer (deposit ccy)
            const ccyTypeIdFunded = (whiteNdx % ccyTypes.length) + 1;
            await CONST.web3_tx('fundOrWithdraw', [ CONST.fundWithdrawType.FUND, ccyTypeIdFunded, 1000000 * (whiteNdx+1), BUYER.addr, 'TEST_DATA' ], OWNER, OWNER_privKey);

            // trade with minters
            console.group(chalk.inverse(`BUYING FOR ${BUYER.addr}...`));
            for (var buyNdx = 0; buyNdx < BUYS_PER_WHITE_BUYER; buyNdx++) {
                const SELLER = WHITE_MINTERS[(whiteNdx+buyNdx) % WHITE_MINTERS.length];
                const minterLedger = (await CONST.web3_call('getLedgerEntry', [SELLER.addr]));
                const minterTokTypeId = minterLedger.tokens[0].tokTypeId.toString();

                const exchangeCcyFee = { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: buyNdx * 11, fee_percBips: buyNdx * 6, fee_min: buyNdx * 11, fee_max: buyNdx * 51, };
                const ledgerCcyFee =   { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: buyNdx * 12, fee_percBips: buyNdx * 7, fee_min: buyNdx * 12, fee_max: buyNdx * 52, };
                await CONST.web3_tx('setFee_CcyType', [ ccyTypeIdFunded, CONST.nullAddr, exchangeCcyFee ], OWNER, OWNER_privKey);
                await CONST.web3_tx('setFee_CcyType', [ ccyTypeIdFunded, BUYER.addr,     ledgerCcyFee   ], OWNER, OWNER_privKey);

                const exchangeTokFee = { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: buyNdx * 11, fee_percBips: buyNdx * 6, fee_min: buyNdx * 11, fee_max: buyNdx * 51, };
                const ledgerTokFee =   { ccy_mirrorFee: false, ccy_perMillion: 0, fee_fixed: buyNdx * 12, fee_percBips: buyNdx * 7, fee_min: buyNdx * 12, fee_max: buyNdx * 52, };
                await CONST.web3_tx('setFee_TokType', [ minterTokTypeId, CONST.nullAddr, exchangeTokFee ], OWNER, OWNER_privKey);
                await CONST.web3_tx('setFee_TokType', [ minterTokTypeId, SELLER.addr,    ledgerTokFee   ], OWNER, OWNER_privKey);

                await CONST.web3_tx('transferOrTrade', [ {
                    ledger_A: SELLER.addr,                                    ledger_B: BUYER.addr,
                       qty_A: minterLedger.tokens[0].currentQty.div(2),    tokTypeId_A: minterTokTypeId,
                       qty_B: 0,                                           tokTypeId_B: 0,
                ccy_amount_A: 0,                                           ccyTypeId_A: 0,
                ccy_amount_B: 5000,                                        ccyTypeId_B: ccyTypeIdFunded,
                   applyFees: true,
                feeAddrOwner: CONST.nullAddr
            }], OWNER, OWNER_privKey);
            }
            console.groupEnd();

            // withdraw some ccy
            await CONST.web3_tx('fundOrWithdraw', [ CONST.fundWithdrawType.WITHDRAW, ccyTypeIdFunded, 100 * (whiteNdx+1), BUYER.addr, 'TEST_DATA' ], OWNER, OWNER_privKey);

            // withdraw all tokens to graylist addr
            const buyerLedger = (await CONST.web3_call('getLedgerEntry', [BUYER.addr]));
            console.group(chalk.inverse(`WITHDRAWING (SELF-CUSTODY) ALL FOR ${BUYER.addr}...`));
            for (var x = 0; x < buyerLedger.tokens.length ; x++) {
                await CONST.web3_tx('transferOrTrade', [ {
                    ledger_A: BUYER.addr,                            ledger_B: GRAY,
                       qty_A: buyerLedger.tokens[x].currentQty,   tokTypeId_A: buyerLedger.tokens[x].tokTypeId.toString(),
                       qty_B: 0,                                  tokTypeId_B: 0,
                ccy_amount_A: 0,                                  ccyTypeId_A: 0,
                ccy_amount_B: 0,                                  ccyTypeId_B: 0,
                   applyFees: false,
                feeAddrOwner: CONST.nullAddr
            }], OWNER, OWNER_privKey);
            }
            console.groupEnd();

            // deposit tokens back (erc20 in)
            console.group(chalk.inverse(`DEPOSITING ALL FOR ${BUYER.addr}...`));
            const grayLedger = (await CONST.web3_call('getLedgerEntry', [GRAY]));
            await CONST.web3_tx('transfer', [ BUYER.addr, buyerLedger.spot_sumQty.toString() ], GRAY, GRAY_privKey);
            console.groupEnd();

            // leave USD fee per million at $3 mirrored
            const gfUsd = { ccy_mirrorFee: true, ccy_perMillion: 300, fee_fixed: 0, fee_percBips: 0, fee_min: 300, fee_max: 0, };
            await CONST.web3_tx('setFee_CcyType', [ CONST.ccyType.USD, CONST.nullAddr, gfUsd ], OWNER, OWNER_privKey);
        }
    });
});

