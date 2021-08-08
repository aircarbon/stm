// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

const Big = require('big.js');

const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');

const CONST = require('../const.js');
const transferHelper = require('../test/transferHelper.js');
const issuanceHelper = require('../test/issuanceHelper.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;
    var OWNER, OWNER_privKey;
    var ISSUER;

    const ISSUANCE_QTY = 1000000;
    var cashflowData;

    const bondPricing = "ETH"; // TODO: switch all logic below based on this...
    var cents_currentPrice;
    var wei_currentPrice;

    const wei_perEth = new BN(web3.utils.toWei("1.0", "ether"));
    var wei_priceForOne;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.CASHFLOW_BASE) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 0;

        cashflowData = await stm.getCashflowData();
        if (cashflowData.args.cashflowType != CONST.cashflowType.BOND) this.skip();

        const x = await CONST.getAccountAndKey(0);
        OWNER = x.addr; OWNER_privKey = x.privKey;

        await setupHelper.setDefaults({ stm, accounts });

        if (bondPricing == "ETH") {
            wei_currentPrice = new BN(web3.utils.toWei("0.02", "ether"));
            cents_currentPrice = 0;
            wei_priceForOne = wei_currentPrice;
        }
        else {
            cents_currentPrice = new BN("1"); // 0.01$
            wei_currentPrice = 0;
            const ethUsdCents = (await stm.get_ethUsd()).div(new BN(1000000));
            wei_priceForOne = cents_currentPrice.mul(wei_perEth).div(ethUsdCents);
            //const eth_priceForOne = web3.utils.fromWei(wei_priceForOne.toString(), "ether");
            //console.log('ethUsdCents', ethUsdCents.toString());
            //console.log('wei_priceForOne', wei_priceForOne.toString());
            //console.log('eth_priceForOne', eth_priceForOne.toString());
            //this.skip();
        }
    });

    beforeEach(async () => {
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${OWNER})`);
    });

    it(`cashflow - issuance (${bondPricing} bond) - should not be able to subscribe when contract is not sealed`, async () => {
        try {
            await stm.send(wei_priceForOne, { from: accounts[++global.TaddrNdx] });
        } catch (ex) {  
            assert(ex.reason == 'Contract is not sealed', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance (${bondPricing} bond) - should be able to seal contract`, async () => {
        await stm.sealContract();
    });

    it(`cashflow - issuance (${bondPricing} bond) - should not handle payable tx when no issuance batch is minted`, async () => {
        try {
            await stm.send(wei_priceForOne, { from: accounts[++global.TaddrNdx] });
        } catch (ex) {  
            assert(ex.reason == 'Bad cashflow request: no minted batch', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance (${bondPricing} bond) - should be able to mint issuance batch`, async () => {
        ISSUER = accounts[++global.TaddrNdx];
        await stm.mintSecTokenBatch(1, ISSUANCE_QTY, 1, ISSUER, CONST.nullFees, 0, [], [], { from: OWNER });
    });

    it(`cashflow - issuance (${bondPricing} bond) - should not be able to subscribe when issuer price is not set`, async () => {
        try {
            await stm.send(wei_priceForOne, { from: accounts[++global.TaddrNdx] });
        } catch (ex) {  
            assert(ex.reason == 'Bad cashflow request: no price set', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance (${bondPricing} bond) - should not allow non-issuer to set issuer values`, async () => {
        try {
            await stm.setIssuerValues(wei_currentPrice, cents_currentPrice, 1, { from: accounts[++global.TaddrNdx] });
        } catch (ex) {  
            assert(ex.reason == 'Bad cashflow request: access denied', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance (${bondPricing} bond) - should not allow issuer to set invalid issuer values (sale qty > uni-batch)`, async () => {
        try {
            await stm.setIssuerValues(wei_currentPrice, cents_currentPrice, ISSUANCE_QTY + 1, { from: ISSUER });
        } catch (ex) {
            assert(ex.reason == 'Bad cashflow request: qty_saleAllocation too large', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance (${bondPricing} bond) - should not allow issuer to set invalid issuer values (usd XOR eth)`, async () => {
        try {
            await stm.setIssuerValues(1, 1, ISSUANCE_QTY, { from: ISSUER });
        } catch (ex) {
            assert(ex.reason == 'Bad cashflow request: price either in USD or ETH', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance (${bondPricing} bond) - should be able to set valid issuer values (sale qty: all uni-batch, price: ${wei_currentPrice})`, async () => {
        const qty_saleAllocation = ISSUANCE_QTY;
        await stm.setIssuerValues(wei_currentPrice, cents_currentPrice, qty_saleAllocation, { from: ISSUER });
        cashflowData = await stm.getCashflowData();
        assert(cashflowData.qty_saleAllocation == qty_saleAllocation, 'unexpected qty_saleAllocation after setting issuer values');
        assert(cashflowData.wei_currentPrice == wei_currentPrice, 'unexpected wei_currentPrice after setting issuer values');
        assert(cashflowData.cents_currentPrice == cents_currentPrice, 'unexpected cents_currentPrice after setting issuer values');
    });

    // it(`cashflow - issuance (${bondPricing} bond) - should not be able to change issuer price value for bond once set`, async () => {
    //     const qty_saleAllocation = ISSUANCE_QTY;
    //     try {
    //         if (wei_currentPrice > 0)
    //             await stm.setIssuerValues(wei_currentPrice.add(new BN(1)), cents_currentPrice, qty_saleAllocation, { from: ISSUER });
    //         else if (cents_currentPrice > 0)
    //             await stm.setIssuerValues(wei_currentPrice, cents_currentPrice.add(new BN(1)), qty_saleAllocation, { from: ISSUER });
    //     } catch (ex) {  
    //        assert(ex.reason == 'Bad cashflow request: cannot change price for bond once set', `unexpected: ${ex.reason}`);
    //        return;
    //     }
    // });
    it(`cashflow - issuance (${bondPricing} bond) - should not be able to change issuer price value for bond once set`, async () => {
        const qty_saleAllocation = ISSUANCE_QTY;
        try {
            if (wei_currentPrice > 0)
                await stm.setIssuerValues(0, 1, qty_saleAllocation, { from: ISSUER });
            else if (cents_currentPrice > 0)
                await stm.setIssuerValues(1, 0, qty_saleAllocation, { from: ISSUER });

        } catch (ex) {  
            assert(ex.reason == 'Bad cashflow request: cannot change price for bond once set', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
    
    it(`cashflow - issuance (${bondPricing} bond) - should be able to handle zero-value payable tx`, async () => {
        const SUB_1 = ++global.TaddrNdx;
        try{
            await issuanceHelper.subscribe(stm, wei_priceForOne, ISSUER, accounts[SUB_1], "0.0");
        } catch (ex) {
            assert(ex.reason == 'Bad msg.value', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance (${bondPricing} bond) - should not handle payable tx when contract is read only`, async () => {
        try {
            await stm.setReadOnly(true);
            await issuanceHelper.subscribe(stm, wei_priceForOne, 
                ISSUER,
                accounts[++global.TaddrNdx], 
                wei_priceForOne.toString() //web3.utils.fromWei(cashflowData.wei_currentPrice.toString(), 'ether')
                );
            await stm.setReadOnly(false);
        } catch (ex) {  
            await stm.setReadOnly(false);
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance (${bondPricing} bond) - should not be able to subscribe more than the uni-batch size`, async () => {
        try {
            const wei_maxSubscriptionValue = Big(
                wei_priceForOne.toString()
            ).times(Big(ISSUANCE_QTY))
            await issuanceHelper.subscribe(stm, wei_priceForOne, ISSUER, accounts[++global.TaddrNdx], 
                web3.utils.fromWei(
                    wei_maxSubscriptionValue
                    .plus(Big( // round up one token qty
                        wei_priceForOne.toString()
                    )) 
                .toFixed(), 'ether'));
        } catch (ex) {  
            assert(ex.reason == 'Bad cashflow request: insufficient quantity for sale', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance (${bondPricing} bond) - should be able to set valid issuer values (sale qty = 20% of uni-batch)`, async () => {
        const qty_saleAllocation = Math.ceil(ISSUANCE_QTY * 0.2);
        await stm.setIssuerValues(wei_currentPrice, cents_currentPrice, qty_saleAllocation, { from: ISSUER });
        cashflowData = await stm.getCashflowData();
        assert(cashflowData.qty_saleAllocation == qty_saleAllocation, 'unexpected qty_saleAllocation after setting issuer values');
        assert(cashflowData.wei_currentPrice == wei_currentPrice, 'unexpected wei_currentPrice after setting issuer values');
        assert(cashflowData.cents_currentPrice == cents_currentPrice, 'unexpected cents_currentPrice after setting issuer values');
    });

    it(`cashflow - issuance (${bondPricing} bond) - should not be able to subscribe more than the available sale qty`, async () => {
        try {
            const wei_maxSubscriptionValue = Big(
                wei_priceForOne.toString()
            ).times(Big(cashflowData.qty_saleAllocation))
            await issuanceHelper.subscribe(stm, wei_priceForOne, ISSUER, accounts[++global.TaddrNdx], 
                web3.utils.fromWei(
                    wei_maxSubscriptionValue
                    .plus(Big( // round up one token qty
                        wei_priceForOne.toString()
                    )) 
                .toFixed(), 'ether'));
        } catch (ex) {  
            assert(ex.reason == 'Bad cashflow request: insufficient quantity for sale', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance (${bondPricing} bond) - should be able to subscribe up to the available sale qty`, async () => {
        const SUB_1 = ++global.TaddrNdx;
        const wei_maxSubscriptionValue = Big(
            wei_priceForOne.toString()
        ).times(Big(cashflowData.qty_saleAllocation))
        //console.log('cashflowData.qty_saleAllocation', cashflowData.qty_saleAllocation.toString());
        const bought = await issuanceHelper.subscribe(stm, wei_priceForOne, ISSUER, accounts[SUB_1], web3.utils.fromWei(wei_maxSubscriptionValue.toFixed(), 'ether'));
        //console.log('bought', bought);
    });

    it(`cashflow - issuance (${bondPricing} bond) - should not allow issuer to set invalid issuer values (sale qty < already sold qty)`, async () => {
        try {
            cashflowData = await stm.getCashflowData();
            //console.log('cashflowData.qty_issuanceSold', cashflowData.qty_issuanceSold.toString());
            await stm.setIssuerValues(wei_currentPrice, cents_currentPrice, Big(cashflowData.qty_issuanceSold).minus(1).toFixed(), { from: ISSUER });
        } catch (ex) {  
            assert(ex.reason == 'Bad cashflow request: qty_saleAllocation too small', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    // it(`cashflow - issuance - can multi-subscribe up to max issuance`, async () => {
    //     const SUB_1 = ++global.TaddrNdx;
    //     await subscribe(ISSUER, accounts[SUB_1], "2.5");
    //     await subscribe(ISSUER, accounts[SUB_1], "2.0");
    //     await subscribe(ISSUER, accounts[SUB_1], "1.9");
    //     const SUB_2 = ++global.TaddrNdx;
    //     await subscribe(ISSUER, accounts[SUB_2], "20.5");
    //     await subscribe(ISSUER, accounts[SUB_2], "20.0");
    //     await subscribe(ISSUER, accounts[SUB_2], "10.9");
    //     const SUB_3 = ++global.TaddrNdx;
    //     await subscribe(ISSUER, accounts[SUB_3], "200.5");
    //     await subscribe(ISSUER, accounts[SUB_3], "200.0");
    //     await subscribe(ISSUER, accounts[SUB_3], "100.9");
    // });

    // // todo: move to helper
    // async function subscribe(issuer, subscriber, amount) {

    // }
});