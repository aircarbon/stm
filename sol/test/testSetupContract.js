// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const BN = require('bn.js');
const Big = require('big.js');
const CONST = require('../const.js');

module.exports = {

    //
    // Initializes deployed contract with default values (currencies, spot token-types, and global commodity exchange fee)
    // (truffle version -- see devSetupContract.js for master web3 implementation)
    //
    setDefaults: async (a) => {
        const { stm, accounts,
        } = a;

        // setup default currencies and spot token types
        if (await stm.getContractType() == CONST.contractType.COMMODITY) {
            console.log('truffle setDefaults (COMMODITY)...');
            const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
            if (spotTypes.length == 0) {
                await stm.addSecTokenType(`AirCarbon CORSIA Token`, CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr);
                await stm.addSecTokenType(`AirCarbon Nature Token`, CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr);
                await stm.addSecTokenType(`AirCarbon Premium Token`, CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr);
            }

            const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
            if (ccyTypes.length == 0) {
                await stm.addCcyType('USD', 'cents', 2);
                await stm.addCcyType('ETH', 'Wei', 18);
                await stm.addCcyType('BTC', 'Satoshi', 8);
            }

            stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, {...CONST.nullFees, ccy_perMillion: 300, ccy_mirrorFee: true, fee_min: 300 } );
        }
        else if (await stm.getContractType() == CONST.contractType.CASHFLOW_BASE) {
            // console.log('truffle setDefaults (CASHFLOW_BASE)...');
            // await stm.sealContract(); // always sealed - the controller governs the whitelist
            // const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
            // if (spotTypes.length == 0) {
            //     await stm.addSecTokenType(`UNI_TOKEN`, CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr);
            // }
            // stm.setFee_TokType(1, accounts[0], CONST.nullFees);
        }
        else if (await stm.getContractType() == CONST.contractType.CASHFLOW_CONTROLLER) {
            console.log('truffle setDefaults (CASHFLOW_CONTROLLER)...');
            const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
            if (ccyTypes.length == 0) {
                await stm.addCcyType('USD', 'cents', 2);
                await stm.addCcyType('ETH', 'Wei', 18);
            }
            stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, CONST.nullFees);
        }

        // setup default owner ledger entry
        //await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, 0, accounts[0], 'TEST');
    },

    whitelistAndSeal: async (a) => {
        const { stm, accounts, } = a;

        const CHUNK_SIZE = 100;
        const CHUNKS = 5;
        //console.log(`accounts: #${accounts.length}`);
        for (var i=0; i < CHUNKS; i++) {
            await stm.whitelistMany(accounts.slice(i * CHUNK_SIZE, (i+1) * CHUNK_SIZE));
        }
        const wl = await stm.getWhitelist();
        //console.log(`WL: #${wl.length}`);
        await stm.sealContract();
    }
};
