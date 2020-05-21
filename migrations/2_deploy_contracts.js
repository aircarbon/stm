const chalk = require('chalk');
const deploymentHelper = require('./deploymentHelper');
const setup = require('../devSetupContract.js');

//
// deploy steps: from/to, inclusive:
//    truffle migrate -f 2 --to 2
//

module.exports = async function (deployer) {

    // setup
    process.env.NETWORK = deployer.network;
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
