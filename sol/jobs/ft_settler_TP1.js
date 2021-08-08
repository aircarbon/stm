// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9
// PAUSED

require('dotenv').config();
const _ = require('lodash');
const chalk = require('chalk');
const BN = require('bn.js');

const  db  = require('../../orm/build');
const CONST = require('../const.js');

module.exports = {

    // pair-wise marking: deprecated/broken by pos-combine

//     TakePay_v1: async (ftId, MP, test_ledgerOwners) => {
//         const O = await CONST.getAccountAndKey(0);

//         //console.log('test_ledgerOwners', test_ledgerOwners);

//         //console.group();
//         const ft = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.find(p => p.id == ftId);

//         // get all short positions on this FT
//         const ledgerOwners = await CONST.web3_call('getLedgerOwners', []);
//         var shortPosIds = [];
//         for (let addr of ledgerOwners) {
//             const le = await CONST.web3_call('getLedgerEntry', [addr]);

//             // test mode - restrict accounts
//             var includeAccount = true;
//             if (test_ledgerOwners !== undefined) {
//                 if (!test_ledgerOwners.map(p => p.toLowerCase()).includes(addr.toLowerCase())) {
//                     includeAccount = false;
//                 }
//             }

//             if (includeAccount) {
//                 //console.log(`le: ${addr} ${le.tokens.map(p2 => `{ TT: ${p2.tokTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
//                 const shortPositions = le.tokens.filter(p => p.tokTypeId == ftId && p.currentQty.lt(0));
//                 _.forEach(shortPositions, pos => {
//                     shortPosIds.push(pos.stId.toString());
//                 });
//             }
//         }
//         shortPosIds.sort().reverse(); // ASC (for FIFO processing)
//         //console.log(`Short posIds: [${shortPosIds.join(',')}]`);

//         // take/pay each pos-pair
//         const FEE_PER_SIDE = 0; // TODO: ### fixed ccy unit for testing
//         for (shortId of shortPosIds) {

//             //const short_ST = await CONST.web3_call('getSecToken', [shortId]);
//             //console.log(`pre TP / shortId: ${shortId}: `, short_ST);

//             const { txHash, receipt, evs } = await CONST.web3_tx('takePay', [ftId, shortId, MP, FEE_PER_SIDE], O.addr, O.privKey);
//             const ev = evs.find(p => p.event == 'TakePay').returnValues;
//             const itm_le = await CONST.web3_call('getLedgerEntry', [ev.to]);
//             const otm_le = await CONST.web3_call('getLedgerEntry', [ev.from]);
//             //console.log('itm_le', itm_le);
//             //console.log('ft.ft.refCcyId', ft.ft.refCcyId);
//             console.log(`${chalk.inverse(`shortId ${shortId}`)}` + ` > ` +
// chalk.greenBright(`\
// DONE=$${Number(ev.done.toString()).toFixed(0).padEnd(7)} (delta=$${Number(ev.delta.toString()).toFixed(0).padEnd(7)}) ==> \
// itm: ${chalk.dim(ev.to)} ($${Number(itm_le.ccys.find(p => p.ccyTypeId.eq(ft.ft.refCcyId)).balance.toString()).toFixed(0).padEnd(8)}) / \
// otm: ${chalk.dim(ev.from)} ($${Number(otm_le.ccys.find(p => p.ccyTypeId.eq(ft.ft.refCcyId)).balance.toString()).toFixed(0).padEnd(8)})\
// `));

//             //const short_ST = await CONST.web3_call('getSecToken', [shortId]);
//             //console.log('post TP / short_ST.ft_lastMarkPrice: ', short_ST.ft_lastMarkPrice);

//             //const long_ST = await CONST.web3_call('getSecToken', [shortId+1]);
//             //console.log('post TP / long_ST.ft_lastMarkPrice: ', long_ST.ft_lastMarkPrice);
//         }

//         //console.groupEnd();
//     },
}
