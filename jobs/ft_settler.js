require('dotenv').config();
const _ = require('lodash');

const { db } = require('../../common/dist');
const CONST = require('../const.js');

module.exports = {

    TakePay: async (ftId, MP) => {
        // TX: setReadOnly(true)
        
        console.group();
        console.log(`>> TAKE/PAY: ftId=${ftId} MP=${MP}...`);

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
        console.log(`Fetched ${ledgerOwners.length} ledger entries`);
        console.log(`shortPosIds`, shortPosIds.join(','));

        // *** TODO: FIFO -- order by posId ASC ***

        // take/pay each pos-pair
        for (posId of shortPosIds) {
            //
            // TX: takePay(shortFtId, MP) (long is shortFtId+1 by definition, cap pay and take amount, emit events...)
            //
            //... todo: basic truffle tests first
            //
        }

        console.groupEnd();
    },

}
