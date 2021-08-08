// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: (CASHFLOW_BASE) StMaster.sol, StErc20.sol => Erc20Lib.sol, TransferLib.sol, LedgerLib.sol
const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const chalk = require('chalk');

const CONST = require('../const.js');
const setupHelper = require('../test/testSetupContract.js');
const transferHelper = require('./transferHelper.js');

//
// tests flow for CFT-B (cashflow-token base types)
//  (the only direct function that CFT-B contracts support is ERC20 ops...)
//

// TODO... send self-sign + approve flow, direct on base types...

contract("StMaster", accounts => {
    var stm, curHash;

    const M1 = accounts[1];

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.CASHFLOW_CONTROLLER) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 10;

        // whitelist & seal controller
        const wlAddrs = accounts.slice(0, global.TaddrNdx + 50);
        await stm.whitelistMany(wlAddrs);
        await stm.sealContract();

        // whitelist & seal base types
        const types = (await stm.getSecTokenTypes()).tokenTypes;
        const O = await CONST.getAccountAndKey(0);
        for (var type of types) {
            await CONST.web3_tx('whitelistMany', [wlAddrs], O.addr, O.privKey, /*nameOverride*/undefined, /*addrOverride*/type.cashflowBaseAddr);
            await CONST.web3_tx('sealContract', [], O.addr, O.privKey, /*nameOverride*/undefined, /*addrOverride*/type.cashflowBaseAddr);
        }

        curHash = await CONST.getLedgerHashcode(stm);
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    //
    // ORDERED
    //

    // indirect types & minting
    it(`cashflow base - erc20 - ...`, async () => {
        const types = (await stm.getSecTokenTypes()).tokenTypes;
        assert(types.length == 2);
    });

    async function mintBatchWithMetadata({ tokenType, qtyUnit, qtySecTokens, receiver, origTokFees, origCcyFee_percBips_ExFee, metaKeys, metaValues }) {
        const mintTx = await stm.mintSecTokenBatch(
            tokenType, qtyUnit, qtySecTokens, receiver, origTokFees, origCcyFee_percBips_ExFee, metaKeys, metaValues,
            //0,
        { from: accounts[0] });
        //truffleAssert.prettyPrintEmittedEvents(mintTx);

        const batchId = (await stm.getSecTokenBatch_MaxId.call()).toNumber();
        //console.log('batchId', batchId);
        
        const batch = await stm.getSecTokenBatch(batchId);
        //console.log('batch', batch);
        
        const batchKeys = batch.metaKeys;
        const batchValues = batch.metaValues;
        //console.dir(batchKeys);
        //console.dir(batchValues);

        assert(batchKeys.length == metaKeys.length, 'batch/supplied meta keys length mismatch');
        assert(batchValues.length == metaValues.length, 'batch/supplied meta values length mismatch');
        for (var i=0 ; i < batchKeys.length ; i++) {
            assert(batchKeys[i] == metaKeys[i], `batch/supplied meta key mismatch at position ${i}`);
        }
        for (var i=0 ; i < batchValues.length ; i++) {
            assert(batchValues[i] == metaValues[i], `batch/supplied meta value mismatch at position ${i}`);
        }
        return { batchId, mintTx };
    }

    async function checkHashUpdate(curHash) {
        newHash = await CONST.getLedgerHashcode(stm);
        assert(newHash.toString() != curHash.toString(), `expected ledger hashcode change (newHash=${newHash}, curHash=${curHash})`);
        return newHash;
    }
});