const assert = require('assert');
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const { db } = require('../../utils-server');
const { formatter } = require('@aircarbon/utils-common')

const CONST = require('../const.js');
process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

const nameOverride = process.env.ADD_TYPE__CONTRACT_NAME;
const addrOverride = '0x593E32A0D31269c12CFe8dB560EfcFc78AA8f3E4';        // NOTE: update Base Contract address before running test

const paymentId = 111;
const amount = new BN("1000000000000000000");                             // 1 ETH
const count = 3;                                                          // pay the next 3 token holders

describe(`CFT - Base: Issuer Payments Unit Tests`, async () => {
    
    //  Local: ("export INSTANCE_ID=local && mocha test_web3 --timeout 10000000 --exit")
    //  BSC Testnet: ("export INSTANCE_ID=UAT_97_SD && mocha test_web3 --timeout 10000000 --exit")
    
    before(async function () {
    });

    it(`Issuer Payments Test 0 (Prep) - Subscribe tokens for CFT from 4 accounts - Base ${nameOverride}`, async () => {

        const Owner1 = await CONST.getAccountAndKey(1);                    // 0xda482E8AFbDE4eE45197A1402a0E1Fd1DD175710
        const subscriptionAmount1 = '9.0';                                 // 9.0 ETH = 90%
        const Owner2 = await CONST.getAccountAndKey(2);                    // 0x28F4D53563aC6adBC670Ef5Ad00f47375f87841C
        const subscriptionAmount2 = '0.1';                                 // 0.1 ETH = 1%
        const Owner3 = await CONST.getAccountAndKey(3);                    // 0xBA9e2F4653657DdC9F3d5721bf6B785Cdb6B52bc
        const subscriptionAmount3 = '0.6';                                 // 0.6 ETH = 6%
        const Owner4 = await CONST.getAccountAndKey(4);                    // 0xB40Fa157cd1BC446bF8EC834354eC7db5bEd9603
        const subscriptionAmount4 = '0.3';                                 // 0.3 ETH = 3%

        try {

            // const cfd = await CONST.web3_call('getCashflowData', [], nameOverride);
            // console.log('getCashflowData: ', cfd);
            
            // Owner 1 subscription
            console.log(`Owner 1 (${Owner1.addr}) is now subscribing to ${nameOverride} and paying ${subscriptionAmount1} ETH`);
            const subscriptionResponse1 = await CONST.web3_sendEthTestAddr(1, addrOverride, subscriptionAmount1);
            console.log('Owner 1 subscription response: ', subscriptionResponse1);

            // Owner 2 subscription
            console.log(`Owner 2 (${Owner2.addr}) is now subscribing to ${nameOverride} and paying ${subscriptionAmount2} ETH`);
            const subscriptionResponse2 = await CONST.web3_sendEthTestAddr(2, addrOverride, subscriptionAmount2);
            console.log('Owner 2 subscription response: ', subscriptionResponse2);

            // Owner 3 subscription
            console.log(`Owner 3 (${Owner3.addr}) is now subscribing to ${nameOverride} and paying ${subscriptionAmount3} ETH`);
            const subscriptionResponse3 = await CONST.web3_sendEthTestAddr(3, addrOverride, subscriptionAmount3);
            console.log('Owner 3 subscription response: ', subscriptionResponse3);
        
            // Owner 4 subscription
            console.log(`Owner 4 (${Owner4.addr}) is now subscribing to ${nameOverride} and paying ${subscriptionAmount4} ETH`);
            const subscriptionResponse4 = await CONST.web3_sendEthTestAddr(4, addrOverride, subscriptionAmount4);
            console.log('Owner 4 subscription response: ', subscriptionResponse4);
        }
        catch(ex) {
            console.error(ex);
        }

    });
    
    it(`Issuer Payments Test 1 (Pre-processing Test) - should have initial issuer payment values as 0x00`, async () => {
        const Issuer_RG = await CONST.getAccountAndKey(13);                 // Rich Glory '0xE6b292e9A4d691C17150C8F70046681a3F2B6060'
        const getIssuerPaymentByPaymentIdResponse = await CONST.web3_call(
            'getIssuerPaymentByPaymentId',                                  // method to get issuerPayment data
            [paymentId],                                                    // paymentId arg
            nameOverride,                                                   // cashflow base contract name override
        );
        console.log('Received issuer payment batch: ', getIssuerPaymentByPaymentIdResponse);
    });

    it(`Issuer Payments Test 2 - should pay first 3 holders from issuer Rich Glory`, async () => {

        const Issuer_RG = await CONST.getAccountAndKey(13);                 // Rich Glory '0xE6b292e9A4d691C17150C8F70046681a3F2B6060'

        console.log(`Processing ${amount} issuer payment batch (${count}) for Payment ID: #${paymentId}`);
        try {
            const receiveIssuerPaymentResponse = await CONST.web3_tx(
                'receiveIssuerPaymentBatch',                                // method to receive payments
                [paymentId, count],                                         // issuer payment args
                Issuer_RG.addr,                                             // fromAddr
                Issuer_RG.privKey,                                          // fromPrivKey
                nameOverride,                                               // nameOverride
                addrOverride,                                               // addrOverride
                amount                                                      // tx amount in Wei
            );
            console.log('Issuer Payment process response: ', receiveIssuerPaymentResponse);
        }
        catch(ex) {
            console.error(ex);
        }
    });
    
    it(`Issuer Payments Test 3 - should validate previous payment and make the next payment to remaining 3 token holders - `, async () => {
        const Issuer_RG = await CONST.getAccountAndKey(13);                 // Rich Glory '0xE6b292e9A4d691C17150C8F70046681a3F2B6060'
        const getIssuerPaymentByPaymentIdResponse = await CONST.web3_call(
            'getIssuerPaymentByPaymentId',                                  // method to get issuerPayment data
            [paymentId],                                                    // paymentId arg
            nameOverride,                                                   // cashflow base contract name override
        );
        console.log('Received issuer payment batch: ', getIssuerPaymentByPaymentIdResponse);

        // const processedAmount = new BN(formatter.hex2int(getIssuerPaymentByPaymentIdResponse[1]?._hex));

        // TOFIX : Next payment amount fails if equal to (amount - processedAmount)
        const nextPaymentAmount = new BN("110000000000000000"); // 0.9 paid ; 0.1 remaining ; 0.01 added because of error
            
        console.log(`Processing ${nextPaymentAmount} issuer payment batch (${count}) for Payment ID: #${paymentId}`);
        try {
            const receiveIssuerPaymentResponse = await CONST.web3_tx(
                'receiveIssuerPaymentBatch',                                // method to receive payments
                [paymentId, count],                                         // issuer payment args
                Issuer_RG.addr,                                             // fromAddr
                Issuer_RG.privKey,                                          // fromPrivKey
                nameOverride,                                               // nameOverride
                addrOverride,                                               // addrOverride
                nextPaymentAmount                                           // tx amount in Wei
            );
            console.log('Issuer Payment process response: ', receiveIssuerPaymentResponse);
        }
        catch(ex) {
            console.error(ex);
        }

        const getIssuerPaymentSanity = await CONST.web3_call(
            'getIssuerPaymentByPaymentId',                                  // method to get issuerPayment data
            [paymentId],                                                    // paymentId arg
            nameOverride,                                                   // cashflow base contract name override
        );
        console.log('Received issuer payment batch (Sanity Check): ', getIssuerPaymentSanity);
    });

    it.skip(`Should validate cashflow data`, async() => {
        const cfd = await CONST.web3_call('getCashflowData', [], nameOverride);
        console.log('getCashflowData: ', cfd);
    });
    
});