require('dotenv').config();
const _ = require('lodash');
const chalk = require('chalk');
const BN = require('bn.js');

const { db } = require('../../common/dist');
const CONST = require('../const.js');

module.exports = {

    TakePay_v2: async (ftId, MP, test_ledgerOwners) => {
        const O = await CONST.getAccountAndKey(0);
        const FEE_PER_SIDE = 0; // TODO: ### fixed ccy unit for testing
        
        const ft = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.find(p => p.id == ftId);

        // get all positions on this FT, group by short/long
        const ledgerOwners = await CONST.web3_call('getLedgerOwners', []);
        var shortIds = [], longIds = [];
        for (let addr of ledgerOwners) {
            const le = await CONST.web3_call('getLedgerEntry', [addr]);
            var includeAccount = true;
            if (test_ledgerOwners !== undefined) { // test mode - restrict accounts
                if (!test_ledgerOwners.map(p => p.toLowerCase()).includes(addr.toLowerCase())) {
                    includeAccount = false;
                }
            }
            if (includeAccount) {
                //console.log(`le: ${addr} ${le.tokens.map(p2 => `{ TT: ${p2.tokenTypeId} / stId: ${p2.stId} / P: ${p2.ft_price.toString()} / M_qty:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`);
                const shorts = le.tokens.filter(p => p.tokenTypeId == ftId && p.currentQty.lt(0));
                const longs = le.tokens.filter(p => p.tokenTypeId == ftId && p.currentQty.gt(0));
                shortIds = shortIds.concat(shorts.map(p => p.stId.toString()));
                longIds = longIds.concat(longs.map(p => p.stId.toString()));
            }
        }
        // FIFO: sort id ASC
        shortIds.sort().reverse();
        longIds.sort().reverse();

        // settle shorts
        for (shortId of shortIds) {
            await runTakePay(O, ft, ftId, shortId, MP, FEE_PER_SIDE, "-");
        }

        // settle longs
        for (longId of longIds) {
            await runTakePay(O, ft, ftId, longId, MP, FEE_PER_SIDE, "+");
        }
    },
}

async function runTakePay(O, ft, ftId, posId, MP, FEE_PER_SIDE, SIDE) {
    const { txHash, receipt, evs } = await CONST.web3_tx('takePay2', [ftId, posId, MP, FEE_PER_SIDE], O.addr, O.privKey);
    const ev = evs.find(p => p.event == 'TakePay2').returnValues;
    const to_le = await CONST.web3_call('getLedgerEntry', [ev.to]);
    const from_le = await CONST.web3_call('getLedgerEntry', [ev.from]);
    const to_desc = ev.to.toLowerCase() == O.addr.toLowerCase() ? "C" : SIDE;
    const from_desc = ev.from.toLowerCase() == O.addr.toLowerCase() ? "C" : SIDE;
    
    console.log(`${chalk.dim(`${SIDE} stId:${posId.padEnd(3)}`)}` + ` > ` +
chalk.greenBright(`\
(${from_desc}) ${chalk.dim(ev.from)} ($${Number(from_le.ccys.find(p => p.ccyTypeId.eq(ft.ft.refCcyId)).balance.toString()).toFixed(0).padEnd(8)}) ==> \
[DONE=$${Number(ev.done.toString()).toFixed(0).padStart(7)} /delta=$${Number(ev.delta.toString()).toFixed(0).padEnd(7)})] ==> \
(${to_desc}) ${chalk.dim(ev.to)} ($${Number(to_le.ccys.find(p => p.ccyTypeId.eq(ft.ft.refCcyId)).balance.toString()).toFixed(0).padEnd(8)})\
`));
}
