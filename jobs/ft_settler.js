require('dotenv').config();
const _ = require('lodash');
const chalk = require('chalk');

const { db } = require('../../common/dist');
const CONST = require('../const.js');

module.exports = {

    // TODO - TX: setReadOnly(true)... ?

    TakePay: async (ftId, MP, test_shortPosIds) => {
        const O = await CONST.getAccountAndKey(0);
        
        //console.group();
        const ft = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.find(p => p.id == ftId);
        //console.log(`>> TAKE/PAY: ftId=${ftId} MP=${MP}`);// ft=`, ft);

        // get all short positions on this FT
        const ledgerOwners = await CONST.web3_call('getLedgerOwners', []);
        var shortPosIds = [];
        const ops = ledgerOwners.map(async addr => {
            const le = await CONST.web3_call('getLedgerEntry', [addr]);
            const shortPositions = le.tokens.filter(p => p.tokenTypeId == ftId && p.currentQty.lt(0));
            _.forEach(shortPositions, pos => {
                shortPosIds.push(pos.stId.toString());
            });
        });
        //console.log(`ops ${ops.length} ops`);
        await Promise.all(ops);
        //console.log(`Fetched ${ledgerOwners.length} ledger entries`);
        shortPosIds.sort().reverse(); // ASC (for FIFO processing)
        
        // test mode - filter positions (only run for supplied positions created on this test run)
        if (shortPosIds !== undefined && shortPosIds.length > 0) {
            //console.log(`TEST - (filtering) test_shortPosIds: [${test_shortPosIds.join(',')}]`);
            shortPosIds = _.differenceWith(test_shortPosIds, shortPosIds, _.isEqual);
        }
        //console.log(`Short posIds: [${shortPosIds.join(',')}]`);

        // take/pay each pos-pair
        const FEE_PER_SIDE = 1; // TODO: ### 1 ccy unit for testing
        for (posId of shortPosIds) {
            
            const { txHash, receipt, evs } = await CONST.web3_tx('takePay', [ftId, posId, MP, FEE_PER_SIDE], O.addr, O.privKey);
            //console.log('ev... TakePay:', ev);
            const ev = evs.find(p => p.event == 'TakePay').returnValues;
            const itm_le = await CONST.web3_call('getLedgerEntry', [ev.itm]);
            const otm_le = await CONST.web3_call('getLedgerEntry', [ev.otm]);
            //console.log('itm_le', itm_le);
            //console.log('ft.ft.refCcyId', ft.ft.refCcyId);
            console.log(chalk.greenBright(`\
DONE=$${Number(ev.done.toString()).toFixed(0).padEnd(7)} (delta=$${Number(ev.delta.toString()).toFixed(0).padEnd(7)}) ==> \
itm: ${ev.itm} ($${Number(itm_le.ccys.find(p => p.ccyTypeId.eq(ft.ft.refCcyId)).balance.toString()).toFixed(0).padEnd(8)}) / \
otm: ${ev.otm} ($${Number(otm_le.ccys.find(p => p.ccyTypeId.eq(ft.ft.refCcyId)).balance.toString()).toFixed(0).padEnd(8)})\
`));

            // ### delta should be linear (same each cycle) -- not using lastMarkPrice ???
        }

        //console.groupEnd();
    },
}
