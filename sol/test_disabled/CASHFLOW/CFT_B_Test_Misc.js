// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');

const CONST = require('../const.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;

    // ** ORDERED! **

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.CASHFLOW_BASE) this.skip();
        await stm.sealContract();
        await setupHelper.setDefaults({ stm, accounts });
        if (!global.TaddrNdx) global.TaddrNdx = 0;
    });

    beforeEach(async () => {
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`cashflow - misc - base should not be able to get currency types`, async () => {
        try{
            await stm.getCcyTypes();
        } catch (ex) {
            assert(ex.reason == undefined, `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - misc - be able to read cashflow data`, async () => {
        try{
            
            assert((await stm.getCashflowData()), "expected cashflow data on base type");
        } catch (ex) {
            assert.fail('expected cashflow data');
            return;
        }
    });

    it(`cashflow - misc - should not be able add token types`, async () => {
        try {
            await stm.addSecTokenType('NEW_TYPE_NAME', CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr);
        } catch (ex) {
            assert(ex.reason == 'Bad cashflow request', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - misc - should not be able add currency types`, async () => {
        try {
            await stm.addCcyType('TEST_COIN', 'TEST_UNIT', 2);
        } catch (ex) {
            assert(ex.reason == undefined, `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - misc - should not allow any payments unless uni-batch has been minted to issuer`, async () => {
        try {
            await stm.send(web3.utils.toWei("0.00001", "ether"), { from: accounts[0] });
        } catch (ex) {
            assert(ex.reason == 'Bad cashflow request: no minted batch', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
        // console.log('sendTx', sendTx);
        // let contractBalance = await web3.eth.getBalance(stm.address);
        // console.log('contractBalance', contractBalance);
    });

    it(`cashflow - misc - should not be able to mint more than one batch`, async () => {
        await stm.mintSecTokenBatch(1, 1000, 1, accounts[1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        try {
            await stm.mintSecTokenBatch(1, 1000, 1, accounts[1], CONST.nullFees, 0, [], [], { from: accounts[0] });
        } catch (ex) {
            assert(ex.reason == 'Bad cashflow request', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - misc - should not allow any payments when contract is read only`, async () => {
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            await stm.send(web3.utils.toWei("0.00001", "ether"), { from: accounts[0] });
        } catch (ex) {
            await stm.setReadOnly(false, { from: accounts[0] });
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            return;
        }
        await stm.setReadOnly(false, { from: accounts[0] });
        assert.fail('expected contract exception');
    });
});