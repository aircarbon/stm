const CONST = require('../const.js');

const chalk = require('chalk');
const BN = require('bn.js');

const deploymentHelper = require('./deploymentHelper');
const setup = require('../devSetupContract.js');
const { db } = require('../../utils-server/dist');

//
// Deploy steps: from/to, inclusive:
//    `truffle migrate -f 2 --to 2`
//
// Deploys a contract of type process.env.CONTRACT_TYPE according to defaults in const.js
// Prefixes the contract name in const.contractProps with (process.env.INSTANCE_ID || 'local'), e.g.
//    `export INSTANCE_ID=local && truffle migrate --network ropsten_ac -f 2 --to 2 --reset`
//    `export INSTANCE_ID=DEMO && truffle migrate --network test_ac -f 2 --to 2 --reset`
//    `export INSTANCE_ID=PROD_52101 && truffle migrate --network prodnet_ac -f 2 --to 2 --reset`
//    `export INSTANCE_ID=PROD_56 && truffle migrate --network bsc_mainnet_ac -f 2 --to 2 --reset`
//

module.exports = async function (deployer) {
    const O = await CONST.getAccountAndKey(0);
    switch (process.env.INSTANCE_ID) {
        case undefined:
        case 'local': console.log(chalk.inverse(`Deploying localhost contract instance, saving to DB: ${process.env.sql_server}`)); break;
        case 'DEV': console.log(chalk.inverse(`Deploying (AWS DEV / DEV) instance, saving to DB: ${process.env.sql_server}`)); break;
        case 'DEMO': console.log(chalk.inverse(`Deploying (AWS DEV / DEMO) instance, saving to DB: ${process.env.sql_server}`)); break;
        case 'UAT': console.log(chalk.inverse(`Deploying (AWS DEV / UAT) instance, saving to DB: ${process.env.sql_server}`)); break;
        
        case 'PROD_1': console.log(chalk.inverse(`Deploying (AWS PROD / ETH 1 MAINNET) instance, saving to DB: ${process.env.sql_server}`)); break;
        case 'PROD_52101': console.log(chalk.inverse(`Deploying (AWS PROD / AC 52101 PRODNET) instance, saving to DB: ${process.env.sql_server}`)); break;
        case 'PROD_56': console.log(chalk.inverse(`Deploying (AWS PROD / BSC 56 MAINNET) instance, saving to DB: ${process.env.sql_server}`)); break;
        default: console.log(chalk.red.bold.inverse(`Unknown INSTANCE_ID (${process.env.INSTANCE_ID})`)); process.exit(1);
    }
    console.log(chalk.red('process.env.NETWORK_ID'.padEnd(30, '.')), process.env.NETWORK_ID);
    console.log(chalk.red('process.env.CONTRACT_TYPE'.padEnd(30, '.')), process.env.CONTRACT_TYPE);
    const contractPrefix = (process.env.INSTANCE_ID || 'local').padEnd(30, '.') + '_';
    console.log(chalk.red('process.env.CONTRACT_PREFIX'.padEnd(30, '.')), process.env.CONTRACT_PREFIX);
    console.log(chalk.red('deployer.gasPrice (gwei)'.padEnd(30, '.')), web3.utils.fromWei(deployer.networks[deployer.network].gasPrice.toString(), "gwei"));

    // require the supplied env network_id (via INSTANCE_ID) to match the supplied deployer's network_id
    if (process.env.NETWORK_ID != deployer.network_id) {
        console.log(chalk.red.bold.inverse(`process.env.NETWORK_ID (${process.env.NETWORK_ID}) != deployer.network_id (${deployer.network_id}): please supply a .env file (through INSTANCE_ID) that matches the supplied deployer network_id.`));
        process.exit(1);
    }
    process.env.WEB3_NETWORK_ID = deployer.network_id;

    // test DB connection
    const dbData = (await db.GetDeployment(3, `dummy_contractName`, `dummy_contractVer`));
    if (dbData === undefined || dbData.recordsets === undefined) {
        console.log(chalk.red.bold.inverse(`DB connection failure.`));
        process.exit(1);
    }

    switch (process.env.CONTRACT_TYPE) {
        case 'COMMODITY':
            // deploy a singleton COMMODITY contract
            await deploymentHelper.Deploy({ deployer, artifacts, contractType: 'COMMODITY' });
            if (!deployer.network.includes("-fork")) {
                await setup.setDefaults();
            }
            break;

        case 'CASHFLOW_CONTROLLER':
            // deploy two base types
            const addrBase1 = await deploymentHelper.Deploy({ deployer, artifacts, contractType: 'CASHFLOW_BASE', nameOverride: "SDax_Base1" });
            const addrBase2 = await deploymentHelper.Deploy({ deployer, artifacts, contractType: 'CASHFLOW_BASE', nameOverride: "SDax_Base2" });

            // deploy controller
            const addrController = await deploymentHelper.Deploy({ deployer, artifacts, contractType: 'CASHFLOW_CONTROLLER' });
                process.env.CONTRACT_TYPE = 'CASHFLOW_CONTROLLER'; await setup.setDefaults();

            if (!deployer.network.includes("-fork")) {
                // link base types
                console.log(chalk.inverse('addrBase1'), addrBase1);
                console.log(chalk.inverse('addrBase2'), addrBase2);
                console.log(chalk.inverse('addrController'), addrController);

                const { evs: evsBase1 } = await CONST.web3_tx('addSecTokenType', [ 'CFT-Base1',  CONST.settlementType.SPOT, CONST.nullFutureArgs, addrBase1 ], O.addr, O.privKey);
                // const evDbg1 = evsBase1.find(p => p.event == 'dbg1').returnValues;
                // const id1 = new BN(evDbg1.id.toString());
                // console.log(chalk.bgBlue.white(`evDbg1 - id: ${evDbg1.id} / 0x${id1.toString(16, 64)} / typeId: ${evDbg1.typeId}`));

                const { evs: evsBase2 } = await CONST.web3_tx('addSecTokenType', [ 'CFT-Base2',  CONST.settlementType.SPOT, CONST.nullFutureArgs, addrBase2 ], O.addr, O.privKey);
                // const evDbg2 = evsBase2.find(p => p.event == 'dbg1').returnValues;
                // const id2 = new BN(evDbg2.id.toString());
                // console.log(chalk.bgBlue.white(`evDbg2 - id: ${evDbg2.id} / 0x${id2.toString(16, 64)} / typeId: ${evDbg2.typeId}`));

                // set & seal base types
                process.env.CONTRACT_TYPE = 'CASHFLOW_BASE'; await setup.setDefaults({ nameOverride: "SDax_Base1" });
                process.env.CONTRACT_TYPE = 'CASHFLOW_BASE'; await setup.setDefaults({ nameOverride: "SDax_Base2" });
            }
            break;

        // todo/not currently used...
        case 'CASHFLOW_BASE':
            // deploy an unattached base CASHFLOW contract
            await deploymentHelper.Deploy({ deployer, artifacts, contractType: 'CASHFLOW_BASE' });
            if (!deployer.network.includes("-fork")) {
                await setup.setDefaults();
            }
            break;

        default: throw(`Missing or unknown CONTRACT_TYPE ("${process.env.CONTRACT_TYPE}"): set to CASHFLOW_BASE, CASHFLOW_CONTROLLER, or COMMODITY.`);
    }
};
