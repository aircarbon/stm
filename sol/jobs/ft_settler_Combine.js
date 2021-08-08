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

    Combine: async (ftId, test_ledgerOwners) => {
        const O = await CONST.getAccountAndKey(0);
        const ft = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.find(p => p.id == ftId);

        // find combinable positions on this FT
        var ledgerOwners = await CONST.web3_call('getLedgerOwners', []);
        //console.log('ledgerOwners', ledgerOwners);
        //console.log('test_ledgerOwners', test_ledgerOwners);
        if (test_ledgerOwners !== undefined && test_ledgerOwners.length > 0) {
            ledgerOwners = test_ledgerOwners; //_.differenceWith(test_ledgerOwners, ledgerOwners, _.isEqual);
        }
        //console.log('ledgerOwners (test-trimmed)', ledgerOwners);

        var combines = [];
        for (let addr of ledgerOwners) {
            const le = await CONST.web3_call('getLedgerEntry', [addr]);
            const positions = le.tokens.filter(p => p.tokTypeId == ftId);
            if (positions.length > 1) {
                combines.push({
                    addr,
                    master: positions[0].stId.toString(),
                    combines: positions.slice(1).map(p => p.stId.toString()),
                    //positions,
                });
            }
        }
        //console.log('combines', combines);
        for (let p of combines) {
            //console.log('p.master', p.master);

            //const master_ST = await CONST.web3_call('getSecToken', [p.master]);
            //console.log('combine / master.ft_lastMarkPrice: ', master_ST.ft_lastMarkPrice);

            //const le_before = await CONST.web3_call('getLedgerEntry', [p.addr]);
            const { txHash, receipt, evs } = await CONST.web3_tx('combineFtPos', [{
                tokTypeId: ftId,
              master_StId: p.master,
              child_StIds: p.combines,
            }], O.addr, O.privKey);
            //const le_after = await CONST.web3_call('getLedgerEntry', [p.addr]);

            //console.log(evs);
            const ev = evs.find(p => p.event == 'Combine').returnValues;
            console.log(`${chalk.bgGray(`combine ${ev.to}`)}` + chalk.gray(` > #${ev.countTokensCombined} pos(s) [${p.combines.join(',')}] ==> stId: ${ev.masterStId}`));
        }
    },
}
