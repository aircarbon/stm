require('dotenv').config( { path: require('path').resolve(__dirname, "../.env." + (process.env.INSTANCE_ID !== undefined ? process.env.INSTANCE_ID : 'local')) });
const chalk = require('chalk');
const deploymentHelper = require('./deploymentHelper');
const setup = require('../devSetupContract.js');

//
// Deploy steps: from/to, inclusive:
//    `truffle migrate -f 2 --to 2`
//
// Deploys a contract of type process.env.CONTRACT_TYPE according to defaults in const.js
// Prefixes the contract name in const.contractProps with (process.env.INSTANCE_ID || 'local'), e.g.
//    `export INSTANCE_ID=DEMO && truffle migrate --network ropsten_ac -f 2 --to 2 --reset`
//    `unset INSTANCE_ID && truffle migrate --network ropsten_ac -f 2 --to 2 --reset`
//
// todo: need to pick named .env file, for DB connection
//

module.exports = async function (deployer) {
    console.log(chalk.red('INSTANCE_ID'), process.env.INSTANCE_ID);
    switch (process.env.INSTANCE_ID) {
        case undefined:
        case 'local': console.log(chalk.inverse(`Deploying localhost contract instance, saving to DB: ${process.env.sql_server}`)); break;
        case 'DEV': console.log(chalk.inverse(`Deploying (AWS DEV/DEV) instance prefix, saving to DB: ${process.env.sql_server}`)); break;
        case 'DEMO': console.log(chalk.inverse(`Deploying (AWS DEV/DEMO) instance prefix, saving to DB: ${process.env.sql_server}`)); break;
        case 'UAT': console.log(chalk.inverse(`Deploying (AWS DEV/UAT) instance prefix, saving to DB: ${process.env.sql_server}`)); break;
        default: console.log(chalk.red.bold.inverse('Unknown INSTANCE_ID')); process.exit(1);
    }
    console.log(chalk.red('NETWORK_ID'), process.env.NETWORK_ID);
    console.log(chalk.red('CONTRACT_TYPE'), process.env.CONTRACT_TYPE);
    const contractPrefix = (process.env.INSTANCE_ID || 'local') + '_';
    console.log(chalk.red('CONTRACT_PREFIX'), process.env.CONTRACT_PREFIX);
    //process.exit(1);

    // setup
    process.env.NETWORK_ID = deployer.network_id;
    process.env.WEB3_NETWORK_ID = deployer.network_id;
    console.log('== SecTokMaster == DEPLOY...');
    switch (process.env.CONTRACT_TYPE) {
        
        case 'CASHFLOW_CONTROLLER':
            // first deploy a base CASHFLOW contract
            const addrBase = await deploymentHelper.Deploy({ deployer, artifacts, contractType: 'CASHFLOW' });
            process.env.CONTRACT_TYPE = 'CASHFLOW'; await setup.setDefaults();
            
            // then deploy wrapper CASHFLOW_CONTROLLER contract
            const addrController = await deploymentHelper.Deploy({ deployer, artifacts, contractType: 'CASHFLOW_CONTROLLER' });
            process.env.CONTRACT_TYPE = 'CASHFLOW_CONTROLLER'; await setup.setDefaults();

            // now link base CASFHLOW to CONTROLLER
            console.log(chalk.inverse('addrBase'), addrBase);
            console.log(chalk.inverse('addrController'), addrController);
            
            //... addType, passing in addrBase...
            // WIP...
            break;

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
