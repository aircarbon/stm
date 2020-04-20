const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const BN = require('bn.js');
const Big = require('big.js');
const CONST = require('../const.js');

module.exports = {

    // TODO: need the same in 04_Web3_MULTI_DATA... + whitelist.js

    //
    // Initializes deployed contract with default values (currencies, spot token-types, and global commodity exchange fee)
    // (truffle version)
    //
    setDefaults: async (a) => {
        const { stm, accounts,
        } = a;

        // setup default currencies and spot token types
        if (await stm.getContractType() == CONST.contractType.COMMODITY) {
            const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
            if (spotTypes.length == 0) {
                await stm.addSecTokenType(`AirCarbon CORSIA Token`, CONST.settlementType.SPOT, CONST.nullFutureArgs);
                await stm.addSecTokenType(`AirCarbon Nature Token`, CONST.settlementType.SPOT, CONST.nullFutureArgs);
                await stm.addSecTokenType(`AirCarbon Premium Token`, CONST.settlementType.SPOT, CONST.nullFutureArgs);
            }

            const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
            if (ccyTypes.length == 0) {
                await stm.addCcyType('USD', 'cents', 2);
                await stm.addCcyType('ETH', 'Wei', 18);
                await stm.addCcyType('BTC', 'Satoshi', 8);
            }

            stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, {...CONST.nullFees, ccy_perMillion: 300, ccy_mirrorFee: true, fee_min: 300 } );
        }
        else if (await stm.getContractType() == CONST.contractType.CASHFLOW) {
            const spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
            if (spotTypes.length == 0) {
                await stm.addSecTokenType(`UNI_TOKEN`, CONST.settlementType.SPOT, CONST.nullFutureArgs);
            }

            const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
            if (ccyTypes.length == 0) {
                await stm.addCcyType('ETH', 'Wei', 18);
            }
        }

        // setup default owner ledger entry
        await stm.fund(CONST.ccyType.USD, 0, accounts[0]);
    },
};
