const chalk = require('chalk');
const deploymentHelper = require('./deploymentHelper');

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
        
        case 'CASHFLOW': // => CFT_C
            // first deploy a base CFT (cashflow) contract
            const addr = await deploymentHelper.Deploy({ deployer, artifacts, ok: (addr) => {

                // then deploy wrapper CFT-C (cashflow controller) contract, and link it to the base CFT
                //...
                console.log(chalk.inverse('addr'), addr);

            } });
            break;

        // case 'CFT' ...

        case 'COMMODITY': 
            // deploy singleton COMMODITY contract
            deploymentHelper.Deploy({ deployer, artifacts });
            break;

        default: throw('Missing or unknown process.env.CONTRACT_TYPE: set to CASHFLOW or COMMODITY.');
    }
};
