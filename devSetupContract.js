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

            // add spot types
            const spotTypes = (await CONST.web3_call('getSecTokenTypes', [], nameOverride)).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
            console.log('spotTypes', spotTypes.map(p => { return { id: p.id, name: p.name } }));
            async function addSecTokenIfNotPresent(spotTypes, name, O) {
                if (!spotTypes.some(p => p.name == name)) { await CONST.web3_tx('addSecTokenType', [ name, CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr ], O.addr, O.privKey, nameOverride); }
                else console.log(chalk.gray(`${name} already present; nop.`));
            }
            await addSecTokenIfNotPresent(spotTypes, 'AirCarbon CORSIA Token', O);
            await addSecTokenIfNotPresent(spotTypes, 'AirCarbon Nature Token', O);
            await addSecTokenIfNotPresent(spotTypes, 'AirCarbon Premium Token', O);

            // ad ccy types
            const ccyTypes = (await CONST.web3_call('getCcyTypes', [], nameOverride)).ccyTypes;
            console.log('ccyTypes', ccyTypes.map(p => { return { id: p.id, name: p.name } }));
            async function addCcyIfNotPresent(ccyTypes, name, unit, decimals, O) {
                if (!ccyTypes.some(p => p.name == name)) {
                    await CONST.web3_tx('addCcyType', [ name, unit, decimals ], O.addr, O.privKey, nameOverride);
                } else console.log(chalk.gray(`${name} already present; nop.`));
            }
            await addCcyIfNotPresent(ccyTypes, 'USD', 'cents', 2, O);
            await addCcyIfNotPresent(ccyTypes, 'ETH', 'Wei', 18, O);
            await addCcyIfNotPresent(ccyTypes, 'BTC', 'Satoshi', 8, O);

            //
            // set default exchange fee -- FAILS *EVERYWHERE* ...
            //    ## ropsten_infura: FAILS (Error: insufficient data for uint256 type (arg="fee_max", coderType="uint256", value="0x00000000", version=4.0.47))
            //    ##     ropsten_ac: FAILS (Error: insufficient data for uint256 type (arg="fee_max", coderType="uint256", value="0x00000000", version=4.0.47))
            //    ##     mainnet_ac: FAILS (Error: insufficient data for uint256 type (arg="fee_max", coderType="uint256", value="0x00000000", version=4.0.47))
            //    ##        test_ac: FAILS (Error: insufficient data for uint256 type (arg="fee_max", coderType="uint256", value="0x00000000", version=4.0.47))
            //    ## mainnet_infura: FAILS (Error: insufficient data for uint256 type (arg="fee_max", coderType="uint256", value="0x00000000", version=4.0.47))
            // "web3": "^2.0.0-alpha.1" / https://ac-dev0.net:10545 /  #### Error: insufficient data for uint256 ####
            //" web3": "^2.0.0-alpha.1" / https://mainnet.infura.io/v3/25a36609b48744bdaa0639e7c2b008d9 /   #### Error: insufficient data for uint256 ####
            // 
            // TODO: try repro/fix on test_ac... / DEMO

            // problem type = StructLib.SetFeeArgs (on return only?) -- seems ok passing IN to setFee_CcyType...
            const test1 = (await CONST.web3_call('getFee', [CONST.getFeeType.CCY, CONST.ccyType.USD, O.addr], nameOverride));

            const usdFee = (await CONST.web3_call('getFee', [CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr], nameOverride));
            console.log('usdFee', usdFee);
            await CONST.web3_tx('setFee_CcyType', [ CONST.ccyType.USD, CONST.nullAddr, {...CONST.nullFees, ccy_perMillion: 300, ccy_mirrorFee: true, fee_min: 300 } ], O.addr, O.privKey);

            // create owner ledger entry
            //const ownerLedger = (await CONST.web3_call('getLedgerEntry', [O.addr], nameOverride));
            //console.log('ownerLedger', ownerLedger);
            // await CONST.web3_tx('fundOrWithdraw', [ CONST.fundWithdrawType.FUND, CONST.ccyType.USD, 0, O.addr, 'DEV_INIT' ], O.addr, O.privKey); 
        }
        else if (await CONST.web3_call('getContractType', [], nameOverride) == CONST.contractType.CASHFLOW_BASE) {
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
