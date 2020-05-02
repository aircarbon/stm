const BN = require('bn.js');
const CONST = require('./const.js');
const chalk = require('chalk');

module.exports = {

    //
    // Initializes deployed contract with default values (currencies, spot token-types, and global commodity exchange fee)
    // (web3 version)
    //
    setDefaults: async () => {
        console.log(chalk.inverse('devSetupContract >> setDefaults...'));
        console.group();
        const O = await CONST.getAccountAndKey(0);

        // setup default currencies and spot token types
        if ((await CONST.web3_call('getContractType', [])) == CONST.contractType.COMMODITY) {
            const spotTypes = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
            if (spotTypes.length == 0) {
                await CONST.web3_tx('addSecTokenType', [ 'AirCarbon CORSIA Token',  CONST.settlementType.SPOT, CONST.nullFutureArgs ], O.addr, O.privKey);
                await CONST.web3_tx('addSecTokenType', [ 'AirCarbon Nature Token',  CONST.settlementType.SPOT, CONST.nullFutureArgs ], O.addr, O.privKey);
                await CONST.web3_tx('addSecTokenType', [ 'AirCarbon Premium Token', CONST.settlementType.SPOT, CONST.nullFutureArgs ], O.addr, O.privKey);
            }

            const ccyTypes = (await CONST.web3_call('getCcyTypes', [])).ccyTypes;
            if (ccyTypes.length == 0) {
                await CONST.web3_tx('addCcyType', [ 'USD', 'cents',   2 ], O.addr, O.privKey);
                await CONST.web3_tx('addCcyType', [ 'ETH', 'Wei',    18 ], O.addr, O.privKey);
                await CONST.web3_tx('addCcyType', [ 'BTC', 'Satoshi', 8 ], O.addr, O.privKey);
            }

            await CONST.web3_tx('setFee_CcyType', [ CONST.ccyType.USD, CONST.nullAddr, {...CONST.nullFees, ccy_perMillion: 300, ccy_mirrorFee: true, fee_min: 300 } ], O.addr, O.privKey);
        }
        else if (await stm.getContractType() == CONST.contractType.CASHFLOW) {
            const spotTypes = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
            if (spotTypes.length == 0) {
                await CONST.web3_tx('addSecTokenType', [ 'UNI_TOKEN',  CONST.settlementType.SPOT, CONST.nullFutureArgs ], O.addr, O.privKey);
            }

            const ccyTypes = (await CONST.web3_call('getCcyTypes', [])).ccyTypes;
            if (ccyTypes.length == 0) {
                await CONST.web3_tx('addCcyType', [ 'ETH', 'Wei',   18 ], O.addr, O.privKey);
            }
        }

        // setup default owner ledger entry
        await CONST.web3_tx('fund', [CONST.ccyType.USD, 0, O.addr], O.addr, O.privKey);
        console.groupEnd();
        console.log(chalk.inverse('devSetupContract >> DONE'));
    },
};
