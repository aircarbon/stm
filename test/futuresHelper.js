const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const BN = require('bn.js');
const Big = require('big.js');
const CONST = require('../const.js');

const { DateTime } = require('luxon');

module.exports = {

    openFtPos: async (a) => {
        const { stm, accounts,
                tokTypeId,
                ledger_A,     ledger_B, 
                qty_A,        qty_B,   
                price,
        } = a;

        const openFtPosTx = await stm.openFtPos( {
            tokTypeId, ledger_A, ledger_B, qty_A, qty_B, price
        }, { from: accounts[0] });

        return { 
            tx: openFtPosTx
        };
    },

};