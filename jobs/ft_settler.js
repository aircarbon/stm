require('dotenv').config();
const _ = require('lodash');
const chalk = require('chalk');
const BN = require('bn.js');

const { db } = require('../../common/dist');
const CONST = require('../const.js');

module.exports = {

    // TODO - TX: setReadOnly(true)... ?

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
            const positions = le.tokens.filter(p => p.tokenTypeId == ftId);
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
            //console.log(`le_before: ${p.addr} ${le_before.tokens.map(p2 => `{ TT: ${p2.tokenTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
            //console.log(`le_after: ${p.addr} ${le_after.tokens.map(p2 => `{ TT: ${p2.tokenTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);

            //console.log(evs);
            const ev = evs.find(p => p.event == 'Combine').returnValues;
            console.log(`${chalk.bgGray(`combine ${ev.to}`)}` + chalk.gray(` > #${ev.countTokensCombined} pos(s) [${p.combines.join(',')}] ==> stId: ${ev.masterStId}`));
        }
    },

    TakePay: async (ftId, MP, test_ledgerOwners) => {
        const O = await CONST.getAccountAndKey(0);
        
        //console.log('test_ledgerOwners', test_ledgerOwners);
        
        //console.group();
        const ft = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.find(p => p.id == ftId);

        // get all short positions on this FT ####
        const ledgerOwners = await CONST.web3_call('getLedgerOwners', []);
        var shortPosIds = [];
        for (let addr of ledgerOwners) {
            const le = await CONST.web3_call('getLedgerEntry', [addr]);

            // test mode - restrict accounts
            var includeAccount = true;
            if (test_ledgerOwners !== undefined) {
                if (!test_ledgerOwners.map(p => p.toLowerCase()).includes(addr.toLowerCase())) {
                    includeAccount = false;
                }
            }

            if (includeAccount) {
                //console.log(`le: ${addr} ${le.tokens.map(p2 => `{ TT: ${p2.tokenTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
                const shortPositions = le.tokens.filter(p => p.tokenTypeId == ftId && p.currentQty.lt(0));
                _.forEach(shortPositions, pos => {
                    shortPosIds.push(pos.stId.toString());
                });
            }
        }
        shortPosIds.sort().reverse(); // ASC (for FIFO processing)
        //console.log(`Short posIds: [${shortPosIds.join(',')}]`);

        // take/pay each pos-pair ####
        const FEE_PER_SIDE = 0; // TODO: ### fixed ccy unit for testing
        for (shortId of shortPosIds) {
            
            //const short_ST = await CONST.web3_call('getSecToken', [shortId]);
            //console.log(`pre TP / shortId: ${shortId}: `, short_ST);

            const { txHash, receipt, evs } = await CONST.web3_tx('takePay', [ftId, shortId, MP, FEE_PER_SIDE], O.addr, O.privKey);
            const ev = evs.find(p => p.event == 'TakePay').returnValues;
            const itm_le = await CONST.web3_call('getLedgerEntry', [ev.to]);
            const otm_le = await CONST.web3_call('getLedgerEntry', [ev.from]);
            //console.log('itm_le', itm_le);
            //console.log('ft.ft.refCcyId', ft.ft.refCcyId);
            console.log(`${chalk.inverse(`shortId ${shortId}`)}` + ` > ` +
chalk.greenBright(`\
DONE=$${Number(ev.done.toString()).toFixed(0).padEnd(7)} (delta=$${Number(ev.delta.toString()).toFixed(0).padEnd(7)}) ==> \
itm: ${chalk.dim(ev.to)} ($${Number(itm_le.ccys.find(p => p.ccyTypeId.eq(ft.ft.refCcyId)).balance.toString()).toFixed(0).padEnd(8)}) / \
otm: ${chalk.dim(ev.from)} ($${Number(otm_le.ccys.find(p => p.ccyTypeId.eq(ft.ft.refCcyId)).balance.toString()).toFixed(0).padEnd(8)})\
`));

            //const short_ST = await CONST.web3_call('getSecToken', [shortId]);
            //console.log('post TP / short_ST.ft_lastMarkPrice: ', short_ST.ft_lastMarkPrice);

            //const long_ST = await CONST.web3_call('getSecToken', [shortId+1]);
            //console.log('post TP / long_ST.ft_lastMarkPrice: ', long_ST.ft_lastMarkPrice);
        }

        //console.groupEnd();
    },
}
