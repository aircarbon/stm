// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

const assert = require('assert');
//const acmJson = require('../build/contracts/StMaster.json');
//const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const chalk = require('chalk');
const BN = require('bn.js');
const  db  = require('../../orm/build');

const CONST = require('../const.js');
process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

const OWNER_NDX = 0;
var OWNER, OWNER_privKey;

describe(`Contract Web3 Interface`, async () => {

    //
    //   SD local Ganache / Dev DB
    //       ("export INSTANCE_ID=local_SD && mocha test_web3 --timeout 10000000 --exit")                 // should fail missing erc20 methods...
    //       ("export INSTANCE_ID=local_SD_RichGlory && mocha test_web3 --timeout 10000000 --exit")       // ...
    //

    // it(`web3 direct - CFT - seal & set issuer values`, async () => {
    //     var x;
    //     //const Web3 = require('web3');
    //     //const web3 = new Web3();

    //     // seal
    //     x = await CONST.getAccountAndKey(OWNER_NDX);
    //     OWNER = x.addr; OWNER_privKey = x.privKey;
    //     if (!(await CONST.web3_call('getContractSeal', []))) {
    //         const sealTx = await CONST.web3_tx('sealContract', [], OWNER, OWNER_privKey);
    //     }
    //     const { web3, ethereumTxChain } = CONST.getTestContextWeb3();
    //     // #### web3.eth.getAccounts not working on ropsten provider ####
    //     //const accounts = await web3.eth.getAccounts();
    //     //console.log(accounts);

    //     const batchCount = await CONST.web3_call('getSecTokenBatch_MaxId', []);
    //     console.log('batchCount', batchCount);
    //     if (batchCount.eq(1)) {
    //         // get minted batch
    //         const batch = await CONST.web3_call('getSecTokenBatch', [ 1 ], OWNER, OWNER_privKey);
    //         assert(batch && batch.originator, 'uni-batch not yet minted');

    //         // get batch owner index in accounts list
    //         // #### web3.eth.getAccounts not working on ropsten provider ####
    //             //const ISSUER_NDX = accounts.findIndex(p => p.toLowerCase() == batch.originator.toLowerCase());
    //             //assert(ISSUER_NDX != -1, 'failed to lookup uni-batch originator');
    //             //const { addr: ISSUER, privKey: ISSUER_privKey } = await CONST.getAccountAndKey(ISSUER_NDX);
    //             //console.log('ISSUER', ISSUER);
    //             //console.log('ISSUER_privKey', ISSUER_privKey);
    //         // hard code for now:
    //         const ISSUER = '0xda482e8afbde4ee45197a1402a0e1fd1dd175710'; // [ndx 1]
    //         const ISSUER_privKey = 'eb3441ee51074117f3d723e61239f92258cc80d04a6d23e86b172f1142e1f688';

    //         const wei_currentPrice = web3.utils.toWei("0.03", "ether");
    //         const qty_saleAllocation = 1000;
    //         const setValuesTx = await CONST.web3_tx('setIssuerValues', [
    //             wei_currentPrice, qty_saleAllocation
    //         ], ISSUER, ISSUER_privKey);
    //     }
    // });

    // erc20 fields - present on basetypes, not on controller
    it(`web3 direct - cashflow - balanceOf`, async () => {
        try {
            const data = await CONST.web3_call('balanceOf', [ '0xda482E8AFbDE4eE45197A1402a0E1Fd1DD175710' ]);
            console.log('balanceOf', data);
        }
        catch(ex) {
            if ((await CONST.web3_call('getContractType', [])) == CONST.contractType.CASHFLOW_CONTROLLER) {
                if (ex.toString().includes('is not a function')) return; // expected: erc20 methods not present on controller, by design
                assert.fail('expected contract exception');
            }
            else throw ex;
        }
    });
    it(`web3 direct - cashflow - totalSupply`, async () => {
        try {
            const data = await CONST.web3_call('totalSupply', []);
            console.log('totalSupply', data);
            }
        catch(ex) {
            if ((await CONST.web3_call('getContractType', [])) == CONST.contractType.CASHFLOW_CONTROLLER) {
                if (ex.toString().includes('is not a function')) return; // expected: erc20 methods not present on controller, by design
                assert.fail('expected contract exception');
            }
            else throw ex;
        }
    });

    // iterate over all CFT-C base types, and query base ledgers directly
    it(`web3 direct - cashflow base types - view direct ledger data of base-types`, async () => {
        CONST.consoleOutput(false);
        if ((await CONST.web3_call('getContractType', [])) != CONST.contractType.CASHFLOW_CONTROLLER) { this.skip(); return; }
        const baseTypes = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes;
        console.log('baseTypes', baseTypes);
        for (var baseType of baseTypes) {
            console.group(baseType.name);
            const ledgerOwners = await CONST.web3_call('getLedgerOwners', [], undefined/*nameOverride*/, baseType.cashflowBaseAddr/*addrOverride*/);
            for (var ledgerOwner of ledgerOwners) {
                const ledgerEntry = await CONST.web3_call('getLedgerEntry', [ledgerOwner], undefined/*nameOverride*/, baseType.cashflowBaseAddr/*addrOverride*/);

                const ccyInfo = [];
                const tokInfo = [];
                for (var ccy of ledgerEntry.ccys) {
                    ccyInfo.push(`name:${ccy.name} bal:${ccy.balance.toString()}`);
                }
                for (var token of ledgerEntry.tokens) {
                    const bn = new BN(token.stId.toString());
                    tokInfo.push(chalk.inverse(`tokTypeId:${token.tokTypeId} batchId:${token.batchId} stId:0x${bn.toString(16)} currentQty:${token.currentQty}`));
                }
                console.log(`${ledgerOwner} ${ccyInfo.join(' ')}\n\t${tokInfo.join('\n\t')}`);
            }
            console.groupEnd(baseType.name);
        }
    });
});

