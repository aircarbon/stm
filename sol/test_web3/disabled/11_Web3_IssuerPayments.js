// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

const assert = require('assert');
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const { db } = require('../../utils-server');
const { formatter } = require('@aircarbon/utils-common')

const CONST = require('../const.js');
process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

const NAME_OVERRIDE = process.env.ADD_TYPE__CONTRACT_NAME;
const ADDR_OVERRIDE = '0x57C70113c77162Da15f2D5F2838F880e9f80ad6B';  // NOTE: update Base Contract address before running test
const ISSUER_PAYMENT_AMOUNT = new BN("10000000000000000000");       // 10 ETH
const BATCH_COUNT = 3;                                              // pay the next 3 token holders
const NEXT_ISSUER_PAYMENT_AMOUNT = new BN("1000000000000000000");   // 9 ETH paid ; Next payment 1 ETH

/* * * * * * * * * * * * * * * *
 * Issuer Payments Test Cases:
 * 
 *      0) Subscribe tokens for an asset type
 *      1) Check issuer payment batch for a {PAYMENT_ID} (Sanity test)
 *      2) Make issuer payments for {BATCH_COUNT} token holders
 *      3) Validate issuer payment batch processed amount for {PAYMENT_ID}
 *          3a) Make next issuer payment for {BATCH_COUNT} token holders
 *          3b) Validate issuer payment batch processed amount for {PAYMENT_ID}
 *      4) Optional: Validate Cashflow Data
 * 
 *      New Tests -
 *      1) Mint tokens for a new token type > 2 ^ 128 (Should Fail)
 *      2) Mint tokens for a new token type = 2 ^ 128 -1
 *          2a) Set sale allocation as 100%
 *          2b) Subscription model: 
 *              Token Holder 1 subscribes to {all tokens - 1}
 *              Token Holder 2: subscribes to 1 token
 *      3) Make issuer payment of 100 ETH
 *          3a) Token Holder 1 should receive : 99.999999999999999 ETH
 *          3b) Token Holder 2 should receive : 00.000000000000001 ETH
 * 
 */

describe(`CFT - Base: Issuer Payments Unit Tests`, async () => {
    
    //  Local: ("export INSTANCE_ID=local && mocha test_web3 --timeout 10000000 --exit")
    //  BSC Testnet: ("export INSTANCE_ID=UAT_97_SD && mocha test_web3 --timeout 10000000 --exit")
    
    before(async function () {
        const cfd = await CONST.web3_call('getCashflowData', [], NAME_OVERRIDE);
        console.log('getCashflowData: ', cfd);
    });

    it(`Issuer Payments Test 0 (Prep) - Subscribe tokens for CFT from 4 accounts - Base ${NAME_OVERRIDE}`, async () => {

        const Owner1 = await CONST.getAccountAndKey(1);                    // 0xda482E8AFbDE4eE45197A1402a0E1Fd1DD175710
        const subscriptionAmount1 = '9.0';                                 // 9.0 ETH = 90%
        const Owner2 = await CONST.getAccountAndKey(2);                    // 0x28F4D53563aC6adBC670Ef5Ad00f47375f87841C
        const subscriptionAmount2 = '0.1';                                 // 0.1 ETH = 1%
        const Owner3 = await CONST.getAccountAndKey(3);                    // 0xBA9e2F4653657DdC9F3d5721bf6B785Cdb6B52bc
        const subscriptionAmount3 = '0.6';                                 // 0.6 ETH = 6%
        const Owner4 = await CONST.getAccountAndKey(4);                    // 0xB40Fa157cd1BC446bF8EC834354eC7db5bEd9603
        const subscriptionAmount4 = '0.3';                                 // 0.3 ETH = 3%

        try {

            // const cfd = await CONST.web3_call('getCashflowData', [], NAME_OVERRIDE);
            // console.log('getCashflowData: ', cfd);
            
            // Owner 1 subscription
            console.log(`Owner 1 (${Owner1.addr}) is now subscribing to ${NAME_OVERRIDE} and paying ${subscriptionAmount1} ETH`);
            const subscriptionResponse1 = await CONST.web3_sendEthTestAddr(1, ADDR_OVERRIDE, subscriptionAmount1);
            console.log('Owner 1 subscription response: ', subscriptionResponse1);

            // Owner 2 subscription
            console.log(`Owner 2 (${Owner2.addr}) is now subscribing to ${NAME_OVERRIDE} and paying ${subscriptionAmount2} ETH`);
            const subscriptionResponse2 = await CONST.web3_sendEthTestAddr(2, ADDR_OVERRIDE, subscriptionAmount2);
            console.log('Owner 2 subscription response: ', subscriptionResponse2);

            // Owner 3 subscription
            console.log(`Owner 3 (${Owner3.addr}) is now subscribing to ${NAME_OVERRIDE} and paying ${subscriptionAmount3} ETH`);
            const subscriptionResponse3 = await CONST.web3_sendEthTestAddr(3, ADDR_OVERRIDE, subscriptionAmount3);
            console.log('Owner 3 subscription response: ', subscriptionResponse3);
        
            // Owner 4 subscription
            console.log(`Owner 4 (${Owner4.addr}) is now subscribing to ${NAME_OVERRIDE} and paying ${subscriptionAmount4} ETH`);
            const subscriptionResponse4 = await CONST.web3_sendEthTestAddr(4, ADDR_OVERRIDE, subscriptionAmount4);
            console.log('Owner 4 subscription response: ', subscriptionResponse4);
        }
        catch(ex) {
            console.error(ex);
        }

    });
    
    it(`Issuer Payments Test 1 (Pre-processing Test) - should have initial issuer payment values as 0x00`, async () => {
        const Issuer_RG = await CONST.getAccountAndKey(13);                 // Rich Glory '0xE6b292e9A4d691C17150C8F70046681a3F2B6060'
        const getIssuerPaymentBatchResponse = await CONST.web3_call(
            'getIssuerPaymentBatch',                                        // method to get issuerPayment data
            [],                                                             // paymentId arg
            NAME_OVERRIDE,                                                  // cashflow base contract name override
        );
        console.log('Received issuer payment batch: ', getIssuerPaymentBatchResponse);
    });

    it(`Issuer Payments Test 2 - should pay first 3 holders from issuer Rich Glory`, async () => {

        const Issuer_RG = await CONST.getAccountAndKey(13);                 // Rich Glory '0xE6b292e9A4d691C17150C8F70046681a3F2B6060'

        console.log(`Processing ${ISSUER_PAYMENT_AMOUNT} issuer payment batch (${BATCH_COUNT})`);
        try {
            const receiveIssuerPaymentResponse = await CONST.web3_tx(
                'receiveIssuerPaymentBatch',                                // method to receive payments
                [BATCH_COUNT],                                              // issuer payment args
                Issuer_RG.addr,                                             // fromAddr
                Issuer_RG.privKey,                                          // fromPrivKey
                NAME_OVERRIDE,                                              // nameOverride
                ADDR_OVERRIDE,                                              // addrOverride
                ISSUER_PAYMENT_AMOUNT                                       // tx amount in Wei
            );
            console.log('Issuer Payment process response: ', receiveIssuerPaymentResponse);
        }
        catch(ex) {
            console.error(ex);
        }
    });
    
    it(`Issuer Payments Test 3 - should validate previous payment and make the next payment to remaining 3 token holders - `, async () => {
        const Issuer_RG = await CONST.getAccountAndKey(13);                 // Rich Glory '0xE6b292e9A4d691C17150C8F70046681a3F2B6060'
        const getIssuerPaymentBatchResponse = await CONST.web3_call(
            'getIssuerPaymentBatch',                                        // method to get issuerPayment data
            [],                                                             // paymentId arg
            NAME_OVERRIDE,                                                  // cashflow base contract name override
        );
        console.log('Received issuer payment batch: ', getIssuerPaymentBatchResponse);
            
        console.log(`Processing ${NEXT_ISSUER_PAYMENT_AMOUNT} issuer payment batch (${BATCH_COUNT})`);
        try {
            const receiveIssuerPaymentResponse = await CONST.web3_tx(
                'receiveIssuerPaymentBatch',                                // method to receive payments
                [BATCH_COUNT],                                              // issuer payment args
                Issuer_RG.addr,                                             // fromAddr
                Issuer_RG.privKey,                                          // fromPrivKey
                NAME_OVERRIDE,                                              // nameOverride
                ADDR_OVERRIDE,                                              // addrOverride
                NEXT_ISSUER_PAYMENT_AMOUNT                                  // tx amount in Wei
            );
            console.log('Issuer Payment process response: ', receiveIssuerPaymentResponse);
        }
        catch(ex) {
            console.error(ex);
        }

        const getIssuerPaymentBatchForSanity = await CONST.web3_call(
            'getIssuerPaymentBatch',                                        // method to get issuerPayment data
            [],                                                             // paymentId arg
            NAME_OVERRIDE,                                                  // cashflow base contract name override
        );
        console.log('Received issuer payment batch: ', getIssuerPaymentBatchForSanity);
    });
    
});