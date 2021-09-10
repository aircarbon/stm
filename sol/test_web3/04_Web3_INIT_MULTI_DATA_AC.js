// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

const assert = require('assert');
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const  db  = require('../../orm/build');
const _ = require('lodash');
const chalk = require('chalk');

const CONST = require('../const.js');
process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

//
// INITIALIZES a deployed contract, (& optionally populates it with arbitrary volumes of random/representative test data)
//

// if false, will produce an empty state: only whitelisted accounts + sealed
// if true, will perform a number of test actions: setting fees, minting, trading, etc.
const EXEC_TEST_ACTIONS = process.env.NETWORK_ID != 56 && process.env.NETWORK_ID != 1;
console.log(chalk.red('EXEC_TEST_ACTIONS'.padEnd(30, '.')), EXEC_TEST_ACTIONS);

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
console.log(chalk.red('process.env.WHITELIST_COUNT'.padEnd(30, '.')), process.env.WHITELIST_COUNT);
const TEST_ACCOUNT_COUNT = process.env.WHITELIST_COUNT || 100;
const TEST_ACCOUNTS = [];

// off-exchange "graylist" external address
const GRAY_NDX = 800;
var GRAY, GRAY_privKey;

describe(`Contract Web3 Interface`, async () => {

    //
    //  AC various
    //       ("export INSTANCE_ID=local && mocha test_web3 --timeout 10000000 --exit")
    //       ("export INSTANCE_ID=DEV && mocha test_web3 --timeout 10000000 --exit")
    //       ("export INSTANCE_ID=UAT && mocha test_web3 --timeout 10000000 --exit")
    //       ("export INSTANCE_ID=DEMO && mocha test_web3 --timeout 10000000 --exit")
    //       ("export INSTANCE_ID=PROD_56 && mocha test_web3 --timeout 10000000 --exit")
    //
    //   SD local Ganache / Dev DB
    //       ("export INSTANCE_ID=local_SD && mocha test_web3 --timeout 10000000 --exit")                 // WL & seal controller (+ any attached base types)
    //       ("export INSTANCE_ID=local_SD_RichGlory && mocha test_web3 --timeout 10000000 --exit")       // WL & seal additional base type, uni-mint & setIssuerValues
    //
    //   SD Ropsten 3
    //       ("export INSTANCE_ID=UAT_3_SD && mocha test_web3 --timeout 10000000 --exit")                 // WL & seal controller (+ any attached base types)
    //       ("export INSTANCE_ID=UAT_3_SD_SBGLand && mocha test_web3 --timeout 10000000 --exit")         // WL & seal additional base type, uni-mint & setIssuerValues
    //       ("export INSTANCE_ID=UAT_3_SD_WilsonAndCo && mocha test_web3 --timeout 10000000 --exit")     // "
    //       ("export INSTANCE_ID=UAT_3_SD_WorldbridgeLand && mocha test_web3 --timeout 10000000 --exit") // "
    //
    //   SD BSC Testnet 97
    //       ("export INSTANCE_ID=UAT_97_SD && mocha test_web3 --timeout 10000000 --exit")
    //       ("export INSTANCE_ID=UAT_97_SD_SBGLand && mocha test_web3 --timeout 10000000 --exit")
    //
    //   SD BSC Testnet 97 (DEMO)
    //       ("export INSTANCE_ID=DEMO_97_SD && mocha test_web3 --timeout 10000000 --exit")
    //       ("export INSTANCE_ID=DEMO_97_SD_SBGLand && mocha test_web3 --timeout 10000000 --exit")
    //
    //   SD BSC Mainnet 56
    //       ("export INSTANCE_ID=PROD_56_SD && mocha test_web3 --timeout 10000000 --exit")
    //       ("export INSTANCE_ID=PROD_56_SD_RichGlory && mocha test_web3 --timeout 10000000 --exit")
    //       ("export INSTANCE_ID=PROD_56_SD_SBGLand && mocha test_web3 --timeout 10000000 --exit")
    //

    //CONST.consoleOutput(false);

    // setup
    before(async function () {

        const nameOverride = process.env.ADD_TYPE__CONTRACT_NAME;
        await require('../devSetupContract.js').setDefaults({ nameOverride });

        var x;
        x = await CONST.getAccountAndKey(OWNER_NDX);
        OWNER = x.addr; OWNER_privKey = x.privKey;

        x = await CONST.getAccountAndKey(GRAY_NDX);
        GRAY = x.addr; GRAY_privKey = x.privKey;
        if (process.env.INSTANCE_ID === 'local') {
            const sendEthTx = await CONST.web3_sendEthTestAddr(0, GRAY, "0.01"); // setup - fund GRAY eth
        }

        console.log(`Whitelisting & sealing: `, nameOverride || '(no named override)');
        await whitelistAndSeal({ nameOverride });

        // cashflow controller - need to whitelist & seal each base type (mirror base cashflow, i.e. WL set will be identical in base types)
        if ((await CONST.web3_call('getContractType', [], nameOverride)) == CONST.contractType.CASHFLOW_CONTROLLER) {
            const baseTypes = (await CONST.web3_call('getSecTokenTypes', [], nameOverride)).tokenTypes;
            //console.log('baseTypes', baseTypes);
            console.group();
            for (var baseType of baseTypes) {
                console.log(`Whitelisting & sealing (base-type @${baseType.cashflowBaseAddr}): `, baseType.name);
                await whitelistAndSeal({ addrOverride: baseType.cashflowBaseAddr });
            }
            console.groupEnd();
        }

        if (EXEC_TEST_ACTIONS) {
            const contractType = (await CONST.web3_call('getContractType', [], nameOverride));
            if (contractType == CONST.contractType.COMMODITY) {
                //console.log(chalk.dim('beforeAll: COMMODITY...'));

                // add test types & ccy if not present
                if (!(await CONST.web3_call('getSecTokenTypes', [], nameOverride)).tokenTypes.some(p => p.name == 'NEW_TOK_TYPE_A')) {
                    await CONST.web3_tx('addSecTokenType', [ 'NEW_TOK_TYPE_A', CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr ], OWNER, OWNER_privKey, nameOverride);
                }
                if (!(await CONST.web3_call('getCcyTypes', [], nameOverride)).ccyTypes.some(p => p.name == 'NEW_CCY_TYPE_A')) {
                    await CONST.web3_tx('addCcyType', [ 'NEW_CCY_TYPE_A', 'cents', 2 ], OWNER, OWNER_privKey, nameOverride);
                }
            }
            else if (contractType == CONST.contractType.CASHFLOW_CONTROLLER) {
                //console.log(chalk.dim('beforeAll: CASHFLOW_CONTROLLER...'));
                //...
            }
            else if (contractType == CONST.contractType.CASHFLOW_BASE) {
                //console.log(chalk.dim('beforeAll: CASHFLOW_BASE...'));
                //...
            }
        }
    });
        async function whitelistAndSeal(p) {
            const nameOverride = p ? p.nameOverride : undefined;
            const addrOverride = p ? p.addrOverride : undefined;
            var x;

            // WL & seal
            const sealedStatus = await CONST.web3_call('getContractSeal', [], nameOverride, addrOverride);
            var allWhitelisted = await CONST.web3_call('getWhitelist', [], nameOverride, addrOverride);
            //console.log(`(${addrOverride}) allWhitelisted.length`, allWhitelisted.length);
            //console.log(`(${addrOverride}) sealedStatus`, sealedStatus);
            //if (sealedStatus == false) {

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
                if (sealedStatus == false) { try {
                    if (wlMany.length > 0) {
                        console.log(chalk.inverse(`(${addrOverride}) SETUP RESERVED WL (count=${wlMany.length}) last whiteNdx=${whiteNdx}...`));
                        await CONST.web3_tx('whitelistMany', [ wlMany ], OWNER, OWNER_privKey, nameOverride, addrOverride);
                    }
                } catch(ex) { console.warn(ex); } }
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
                if (sealedStatus == false) { try {
                    if (wlMany.length > 0) {
                        console.log(chalk.inverse(`(${addrOverride}) SETUP MINTERS WL (count=${wlMany.length}) last whiteNdx=${whiteNdx}...`));
                        await CONST.web3_tx('whitelistMany', [ wlMany ], OWNER, OWNER_privKey, nameOverride, addrOverride);
                    }
                } catch(ex) { console.warn(ex); } }
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
                if (sealedStatus == false) { try {
                    if (wlMany.length > 0) {
                        console.log(chalk.inverse(`(${addrOverride}) SETUP BUYERS WL (count=${wlMany.length}) last whiteNdx=${whiteNdx}...`));
                        await CONST.web3_tx('whitelistMany', [ wlMany ], OWNER, OWNER_privKey, nameOverride, addrOverride);
                    }
                } catch(ex) { console.warn(ex); } }
                //await whitelistChunked(wlMany, OWNER, OWNER_privKey);
                submittedToWhitelist.concat(wlMany);

                //
                // setup whitelist: manual testing exchange accounts -- BATCHED/CHUNKED --
                //
                wlMany = []
                for (whiteNdx = WHITE_BUYER_START_NDX + WHITE_BUYER_COUNT; whiteNdx < Number(TEST_ACCOUNT_START_NDX) + Number(TEST_ACCOUNT_COUNT); whiteNdx++) {
                    x = await CONST.getAccountAndKey(whiteNdx);
                    if (!allWhitelisted.map(p => p.toLowerCase()).includes(x.addr.toLowerCase())) {
                        wlMany.push(x.addr);
                    }
                    TEST_ACCOUNTS.push({ndx: whiteNdx, addr: x.addr, privKey: x.privKey});
                }
                if (sealedStatus == false && wlMany.length > 0) {
                    console.log(chalk.inverse(`(${addrOverride}) SETUP TEST ACCOUNTS WL (count=${wlMany.length}) last whiteNdx=${whiteNdx}...`));
                    await whitelistChunked(wlMany, OWNER, OWNER_privKey);
                }
                submittedToWhitelist.concat(wlMany);
                    async function whitelistChunked(wlMany, OWNER, OWNER_privKey) {
                        if (wlMany.length > 0) {
                            const wlChunked = _.chunk(wlMany, 100);
                            for (let chunk of wlChunked) {
                                try {
                                    await CONST.web3_tx('whitelistMany', [ chunk ], OWNER, OWNER_privKey, nameOverride, addrOverride);
                                } catch(ex) { console.warn(ex); }
                            }
                        }
                    }

                // dbg - get counts & whitelist
                allWhitelisted = await CONST.web3_call('getWhitelist', [], nameOverride, addrOverride);
                //console.log(chalk.inverse(`(${addrOverride}) DONE WHITELISTING...`));
                //console.log(`(${addrOverride}) allWhitelisted.length: `, allWhitelisted.length);
                //console.dir(allWhitelisted);
                //console.dir(submittedToWhitelist);
                const allSubmittedPresent = _.every(submittedToWhitelist, p => allWhitelisted.includes(p));
                //console.log(`(${addrOverride}) allSubmittedPresent: `, allSubmittedPresent);
                assert(allSubmittedPresent == true, '!!!');

                // seal
                if (sealedStatus == false) {
                    await CONST.web3_tx('sealContract', [], OWNER, OWNER_privKey, nameOverride, addrOverride);
                }
            //}
            // else {
            //     console.log(`(${addrOverride}) already sealed: WL - NOP (WL count=${allWhitelisted.length}).`);
            // }
        }

    it(`web3 direct - UNI (CFT-B) - should be able to mint a uni-batch for an issuer`, async function() {
        const nameOverride = process.env.ADD_TYPE__CONTRACT_NAME;
        if (!EXEC_TEST_ACTIONS) { this.skip(); return; }
        if ((await CONST.web3_call('getContractType', [], nameOverride)) != CONST.contractType.CASHFLOW_BASE) { this.skip(); return; }

        const testTypeName = process.env.ADD_TYPE__TYPE_NAME;
        const mintQty = process.env.ADD_TYPE__UNIMINT_qty;
        const wei_currentPrice = process.env.ADD_TYPE__ISSUER_wei_currentPrice;
        const cents_currentPrice = process.env.ADD_TYPE__ISSUER_cents_currentPrice;
        const qty_saleAllocation = process.env.ADD_TYPE__ISSUER_qty_saleAllocation;
        if (testTypeName === undefined) throw('Undefined ADD_TYPE__TYPE_NAME');
        if (mintQty === undefined) throw('Undefined ADD_TYPE__UNIMINT_qty');
        if (wei_currentPrice === undefined) throw('Undefined ADD_TYPE__ISSUER_wei_currentPrice');
        if (cents_currentPrice === undefined) throw('Undefined ADD_TYPE__ISSUER_cents_currentPrice');
        if (qty_saleAllocation === undefined) throw('Undefined ADD_TYPE__ISSUER_qty_saleAllocation');

        // (test data) get the test issuer/minter account that corresponds with the base type
        const contractSymbol = (await CONST.web3_call('symbol', [], nameOverride));
        console.log('contractSymbol', contractSymbol);
        var issuerAddr;
        const testMeta = [
            {
                "TXT_PROJECT_NAME": "Worldbridge Land",
                "LIST_COUNTRY": "KH",
                "URL_PROJECT": "https://oxleyworldbridge.com.kh/",
                "IPFS_PROJECT_DOCUMENT_SALES": "QmUwY1VfL5kMxUUdFjmKnbVdaiMYi7UwYVBRWX4A2wom9g",
                "IPFS_PROJECT_DOCUMENT_LEGAL": "QmWume2gdUoKs3Z8xyDQfPQcZwJHgaKmW9z5ZWDaR4BXNQ",
                "IPFS_PROJECT_DOCUMENT_PROSPECTUS": "Qmcpmej7yYxoFQ9SGVG6UXP2WU2FHTn9i6sigSdZvsGsLm",
                "URL_PROJECT_IMG": "https://worldbridgeland.com.kh/img/logo.jpg"
            },
            {
                "TXT_PROJECT_NAME": "SBG Land",
                "LIST_COUNTRY": "MY",
                "URL_PROJECT": "https://www.sbgland.com/index.html",
                "IPFS_PROJECT_DOCUMENT_SALES": "QmSeQNDt9rRCeusrnAsW4m7uTDXjso3KtAsw9aBA4bRCnh",
                "IPFS_PROJECT_DOCUMENT_LEGAL": "QmWume2gdUoKs3Z8xyDQfPQcZwJHgaKmW9z5ZWDaR4BXNQ",
                "IPFS_PROJECT_DOCUMENT_PROSPECTUS": "Qmcpmej7yYxoFQ9SGVG6UXP2WU2FHTn9i6sigSdZvsGsLm",
                "URL_PROJECT_IMG": "https://www.sbgland.com/images/logo.jpg"
            },
            {
                "TXT_PROJECT_NAME": "Wilson and Company",
                "LIST_COUNTRY": "US",
                "URL_PROJECT": "https://www.wilsonco.com/service/land-development",
                "IPFS_PROJECT_DOCUMENT_SALES": "QmV5AVmqTyCj2Mx1B83N2VggEJVF6jDuq2fJysCCPKSAFk",
                "IPFS_PROJECT_DOCUMENT_LEGAL": "QmWume2gdUoKs3Z8xyDQfPQcZwJHgaKmW9z5ZWDaR4BXNQ",
                "IPFS_PROJECT_DOCUMENT_PROSPECTUS": "Qmcpmej7yYxoFQ9SGVG6UXP2WU2FHTn9i6sigSdZvsGsLm",
                "URL_PROJECT_IMG": "https://www.wilsonco.com/sites/default/files/wilson_final.png"
            },
            {
                "TXT_PROJECT_NAME": "Rich Glory Mantin Heights",
                "LIST_COUNTRY": "HK",
                "URL_PROJECT": "https://www.richglory.hk/index.php/home/",
                "IPFS_PROJECT_DOCUMENT_SALES": "QmPxiP4Uz7Stmyb8Vg1UidDUZt4BfGV2LDtCk25zGbUxav",
                "IPFS_PROJECT_DOCUMENT_LEGAL": "QmeEfjysofDp4H3PrH2fKE65eQMDYBn16Ug1jcG2zW1Ebv",
                "IPFS_PROJECT_DOCUMENT_PROSPECTUS": "Qmcpmej7yYxoFQ9SGVG6UXP2WU2FHTn9i6sigSdZvsGsLm",
                "URL_PROJECT_IMG": "https://www.richglory.hk/wp-content/uploads/2019/11/400dpiLogoH.png"
            }
        ];
        var meta;
        switch (contractSymbol) {
            case 'WBL1': issuerAddr = process.env.WEB3_NETWORK_ID == 56 ? '0xA6F98d2c0e11583877FBc5E06824728E1028400A' : '0x07C48Cedb64C4BC0E67191aE26A687BC3EDf2a28'; meta = testMeta[0]; break;
            case 'SBG1': issuerAddr = process.env.WEB3_NETWORK_ID == 56 ? '0x8A56e0C6801B27DB86e111e3Cb652F4494Cb09b5' : '0xe59193C3a8c93aA4D17A8cd83fb826F6214B2f77'; meta = testMeta[1]; break;
            case 'WCO1': issuerAddr = process.env.WEB3_NETWORK_ID == 56 ? '0x89ba82d2A05027fF05222C51550590F4df46577F' : '0x27a92Bb90CdC9dCFDDf9B4E7FfC80BCF77a43746'; meta = testMeta[2]; break;
            case 'RG01': issuerAddr = process.env.WEB3_NETWORK_ID == 56 ? '0x859C881C1C1D8062Bd0ac46b7a41Fa51140d9f5c' : '0xE6b292e9A4d691C17150C8F70046681a3F2B6060'; meta = testMeta[3]; break;
            case 'RG01B': issuerAddr = process.env.WEB3_NETWORK_ID == 56 ? '0x859C881C1C1D8062Bd0ac46b7a41Fa51140d9f5c' : '0xE6b292e9A4d691C17150C8F70046681a3F2B6060'; meta = testMeta[3]; break;
            case 'RG01C': issuerAddr = process.env.WEB3_NETWORK_ID == 56 ? '0x859C881C1C1D8062Bd0ac46b7a41Fa51140d9f5c' : '0xE6b292e9A4d691C17150C8F70046681a3F2B6060'; meta = testMeta[3]; break;
            case 'RG01D': issuerAddr = process.env.WEB3_NETWORK_ID == 56 ? '0x859C881C1C1D8062Bd0ac46b7a41Fa51140d9f5c' : '0xE6b292e9A4d691C17150C8F70046681a3F2B6060'; meta = testMeta[3]; break;
            default: throw (`Unknown contract symbol ${contractSymbol}`);
        }
        if (issuerAddr === undefined) throw('Undefined issuerAddr');
        //console.log('issuerAddr', issuerAddr);

        // check not already minted for this type - query cashflowData's issuer field
        const cfd = (await CONST.web3_call('getCashflowData', [], nameOverride));
        console.log('cfd', cfd);
        if (cfd.issuer == CONST.nullAddr) { // not yet issued
            console.log(chalk.inverse(`Minting uni-batch of ${contractSymbol} for issuer ${issuerAddr}...`));

            // mint through controller, with sample test data
            process.env.CONTRACT_TYPE = 'CASHFLOW_CONTROLLER';
            const spotTypes = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
            console.log('controller spot types', spotTypes);
            const testType = spotTypes.find(p => p.name == testTypeName);
            if (testType === undefined) throw(`Failed to find type '${testTypeName}' in controller`);
            console.log('testType', testType);
            await CONST.web3_tx('mintSecTokenBatch', [
                testType.id,
                mintQty,
                1, //mintSecTokenCount
                issuerAddr,
                CONST.nullFees,
                0, //origCcyFee_percBips_ExFee,
                Object.keys(meta),
                Object.values(meta)
            ], OWNER, OWNER_privKey);

            // read back uni-batch
            const maxBatchId = await CONST.web3_call('getSecTokenBatch_MaxId', []);
            console.log('maxBatchId', maxBatchId);
            const lastBatch = await CONST.web3_call('getSecTokenBatch', [maxBatchId]);
            console.log('lastBatch', lastBatch);

            // read issuer's ledger entry
            const issuerLedger = await CONST.web3_call('getLedgerEntry', [issuerAddr]);
            console.log('issuerLedger', issuerLedger);
        }
        else {
            console.log(chalk.gray(`${contractSymbol} already has uni-batch minted for ${cfd.issuer}; nop.`));
        }

        // set issuer values: price, and sale quantity
        console.log(chalk.inverse(`Setting uni-batch issuer values for issuer ${issuerAddr}...`));
        process.env.CONTRACT_TYPE = 'CASHFLOW_BASE';
        // var issuerPrivKey;
        // for (let ndx=0; ndx < 100 ; ndx++) {
        //     const x = await CONST.getAccountAndKey(ndx);
        //     //console.log(`${x.addr} ${issuerAddr}`);
        //     if (x.addr.toLowerCase() == issuerAddr.toLowerCase()) {
        //         issuerPrivKey = x.privKey;
        //         break;
        //     }
        // }
        // if (issuerPrivKey === undefined) throw(`Failed to lookup privkey for issuer ${issuerAddr}`);
        //const fundTx = await CONST.web3_sendEthTestAddr(0, issuerAddr, "0.02"); // fund issuer: to pay for setIssuerValues TX
        await CONST.web3_tx('setIssuerValues', [
            wei_currentPrice,
            cents_currentPrice,
            qty_saleAllocation
        ], OWNER, OWNER_privKey, nameOverride); //issuerAddr, issuerPrivKey, nameOverride);
    });

    it(`web3 direct - multi - should be able to mint multiple batches for all whitelist minters`, async function() {
        const nameOverride = process.env.ADD_TYPE__CONTRACT_NAME;
        if (!EXEC_TEST_ACTIONS) { this.skip(); return; }
        if ((await CONST.web3_call('getContractType', [], nameOverride)) != CONST.contractType.COMMODITY) { this.skip(); return; }

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

    it(`web3 direct - multi - should be able to fund (tokens & ccy), trade & withdraw (tokens & ccy) for all whitelist buyers`, async function () {
        const nameOverride = process.env.ADD_TYPE__CONTRACT_NAME;
        if (!EXEC_TEST_ACTIONS) { this.skip(); return; }
        if ((await CONST.web3_call('getContractType', [], nameOverride)) != CONST.contractType.COMMODITY) { this.skip(); return; }

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
                feeAddrOwner: CONST.nullAddr,
                   k_stIds_A: [], k_stIds_B: [],
                transferType: CONST.transferType.ADJUSTMENT,
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
                feeAddrOwner: CONST.nullAddr,
                   k_stIds_A: [], k_stIds_B: [],
                transferType: CONST.transferType.ADJUSTMENT,
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

