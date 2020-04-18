require('dotenv').config();
const _ = require('lodash');

const { db } = require('../../common/dist');
const CONST = require('../const.js');

module.exports = {

    // TODO - TX: setReadOnly(true)... ?

    TakePay: async (ftId, MP, test_shortPosIds) => {
        const O = await CONST.getAccountAndKey(0);
        
        console.group();
        //console.log(`>> TAKE/PAY: ftId=${ftId} MP=${MP}...`);

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
        const FEE_PER_SIDE = 25; // TODO: ### $0.25 - assumes FT ref ccy is $ ###
        for (posId of shortPosIds) {
            
            // TX: takePay(shortFtId, MP) (long is shortFtId+1 by definition, cap pay and take amount, emit events...)
            const { txHash, receipt, evs } = await CONST.web3_tx('takePay', [ftId, posId, MP, FEE_PER_SIDE], O.addr, O.privKey);
            console.log('ev... TakePay:', evs.find(p => p.event == 'TakePay').returnValues); //... map from accounts to TEST_PARTICIPANT IDs?
        }

        console.groupEnd();
    },
}
