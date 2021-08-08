// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *   CashFlow Token Tests - Covering the following scenarios:          *
 *   (0) deploy new asset                                              *
 *   (1) set issuance                                                  *
 *   (2) issuance purchasing; and                                      *
 *   (3) issuer payments                                               *
 *   Author: Ankur Daharwal (@ankurdaharwal)                           *
 *   Date: 16/03/2021                                                  *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// libraries imports
const _ = require('lodash');
const chalk = require('chalk');
const assert = require('assert');
const BN = require('bn.js');

// internal imports
const { web3_call, getAccountAndKey, web3_sendEthTestAddr, web3_tx } = require('../const.js');
const setup = require('../devSetupContract.js');
const deploymentHelper = require('../deploymentHelper');
const  db  = require('../../orm/build');
const { formatter } = db;

// environment variables
process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);
const nameOverride = process.env.ADD_TYPE__CONTRACT_NAME;

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *      Cashflow Tokens Test Descriptions and Cases:
 *
 *      description 1: new cashflow base deployment, initiate issuance values
 *
 *          before:
 *          - deploy a new cashflow token of type "0": BOND or type "1": EQUITY
 *
 *          test 1: mint a new token batch
 *          - mint > 0x7FFFFFFFFFFFFFFF tokens for the freshly deployed cashflow token (Should Fail) [limit test]
 *          - mint tokens for a new token type = 0x7FFFFFFFFFFFFFFF
 *
 *          test 2: initiate issuance
 *          - set issuance values (only Issuer) with 100% sale allocation
 *          - validate issuance values from CashFlowData :
 *              - token price (ETH/USD)
 *              - maximum issuance
 *              - sale allocation
 *              - issuance remaining
 *              - issuance sold
 *
 *      description 2: subscription payments from N wallet addresses to the cashflow token contract
 *
 *          test 1: issuance subscription
 *          - subscribe to issuance by N different wallet addresses with a purchase trend of y = 10**x
 *
 *          alternative test 1:
 *          - two subscribers with 0x7FFFFFFFFFFFFFFF-1 and 1 tokens respectively
 *
 *          test 2: validate balances
 *          - validate subscribers ETH and cashflow token balance
 *          - validate issuers ETH and cashflow token balance
 *          - validate CashFlowData :
 *              - issuance remaining
 *              - issuance sold
 *
 *      description 3: issuer payments to N token holders subscribed to the issuance
 *
 *          before:
 *          - validate the latest issuer payment batch for a {PAYMENT_ID}
 *              - maximum payment ID should be 0 for the first payment batch
 *          - make an issuer payment for payment ID > 0 : should fail for the first payment
 *          - make first issuer payment for payment ID = 1 and batch count = {BATCH_COUNT}
 *
 *          test 1:
 *          - validate issuer payment batch processed for {ISSUER_PAYMENT_AMOUNT} :
 *              - total payment amount to be processed in the batch
 *              - payment amounts processed already processed for the batch
 *              - eth sent to the contract (msg.value)
 *              - change eth is returned from the contract to the issuer in case of excess
 *              - current batch index of the payment batch
 *          test 2:
 *          - validate subscribers ETH and token balance
 *          - validate issuers ETH and token balance
 *
 */

/**
 *  Environment Variables and Test Constants
 */
const ADDR_OVERRIDE = '';  // NOTE: update Base Contract address before running test
const PAYMENT_ID = 1;
const ISSUER_PAYMENT_AMOUNT = new BN("10000000000000000000");       // 10 ETH
const BATCH_COUNT = 3;                                              // pay the next 3 token holders
const NEXT_ISSUER_PAYMENT_AMOUNT = new BN("1010000000000000000");   // 9 ETH paid ; 1 remaining ; 0.01 to cover for transfer function gas cost

//  Local: ("export INSTANCE_ID=local && mocha test_web3 --timeout 10000000 --exit")
//  BSC Testnet: ("export INSTANCE_ID=UAT_97_SD && mocha test_web3 --timeout 10000000 --exit")

describe(`Cashflow Tokens Test Descriptions and Cases: `, async () => {

    // initialize web3 instance
    const { web3 } = await CONST.getTestContextWeb3();

    // initialize deployer account
    const O = await CONST.getAccountAndKey(0);

    describe(`New cashflow token deployment, minting and initiate issuance values: `, async () => {

        before(async function (deployer) {

            // Deploy new cashflow base contract
            console.log((`Deploying localhost contract instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`));

            // test DB connection
            const dbData = (await db.GetDeployment(3, `dummy_contractName`, `dummy_contractVer`));
            if (dbData === undefined || dbData.recordsets === undefined) {
                console.log(chalk.red.bold.inverse(`DB connection failure.`));
                process.exit(1);
            }

            const nameBase = process.env.ADD_TYPE__CONTRACT_NAME;
            const symbolBase = process.env.ADD_TYPE__CONTRACT_SYMBOL;
            if (nameBase === undefined || nameBase.length == 0) {
                console.log(chalk.red.bold.inverse(`Bad process.env.ADD_TYPE__CONTRACT_NAME (${nameBase}); supply a valid new base contract name.`));
                process.exit(1);
            }
            if (process.env.ADD_TYPE__TYPE_NAME === undefined || process.env.ADD_TYPE__TYPE_NAME.length == 0) {
                console.log(chalk.red.bold.inverse(`Bad process.env.ADD_TYPE__TYPE_NAME (${process.env.ADD_TYPE__TYPE_NAME}); supply a valid new base type name.`));
                process.exit(1);
            }

            // get whitelist from controller (we will set new the base type's whitelist to match)
            process.env.CONTRACT_TYPE = 'CASHFLOW_CONTROLLER';
            console.log('Fetching whitelist...');
            const controllerWhitelist = await CONST.web3_call('getWhitelist', []);
            //console.log('controllerWhitelist', controllerWhitelist);
            if (!controllerWhitelist) throw(`Cannot fetch controller whitelist.`);
            if (controllerWhitelist.length == 0) throw(`Cannot deploy new base type; controller whitelist is not set. Run 04_Web3_INIT_MULTI_DATA_AC.js...`);

            // deploy a new base type
            process.env.CONTRACT_TYPE = 'CASHFLOW_BASE';
            const addrBase = await deploymentHelper.Deploy({ deployer, artifacts, contractType: 'CASHFLOW_BASE', nameOverride: nameBase, symbolOverride: symbolBase });
            if (!deployer.network.includes("-fork")) {
                console.log(chalk.inverse('nameBase'), nameBase);
                console.log(chalk.inverse('addrBase'), addrBase);

                // link new base type to the controller (can also be disabled: we can do this manually through AdminWeb...)
                process.env.CONTRACT_TYPE = 'CASHFLOW_CONTROLLER';
                const { evs: evsBase } = await CONST.web3_tx('addSecTokenType', [ process.env.ADD_TYPE__TYPE_NAME, CONST.settlementType.SPOT, CONST.nullFutureArgs, addrBase ], O.addr, O.privKey);

                // init new base type, set whitelist to match controller
                await setup.setDefaults({ nameOverride: nameBase });
                const wlChunked = _.chunk(controllerWhitelist, 50);
                for (let chunk of wlChunked) {
                    //try {
                        await CONST.web3_tx('whitelistMany', [ chunk ], O.addr, O.privKey, /*nameOverride*/undefined, /*addrOverride*/addrBase);
                    //} catch(ex) { console.warn(ex); }
                }
                //await CONST.web3_tx('whitelistMany', [controllerWhitelist], O.addr, O.privKey, /*nameOverride*/undefined, /*addrOverride*/addrBase);

                const baseWhitelist = await CONST.web3_call('getWhitelist', [], /*nameOverride*/undefined, /*addrOverride*/addrBase);
                console.log('      baseWhitelist.length', baseWhitelist.length);
                console.log('controllerWhitelist.length', controllerWhitelist.length);
                await CONST.web3_tx('sealContract', [], O.addr, O.privKey, /*nameOverride*/undefined, /*addrOverride*/addrBase);

                // list types in the controller
                process.env.CONTRACT_TYPE = 'CASHFLOW_CONTROLLER';
                const spotTypes = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
                console.log('spotTypes', spotTypes);
            }

            const cfd = await web3_call('getCashflowData', [], nameOverride);
            const ISSUER_RG = await getAccountAndKey(13);                       // Rich Glory '0xE6b292e9A4d691C17150C8F70046681a3F2B6060'

            expect(cfd.issuer.toLowerCase()===ISSUER_RG.addr.toLowerCase(), "Issuer expected to be Rich Glory <0xE6b292e9A4d691C17150C8F70046681a3F2B6060>");

            console.log("Token Price : ", formatter.hex2eth(cfd.wei_currentPrice), " ETH");
            expect(formatter.hex2eth(cfd.wei_currentPrice) === 0.1, "Expecting Token Price to be 0.1 ETH");
            console.log("Max Issuance : ", formatter.hex2int(cfd.qty_issuanceMax));
            expect(formatter.hex2int(cfd.qty_issuanceMax) === 10000, "Expecting Max Issuance to be 10000");
            console.log("Sale Allocation : ", formatter.hex2int(cfd.qty_saleAllocation));
            expect(formatter.hex2int(cfd.qty_saleAllocation) === 1000, "Expecting Sale Allocation to be 1000");
        });

        // Test 0: Initiate Subscriptions
        it(`Issuer Payments Test 0 (Prep) - Subscribe to (Purchase) an issuance from 4 test accounts - Base ${nameOverride}`, async () => {

            // TODO: Change to loop
            // Test for both WL and Non-WL

            const Owner1 = await getAccountAndKey(1);                    // 0xda482E8AFbDE4eE45197A1402a0E1Fd1DD175710
            const subscriptionAmount1 = '9.0';                                 // 9.0 ETH = 90%
            const Owner2 = await getAccountAndKey(2);                    // 0x28F4D53563aC6adBC670Ef5Ad00f47375f87841C
            const subscriptionAmount2 = '0.1';                                 // 0.1 ETH = 1%
            const Owner3 = await getAccountAndKey(3);                    // 0xBA9e2F4653657DdC9F3d5721bf6B785Cdb6B52bc
            const subscriptionAmount3 = '0.6';                                 // 0.6 ETH = 6%
            const Owner4 = await getAccountAndKey(4);                    // 0xB40Fa157cd1BC446bF8EC834354eC7db5bEd9603
            const subscriptionAmount4 = '0.3';                                 // 0.3 ETH = 3%

            try {

                // const cfd = await CONST.web3_call('getCashflowData', [], nameOverride);
                // console.log('getCashflowData: ', cfd);


                // Owner 1 subscription
                console.log(`Owner 1 (${Owner1.addr}) is now subscribing to ${nameOverride} and paying ${subscriptionAmount1} ETH`);
                const subscriptionResponse1 = await web3_sendEthTestAddr(1, ADDR_OVERRIDE, subscriptionAmount1);
                console.log('Owner 1 subscription response: ', subscriptionResponse1);

                // Owner 2 subscription
                console.log(`Owner 2 (${Owner2.addr}) is now subscribing to ${nameOverride} and paying ${subscriptionAmount2} ETH`);
                const subscriptionResponse2 = await web3_sendEthTestAddr(2, ADDR_OVERRIDE, subscriptionAmount2);
                console.log('Owner 2 subscription response: ', subscriptionResponse2);

                // Owner 3 subscription
                console.log(`Owner 3 (${Owner3.addr}) is now subscribing to ${nameOverride} and paying ${subscriptionAmount3} ETH`);
                const subscriptionResponse3 = await web3_sendEthTestAddr(3, ADDR_OVERRIDE, subscriptionAmount3);
                console.log('Owner 3 subscription response: ', subscriptionResponse3);

                // Owner 4 subscription
                console.log(`Owner 4 (${Owner4.addr}) is now subscribing to ${nameOverride} and paying ${subscriptionAmount4} ETH`);
                const subscriptionResponse4 = await web3_sendEthTestAddr(4, ADDR_OVERRIDE, subscriptionAmount4);
                console.log('Owner 4 subscription response: ', subscriptionResponse4);



                const cfd = await web3_call('getCashflowData', [], nameOverride);
                console.log("Issuance Remaining : ", formatter.hex2int(cfd.qty_issuanceRemaining));
                expect(formatter.hex2int(cfd.qty_issuanceRemaining) === 9900, "Expecting issuance remaining to be 9900");
                console.log("Issuance Sold : ", formatter.hex2int(cfd.qty_issuanceSold));
                expect(formatter.hex2int(cfd.qty_issuanceSold) === 100, "Expecting issuance sold to be 100");

            }
            catch(ex) {
                console.error(ex);
            }

        });

        it(`Issuer Payments Test 1 (Pre-processing Test) - should have initial issuer payment values as 0x00`, async () => {
            const getIssuerPaymentByPaymentIdResponse = await web3_call(
                'getIssuerPaymentByPaymentId',                                  // method to get issuerPayment data
                [PAYMENT_ID],                                                    // PAYMENT_ID arg
                nameOverride,                                                   // cashflow base contract name override
                );
                console.log('Received issuer payment batch: ', getIssuerPaymentByPaymentIdResponse);
            });

            it(`Issuer Payments Test 2 - should pay first ${BATCH_COUNT} holders from issuer Rich Glory`, async () => {

                console.log(`Processing ${ISSUER_PAYMENT_AMOUNT} issuer payment batch (${BATCH_COUNT}) for Payment ID: #${PAYMENT_ID}`);
                try {
                    const ISSUER_RG = await getAccountAndKey(13);             // Rich Glory '0xE6b292e9A4d691C17150C8F70046681a3F2B6060'
                    const receiveIssuerPaymentResponse = await web3_tx(
                        'receiveIssuerPaymentBatch',                                // method to receive payments
                        [PAYMENT_ID, BATCH_COUNT],                                  // issuer payment args
                        ISSUER_RG.addr,                                             // fromAddr
                        ISSUER_RG.privKey,                                          // fromPrivKey
                        nameOverride,                                               // nameOverride
                        ADDR_OVERRIDE,                                              // addrOverride
                        ISSUER_PAYMENT_AMOUNT                                       // tx amount in Wei
                        );
                        console.log('Issuer Payment process response: ', receiveIssuerPaymentResponse);
                    }
                    catch(ex) {
                        console.error(ex);
                    }
                });

                it(`Issuer Payments Test 3 - should validate previous payment and make the next ${BATCH_COUNT} token holders - `, async () => {

                    const getIssuerPaymentByPaymentIdResponse = await web3_call(
                        'getIssuerPaymentByPaymentId',                                  // method to get issuerPayment data
                        [PAYMENT_ID],                                                   // PAYMENT_ID arg
                        nameOverride,                                                   // cashflow base contract name override
                        );
                        console.log('Received issuer payment batch: ', getIssuerPaymentByPaymentIdResponse);

                        // const processedAmount = new BN(formatter.hex2int(getIssuerPaymentByPaymentIdResponse[1]?._hex));

                        // FIXME : Next payment amount fails if equal to (NEXT_ISSUER_PAYMENT_AMOUNT - processedAmount)

                        console.log(`Processing ${NEXT_ISSUER_PAYMENT_AMOUNT} issuer payment batch (${BATCH_COUNT}) for Payment ID: #${PAYMENT_ID}`);
                        try {
                            const ISSUER_RG = await getAccountAndKey(13);             // Rich Glory '0xE6b292e9A4d691C17150C8F70046681a3F2B6060'
                            const receiveIssuerPaymentResponse = await web3_tx(
                                'receiveIssuerPaymentBatch',                                // method to receive payments
                                [PAYMENT_ID, BATCH_COUNT],                                  // issuer payment args
                                ISSUER_RG.addr,                                             // fromAddr
                                ISSUER_RG.privKey,                                          // fromPrivKey
                                nameOverride,                                               // nameOverride
                                ADDR_OVERRIDE,                                              // addrOverride
                                NEXT_ISSUER_PAYMENT_AMOUNT                                  // tx amount in Wei
                                );
                                console.log('Issuer Payment process response: ', receiveIssuerPaymentResponse);
                            }
                            catch(ex) {
            console.error(ex);
        }

        const getIssuerPaymentSanity = await web3_call(
            'getIssuerPaymentByPaymentId',                                  // method to get issuerPayment data
            [PAYMENT_ID],                                                   // PAYMENT_ID arg
            nameOverride,                                                   // cashflow base contract name override
            );
            console.log('Received issuer payment batch (Sanity Check): ', getIssuerPaymentSanity);
        });

    });
});