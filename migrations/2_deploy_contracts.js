const CONST = require('../const.js');
//const envFile = require('path').resolve(__dirname, "./.env." + (process.env.INSTANCE_ID !== undefined ? (process.env.INSTANCE_ID) : ''));
//require('dotenv').config( { path: envFile });

const chalk = require('chalk');
const deploymentHelper = require('./deploymentHelper');
const setup = require('../devSetupContract.js');

//
// Deploy steps: from/to, inclusive:
//    `truffle migrate -f 2 --to 2`
//
// Deploys a contract of type process.env.CONTRACT_TYPE according to defaults in const.js
// Prefixes the contract name in const.contractProps with (process.env.INSTANCE_ID || 'local'), e.g.
//    `export INSTANCE_ID=local && truffle migrate --network ropsten_ac -f 2 --to 2 --reset`
//    `export INSTANCE_ID=DEMO && truffle migrate --network ropsten_ac -f 2 --to 2 --reset`
//

module.exports = async function (deployer) {
    const O = await CONST.getAccountAndKey(0);
    // override env network ID with deployer's value
    //console.log(deployer);

    switch (process.env.INSTANCE_ID) {
        case undefined:
        case 'local': console.log(chalk.inverse(`Deploying localhost contract instance, saving to DB: ${process.env.sql_server}`)); break;
        case 'DEV': console.log(chalk.inverse(`Deploying (AWS DEV / DEV) instance, saving to DB: ${process.env.sql_server}`)); break;
        case 'DEMO': console.log(chalk.inverse(`Deploying (AWS DEV / DEMO) instance, saving to DB: ${process.env.sql_server}`)); break;
        case 'UAT': console.log(chalk.inverse(`Deploying (AWS DEV / UAT) instance, saving to DB: ${process.env.sql_server}`)); break;
        case 'TEST_AC_1': console.log(chalk.inverse(`Deploying (TEST / ACPRIVNET) instance, saving to DB: ${process.env.sql_server}`)); break;
        default: console.log(chalk.red.bold.inverse(`Unknown INSTANCE_ID (${process.env.INSTANCE_ID})`)); process.exit(1);
    }
    console.log(chalk.red('INSTANCE_ID'), process.env.INSTANCE_ID);
    console.log(chalk.red('process.env.NETWORK_ID'), process.env.NETWORK_ID);
    console.log(chalk.red('process.env.CONTRACT_TYPE'), process.env.CONTRACT_TYPE);
    const contractPrefix = (process.env.INSTANCE_ID || 'local') + '_';
    console.log(chalk.red('CONTRACT_PREFIX'), process.env.CONTRACT_PREFIX);
    console.log(chalk.red('deployer.gasPrice (gwei)'), web3.utils.fromWei(deployer.networks[deployer.network].gasPrice.toString(), "gwei"));

    // require the supplied env network_id (via INSTANCE_ID) to match the supplied deployer's network_id
    //process.env.NETWORK_ID = deployer.network_id;
    if (process.env.NETWORK_ID != deployer.network_id) {
        console.log(chalk.red.bold.inverse(`process.env.NETWORK_ID (${process.env.NETWORK_ID}) != deployer.network_id (${deployer.network_id}): please supply a .env file (through INSTANCE_ID) that matches the supplied deployer network_id.`)); 
        process.exit(1);
    }
    process.env.WEB3_NETWORK_ID = deployer.network_id;

    switch (process.env.CONTRACT_TYPE) {
        case 'CASHFLOW_CONTROLLER': 
            // base CFT type 1 - deploy a base CFT contract (an "indirect type", to be added to the controller)
            const addrBase1 = await deploymentHelper.Deploy({ deployer, artifacts, contractType: 'CASHFLOW', nameOverride: "SDax_Base1" });
            process.env.CONTRACT_TYPE = 'CASHFLOW'; await setup.setDefaults({ nameOverride: "SDax_Base1" });

            // base CFT type 2 - deploy a second base CFT contract
            const addrBase2 = await deploymentHelper.Deploy({ deployer, artifacts, contractType: 'CASHFLOW', nameOverride: "SDax_Base2" });
            process.env.CONTRACT_TYPE = 'CASHFLOW'; await setup.setDefaults({ nameOverride: "SDax_Base2" });
             
            // deploy the wrapping CFT-C contract
            const addrController = await deploymentHelper.Deploy({ deployer, artifacts, contractType: 'CASHFLOW_CONTROLLER' });
            process.env.CONTRACT_TYPE = 'CASHFLOW_CONTROLLER'; await setup.setDefaults();
 
            // link the base types into the CFT-C (add indirect types)
            console.log(chalk.inverse('addrBase1'), addrBase1);
            console.log(chalk.inverse('addrBase2'), addrBase2);
            console.log(chalk.inverse('addrController'), addrController);
            await CONST.web3_tx('addSecTokenType', [ 'CFT-Base1',  CONST.settlementType.SPOT, CONST.nullFutureArgs, addrBase1 ], O.addr, O.privKey);
            await CONST.web3_tx('addSecTokenType', [ 'CFT-Base2',  CONST.settlementType.SPOT, CONST.nullFutureArgs, addrBase2 ], O.addr, O.privKey);
            break;

                // todo -- post-deployment tests, for (a) query-types and (b) query split ledger...

        case 'CASHFLOW':
            // deploy an unattached base CASHFLOW contract
            await deploymentHelper.Deploy({ deployer, artifacts, contractType: 'CASHFLOW' });
            await setup.setDefaults();
            break;

        case 'COMMODITY': 
            // deploy a singleton COMMODITY contract
            await deploymentHelper.Deploy({ deployer, artifacts, contractType: 'COMMODITY' });
            await setup.setDefaults();
            break;

        default: throw(`Missing or unknown CONTRACT_TYPE ("${process.env.CONTRACT_TYPE}"): set to CASHFLOW, CASHFLOW_CONTROLLER, or COMMODITY.`);
    }
};
