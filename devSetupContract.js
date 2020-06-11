const BN = require('bn.js');
const CONST = require('./const.js');
const chalk = require('chalk');

module.exports = {

    //
    // Initializes the latest deployed contract with default values (currencies, spot token-types, and global commodity exchange fee)
    // (web3 version)
    //
    setDefaults: async (p) => {
        const nameOverride = p ? p.nameOverride : undefined;
        console.log(chalk.inverse('devSetupContract >> setDefaults...'));
        console.group();
        const O = await CONST.getAccountAndKey(0);

        //
        // FIXME?!/todo - retrieve bad batch id (triggers revert)...
        //    ## ropsten_infura: FAILS (Error: overflow (operation="setValue", fault="overflow", details="Number can only safely store up to 53 bits", version=4.0.41)
        //    ##     ropsten_ac: FAILS (Error: overflow (operation="setValue", fault="overflow", details="Number can only safely store up to 53 bits", version=4.0.41)
        //    ##        test_ac: FAILS (Error: overflow (operation="setValue", fault="overflow", details="Number can only safely store up to 53 bits", version=4.0.41)
        //    ganache - ok! ("revert bad batchId")
        //
        //const getSecTokenBatch0 = await CONST.web3_call('getSecTokenBatch', [0]);
        //console.log('getSecTokenBatch0', getSecTokenBatch0);

        //const name = await CONST.web3_call('name', []);
        //console.log('name', name);

        //const getSecToken0 = await CONST.web3_call('getSecToken', [0]);
        //console.log('getSecToken0', getSecToken0);

        //const getContractType = await CONST.web3_call('getContractType', []);
        //console.log('getContractType', getContractType);

        //const getSecTokenTypes = await CONST.web3_call('getSecTokenTypes', []);
        //console.log('getSecTokenTypes', getSecTokenTypes);
        //return;

        if ((await CONST.web3_call('getContractType', [], nameOverride)) == CONST.contractType.COMMODITY) {
            console.log(chalk.inverse('devSetupContract >> commodity contract...'));

            const spotTypes = (await CONST.web3_call('getSecTokenTypes', [], nameOverride)).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
            if (spotTypes.length == 0) {
                await CONST.web3_tx('addSecTokenType', [ 'AirCarbon CORSIA Token',  CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr ], O.addr, O.privKey, nameOverride);
                await CONST.web3_tx('addSecTokenType', [ 'AirCarbon Nature Token',  CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr ], O.addr, O.privKey, nameOverride);
                await CONST.web3_tx('addSecTokenType', [ 'AirCarbon Premium Token', CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr ], O.addr, O.privKey, nameOverride);
            } else console.log(chalk.gray(`Spot token types already present; nop.`));

            const ccyTypes = (await CONST.web3_call('getCcyTypes', [], nameOverride)).ccyTypes;
            if (ccyTypes.length == 0) {
                await CONST.web3_tx('addCcyType', [ 'USD', 'cents',   2 ], O.addr, O.privKey, nameOverride);
                await CONST.web3_tx('addCcyType', [ 'ETH', 'Wei',    18 ], O.addr, O.privKey, nameOverride);
                await CONST.web3_tx('addCcyType', [ 'BTC', 'Satoshi', 8 ], O.addr, O.privKey, nameOverride);
            } else console.log(chalk.gray(`Currency types already present; nop.`));

            //
            // FIXME?!/todo - read exchange fee... i.e. await CONST.web3_call('getFee', ...
            //    ## ropsten_infura: FAILS (Error: insufficient data for uint256 type (arg="fee_max", coderType="uint256", value="0x00000000", version=4.0.47))
            //    ##     ropsten_ac: FAILS (Error: insufficient data for uint256 type (arg="fee_max", coderType="uint256", value="0x00000000", version=4.0.47))
            //    ##        test_ac: FAILS (Error: insufficient data for uint256 type (arg="fee_max", coderType="uint256", value="0x00000000", version=4.0.47))
            //    ganache - ok!
            //
            //const ccyFee = await CONST.web3_call('getFee', [CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr]);
            //console.log('ccyFee', ccyFee);

            // set default exchange fee
            await CONST.web3_tx('setFee_CcyType', [ CONST.ccyType.USD, CONST.nullAddr, {...CONST.nullFees, ccy_perMillion: 300, ccy_mirrorFee: true, fee_min: 300 } ], O.addr, O.privKey);

            // create owner ledger entry
            await CONST.web3_tx('fund', [CONST.ccyType.USD, 0, O.addr], O.addr, O.privKey); 
        }
        else if (await CONST.web3_call('getContractType', [], nameOverride) == CONST.contractType.CASHFLOW) {
            console.log(chalk.inverse('devSetupContract >> base cashflow contract...'));

            // base cashflow - unitype
            const spotTypes = (await CONST.web3_call('getSecTokenTypes', [], nameOverride)).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
            if (spotTypes.length == 0) {
                await CONST.web3_tx('addSecTokenType', [ 'UNI_TOKEN',  CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr ], O.addr, O.privKey, nameOverride);
            }

            // base cashflow - does not track collateral, no ccy types at all
            ;
            
            // create owner ledger entry
            await CONST.web3_tx('setFee_TokType', [ 1, O.addr, CONST.nullFees ], O.addr, O.privKey, nameOverride);
        }
        else if (await CONST.web3_call('getContractType', [], nameOverride) == CONST.contractType.CASHFLOW_CONTROLLER) {
            console.log(chalk.inverse('devSetupContract >> cashflow controller contract...'));

            // cashflow controller - aggregates/exposes linked base cashflows as token-types - no direct token-types
            ;

            // cashflow controller - holds ledger collateral, so ccy types only here
            const ccyTypes = (await CONST.web3_call('getCcyTypes', [], nameOverride)).ccyTypes;
            if (ccyTypes.length == 0) {
                await CONST.web3_tx('addCcyType', [ 'USD', 'cents',  2 ], O.addr, O.privKey, nameOverride);
                await CONST.web3_tx('addCcyType', [ 'ETH', 'Wei',   18 ], O.addr, O.privKey, nameOverride);
            }

            // create owner ledger entry
            await CONST.web3_tx('setFee_CcyType', [ 1, O.addr, CONST.nullFees ], O.addr, O.privKey, nameOverride);
        }
        
        console.groupEnd();
        console.log(chalk.inverse('devSetupContract >> DONE'));
    },
};
