const BN = require('bn.js');
const CONST = require('./const.js');
const chalk = require('chalk');

module.exports = {

    //
    // Initializes the latest deployed contract with default values (currencies, spot token-types, and global commodity exchange fee)
    // (web3 version)
    //
    setDefaults: async () => {
        console.log(chalk.inverse('devSetupContract >> setDefaults...'));
        console.group();
        const O = await CONST.getAccountAndKey(0);

        if ((await CONST.web3_call('getContractType', [])) == CONST.contractType.COMMODITY) {
            console.log(chalk.inverse('devSetupContract >> commodity contract...'));

            const spotTypes = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
            if (spotTypes.length == 0) {
                await CONST.web3_tx('addSecTokenType', [ 'AirCarbon CORSIA Token',  CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr ], O.addr, O.privKey);
                await CONST.web3_tx('addSecTokenType', [ 'AirCarbon Nature Token',  CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr ], O.addr, O.privKey);
                await CONST.web3_tx('addSecTokenType', [ 'AirCarbon Premium Token', CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr ], O.addr, O.privKey);
            }

            const ccyTypes = (await CONST.web3_call('getCcyTypes', [])).ccyTypes;
            if (ccyTypes.length == 0) {
                await CONST.web3_tx('addCcyType', [ 'USD', 'cents',   2 ], O.addr, O.privKey);
                await CONST.web3_tx('addCcyType', [ 'ETH', 'Wei',    18 ], O.addr, O.privKey);
                await CONST.web3_tx('addCcyType', [ 'BTC', 'Satoshi', 8 ], O.addr, O.privKey);
            }

            // default exchange fee
            await CONST.web3_tx('setFee_CcyType', [ CONST.ccyType.USD, CONST.nullAddr, {...CONST.nullFees, ccy_perMillion: 300, ccy_mirrorFee: true, fee_min: 300 } ], O.addr, O.privKey);

            // owner ledger entry
            await CONST.web3_tx('fund', [CONST.ccyType.USD, 0, O.addr], O.addr, O.privKey); 
        }
        else if (await CONST.web3_call('getContractType', []) == CONST.contractType.CASHFLOW) {
            console.log(chalk.inverse('devSetupContract >> base cashflow contract...'));

            // base cashflow - unitype
            const spotTypes = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
            if (spotTypes.length == 0) {
                await CONST.web3_tx('addSecTokenType', [ 'UNI_TOKEN',  CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr ], O.addr, O.privKey);
            }

            // base cashflow - does not track collateral, no ccy types at all
            ;
            
            // owner ledger entry
            await CONST.web3_tx('setFee_TokType', [ 1, O.addr, CONST.nullFees ], O.addr, O.privKey);
        }
        else if (await CONST.web3_call('getContractType', []) == CONST.contractType.CASHFLOW_CONTROLLER) {
            console.log(chalk.inverse('devSetupContract >> cashflow controller contract...'));

            // cashflow controller - aggregates/exposes linked base cashflows as token-types - no direct token-types
            ;

            // cashflow controller - holds ledger collateral, so ccy types only here
            const ccyTypes = (await CONST.web3_call('getCcyTypes', [])).ccyTypes;
            if (ccyTypes.length == 0) {
                await CONST.web3_tx('addCcyType', [ 'USD', 'Cents',  2 ], O.addr, O.privKey);
                await CONST.web3_tx('addCcyType', [ 'ETH', 'Wei',   18 ], O.addr, O.privKey);
            }

            // owner ledger entry
            await CONST.web3_tx('setFee_CcyType', [ 1, O.addr, CONST.nullFees ], O.addr, O.privKey);
        }
        
        console.groupEnd();
        console.log(chalk.inverse('devSetupContract >> DONE'));
    },
};
