// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

const _ = require('lodash');

const CONST = require('../const.js');

const chalk = require('chalk');
const BN = require('bn.js');

const deploymentHelper = require('./deploymentHelper');
const setup = require('../devSetupContract.js');
const db = require('../../orm/build');

//
// Deploy steps: from/to, inclusive:
//    `truffle compile && truffle migrate -f 2 --to 2`
//
// Deploys a contract of type process.env.CONTRACT_TYPE according to defaults in const.js
// Prefixes the contract name in const.contractProps with (process.env.INSTANCE_ID || 'local'), e.g.
//
//   AC various
//    `export INSTANCE_ID=local && node process_sol_js && truffle compile && truffle migrate --network development -f 2 --to 2`
//    `export INSTANCE_ID=UAT_97_AC && node process_sol_js && truffle compile && truffle migrate --network bsc_testnet_bn -f 2 --to 2`
//    `export INSTANCE_ID=DEMO && node process_sol_js && truffle compile && truffle migrate --network test_ac -f 2 --to 2`
//    `export INSTANCE_ID=PROD_52101 && node process_sol_js && truffle compile && truffle migrate --network prodnet_ac -f 2 --to 2`
//    `export INSTANCE_ID=PROD_56 && node process_sol_js && truffle compile && truffle migrate --network bsc_mainnet_ac -f 2 --to 2`
//
//   SD local Ganache / Dev DB (ordered)
//    `export INSTANCE_ID=local_SD && node process_sol_js && truffle compile && truffle migrate --network development -f 2 --to 2`
//    `export INSTANCE_ID=local_SD_RichGlory && node process_sol_js && truffle compile && truffle migrate --network development -f 2 --to 2`
//
//   SD Ropsten 3 (ordered)
//    `export INSTANCE_ID=UAT_3_SD && node process_sol_js && truffle compile && truffle migrate --network ropsten_ac -f 2 --to 2`
//    `export INSTANCE_ID=UAT_3_SD_RichGlory && node process_sol_js && truffle compile && truffle migrate --network ropsten_ac -f 2 --to 2`
//    `export INSTANCE_ID=UAT_3_SD_SBGLand && node process_sol_js && truffle compile && truffle migrate --network ropsten_ac -f 2 --to 2`
//    `export INSTANCE_ID=UAT_3_SD_WilsonAndCo && node process_sol_js && truffle compile && truffle migrate --network ropsten_ac -f 2 --to 2`
//    `export INSTANCE_ID=UAT_3_SD_WorldbridgeLand && node process_sol_js && truffle compile && truffle migrate --network ropsten_ac -f 2 --to 2`
//
//   SD BSC Testnet 97 (ordered)
//    `export INSTANCE_ID=UAT_97_SD && node process_sol_js && truffle compile && truffle migrate --network bsc_testnet_bn -f 2 --to 2`
//    `export INSTANCE_ID=UAT_97_SD_RichGlory && node process_sol_js && truffle compile && truffle migrate --network bsc_testnet_bn -f 2 --to 2`
//    `export INSTANCE_ID=UAT_97_SD_SBGLand && node process_sol_js && truffle compile && truffle migrate --network bsc_testnet_bn -f 2 --to 2`
//    `export INSTANCE_ID=UAT_97_SD_WilsonAndCo && node process_sol_js && truffle compile && truffle migrate --network bsc_testnet_bn -f 2 --to 2`
//    `export INSTANCE_ID=UAT_97_SD_WorldbridgeLand && node process_sol_js && truffle compile && truffle migrate --network bsc_testnet_bn -f 2 --to 2`
//
//   SD BSC Testnet 97 (DEMO)
//    `export INSTANCE_ID=DEMO_97_SD && node process_sol_js && truffle compile && truffle migrate --network bsc_testnet_bn -f 2 --to 2`
//    `export INSTANCE_ID=DEMO_97_SD_RichGlory && node process_sol_js && truffle compile && truffle migrate --network bsc_testnet_bn -f 2 --to 2`
//    `export INSTANCE_ID=DEMO_97_SD_SBGLand && node process_sol_js && truffle compile && truffle migrate --network bsc_testnet_bn -f 2 --to 2`
//    `export INSTANCE_ID=DEMO_97_SD_WilsonAndCo && node process_sol_js && truffle compile && truffle migrate --network bsc_testnet_bn -f 2 --to 2`
//    `export INSTANCE_ID=DEMO_97_SD_WorldbridgeLand && node process_sol_js && truffle compile && truffle migrate --network bsc_testnet_bn -f 2 --to 2`
//
//   SD BSC Mainnet 56 (ordered)
//    `export INSTANCE_ID=PROD_56_SD && node process_sol_js && truffle compile && truffle migrate --network bsc_mainnet_ac -f 2 --to 2`
//    `export INSTANCE_ID=PROD_56_SD_RichGlory && node process_sol_js && truffle compile && truffle migrate --network bsc_mainnet_ac -f 2 --to 2`
//    `export INSTANCE_ID=PROD_56_SD_SBGLand && node process_sol_js && truffle compile && truffle migrate --network bsc_mainnet_ac -f 2 --to 2`
//
//   SD Matic Mainnet 137
//    `export INSTANCE_ID=PROD_137_SD && node process_sol_js && truffle compile && truffle migrate --network matic_mainnet -f 2 --to 2`
//
//   SD Matic (Mumbai) Testnet 80001
//    `export INSTANCE_ID=UAT_80001_SD && node process_sol_js && truffle compile && truffle migrate --network matic_testnet -f 2 --to 2`
//
//   AC Matic (Mumbai) Testnet 80001
//    `export INSTANCE_ID=UAT_80001_AC && node process_sol_js && truffle compile && truffle migrate --network matic_testnet -f 2 --to 2`
//
//   AC Fantom Testnet 4002
//    `export INSTANCE_ID=UAT_4002_AC && node process_sol_js && truffle compile && truffle migrate --network fantom_testnet -f 2 --to 2`

// Matic (Mumbai) Testnet 80001 deployments have intermittent errors (results in an non-terminating solc-js dump)

module.exports = async function (deployer) {
  const O = await CONST.getAccountAndKey(0);
  switch (process.env.INSTANCE_ID) {
    case undefined:
      console.log(`Deploying localhost contract instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;

    // AC
    case 'DEV':
      console.log(`Deploying (AWS DEV / DEV) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'DEMO':
      console.log(`Deploying (AWS DEV / DEMO) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'DEMO_97_AC':
    case 'DEMO_80001_AC':
      console.log(`Deploying (AWS DEV / DEMO) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'UAT_97_AC':
      console.log(`Deploying (AWS DEV / DEMO) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'UAT_80001_AC':
      console.log(`Deploying (AWS UAT / Matic Testnet (Mumbai) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'UAT_4002_AC':
      console.log(`Deploying (AWS UAT / Fantom Testnet instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'UAT':
      console.log(`Deploying (AWS DEV / UAT) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'PROD_1':
      console.log(`Deploying (AWS PROD / ETH 1 MAINNET) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'PROD_52101':
      console.log(`Deploying (AWS PROD / AC 52101 PRODNET) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'PROD_56':
      console.log(`Deploying (AWS PROD / BSC 56 MAINNET) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'PROD_137_AC':
      console.log(`Deploying (AWS PROD / Matic Mainnet) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;

    // SD
    case 'DEV_SD':
      console.log(`Deploying (AWS DEV / DEV [controller w/ 0 default base types] for SDAX) instance, saving to DB: ${chalk.inverse(process.env.sql_server,)}`);
      break;
    case 'UAT_SD':
      console.log(`Deploying (AWS DEV / UAT [controller w/ 0 default base types] for SDAX) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'UAT_97_SD':
      console.log(`Deploying (AWS UAT / BSC Testnet [controller w/ 0 default base types] for SDAX) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'UAT_80001_SD':
      console.log(`Deploying (AWS UAT / Matic Testnet (Mumbai) [controller w/ 0 default base types] for SDAX) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'UAT_4002_SD':
      console.log(`Deploying (AWS UAT / Fantom Testnet instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'DEMO_97_SD':
      console.log(`Deploying (AWS DEMO / BSC Testnet [controller w/ 0 default base types] for SDAX) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'PROD_3_SD':
      console.log(`Deploying (AWS PROD / Ropsten 3 [controller w/ 0 default base types] for SDAX) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'PROD_56_SD':
      console.log(`Deploying (AWS PROD / BSC Mainnet [controller w/ 0 default base types] for SDAX) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;
    case 'PROD_137_SD':
      console.log(`Deploying (AWS PROD / Matic Mainnet [controller w/ 0 default base types] for SDAX) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      break;

    default:
      if (process.env.INSTANCE_ID.startsWith('UAT_3_SD_')) {
        console.log(`Deploying (AWS DEV / UAT Ropsten [additional base type] for SDAX) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      } else if (process.env.INSTANCE_ID.startsWith('UAT_97_SD_')) {
        console.log(`Deploying (AWS DEV / UAT BSC Testnet [additional base type] for SDAX) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      } else if (process.env.INSTANCE_ID.startsWith('UAT_80001_SD_')) {
        console.log(`Deploying (AWS DEV / UAT Matic Testnet (Mumbai) [additional base type] for SDAX) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      } else if (process.env.INSTANCE_ID.startsWith('DEMO_97_SD_')) {
        console.log(`Deploying (AWS DEV / DEMO BSC Testnet [additional base type] for SDAX) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      } else if (process.env.INSTANCE_ID.startsWith('PROD_56_SD_')) {
        console.log(
          `Deploying (AWS PROD / BSC Mainnet [additional base type] for SDAX) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      } else if (process.env.INSTANCE_ID.startsWith('PROD_137_SD_')) {
        console.log(`Deploying (AWS PROD / Matic Mainnet [additional base type] for SDAX) instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      } else if (process.env.INSTANCE_ID.startsWith('local')) {
        console.log(`Deploying localhost contract instance, saving to DB: ${chalk.inverse(process.env.sql_server)}`);
      } else {
        console.log(chalk.red.bold.inverse(`Unknown INSTANCE_ID (${process.env.INSTANCE_ID})`));
        process.exit(1);
      }
  }
  console.log(chalk.red('process.env.NETWORK_ID'.padEnd(30, '.')), process.env.NETWORK_ID);
  console.log(chalk.red('process.env.CONTRACT_TYPE'.padEnd(30, '.')), process.env.CONTRACT_TYPE);
  const contractPrefix = (process.env.INSTANCE_ID || 'local').padEnd(30, '.') + '_';
  console.log(chalk.red('process.env.CONTRACT_PREFIX'.padEnd(30, '.')), process.env.CONTRACT_PREFIX);

  // require the supplied env network_id (via INSTANCE_ID) to match the supplied deployer's network_id
  if (process.env.NETWORK_ID != deployer.network_id) {
    console.log(
      chalk.red.bold.inverse(
        `process.env.NETWORK_ID (${process.env.NETWORK_ID}) != deployer.network_id (${deployer.network_id}): please supply a .env file (through INSTANCE_ID) that matches the supplied deployer network_id.`,
      ),
    );
    process.exit(1);
  }
  process.env.WEB3_NETWORK_ID = deployer.network_id;

  // check deployer account balance
  console.log(chalk.red('O.addr'.padEnd(30, '.')), O.addr);
  const { web3, ethereumTxChain } = await CONST.getTestContextWeb3();
  const bal = await web3.eth.getBalance(O.addr);
  console.log(chalk.red('O.addr(bal)'.padEnd(30, '.')), web3.utils.fromWei(bal));
  console.log(
    chalk.red('deployer.gasPrice (gwei)'.padEnd(30, '.')),
    web3.utils.fromWei(deployer.networks[deployer.network].gasPrice.toString(), 'gwei'),
  );

  // test DB connection
  const dbData = await db.GetDeployment(3, `dummy_contractName`, `dummy_contractVer`);
  if (dbData === undefined || dbData.recordsets === undefined) {
    console.log(chalk.red.bold.inverse(`DB connection failure.`));
    process.exit(1);
  }

  if (process.env.CUSTODY_TYPE !== 'SELF_CUSTODY' && process.env.CUSTODY_TYPE !== 'THIRD_PARTY_CUSTODY') {
    console.warn(`Missing or unknown CUSTODY_TYPE ("${process.env.CUSTODY_TYPE}"): set to SELF_CUSTODY or THIRD_PARTY_CUSTODY.`);
    process.env.CUSTODY_TYPE = 'SELF_CUSTODY';
  }

  switch (process.env.CONTRACT_TYPE) {
    case 'COMMODITY':
      console.log('COMMODITY...');
      // deploy a singleton COMMODITY contract
      await deploymentHelper.Deploy({ deployer, artifacts, contractType: 'COMMODITY', custodyType: process.env.CUSTODY_TYPE });
      if (!deployer.network.includes('-fork') && process.env.RESTORE_CONTRACT !== 'YES') {
        await setup.setDefaults();
      }
      break;

    // v2: deploys *just* the contoller... (too complicated to be doing pre-processing and recompiles in the middle of this flow)
    case 'CASHFLOW_CONTROLLER':
      console.log('CASHFLOW_CONTROLLER...');
      // deploy two base types
      // const execSync = require("child_process").execSync;
      // process.env.CONTRACT_TYPE = 'CASHFLOW_BASE';
      // console.log(chalk.inverse('run pre-processor: set source files & compile for base-type deployments...'));
      // const childResult1 = execSync(`node process_sol_js && truffle compile`);
      // console.group('Child Output');
      // console.log(chalk.dim(childResult1.toString("utf8")));
      // console.groupEnd();
      // const dh2 = require('./deploymentHelper'); // reload processed script
      // const addrBase1 = await dh2.Deploy({ deployer, artifacts, contractType: 'CASHFLOW_BASE', nameOverride: "SDax_Base1", symbolOverride: "SDi1" });
      // const addrBase2 = await dh2.Deploy({ deployer, artifacts, contractType: 'CASHFLOW_BASE', nameOverride: "SDax_Base2", symbolOverride: "SDi2" });

      // deploy controller
      process.env.CONTRACT_TYPE = 'CASHFLOW_CONTROLLER';
      // console.log(chalk.inverse('set source files & compile for controller deployment...'));
      // execSync(`node process_sol_js && truffle compile`);
      // const childResult2 = execSync(`node process_sol_js && truffle compile`);
      // console.group('Child Output');
      // console.log(chalk.dim(childResult2.toString("utf8")));
      // console.groupEnd();
      // const dh3 = require('./deploymentHelper'); // reload processed script
      const addrController = await deploymentHelper.Deploy({
        deployer,
        artifacts,
        contractType: 'CASHFLOW_CONTROLLER',
        custodyType: process.env.CUSTODY_TYPE
      });
      await setup.setDefaults();

      if (!deployer.network.includes('-fork')) {
        // link base types into the controller
        //console.log(chalk.inverse('addrBase1'), addrBase1);
        //console.log(chalk.inverse('addrBase2'), addrBase2);
        //console.log(chalk.inverse('addrController'), addrController);
        //const { evs: evsBase1 } = await CONST.web3_tx('addSecTokenType', [ 'CFT-Base1',  CONST.settlementType.SPOT, CONST.nullFutureArgs, addrBase1 ], O.addr, O.privKey);
        //const { evs: evsBase2 } = await CONST.web3_tx('addSecTokenType', [ 'CFT-Base2',  CONST.settlementType.SPOT, CONST.nullFutureArgs, addrBase2 ], O.addr, O.privKey);
        // init base types
        //process.env.CONTRACT_TYPE = 'CASHFLOW_BASE'; await setup.setDefaults({ nameOverride: "SDax_Base1" });
        //process.env.CONTRACT_TYPE = 'CASHFLOW_BASE'; await setup.setDefaults({ nameOverride: "SDax_Base2" });
      }
      break;

    // v2: we're *required* to run this after the controller deployment (i.e. no default base types deployed alongside the controller)
    case 'CASHFLOW_BASE':
      console.log('CASHFLOW_BASE...');
      const nameBase = process.env.ADD_TYPE__CONTRACT_NAME;
      const symbolBase = process.env.ADD_TYPE__CONTRACT_SYMBOL;
      if (nameBase === undefined || nameBase.length == 0) {
        console.log(
          chalk.red.bold.inverse(
            `Bad process.env.ADD_TYPE__CONTRACT_NAME (${nameBase}); supply a valid new base contract name.`,
          ),
        );
        process.exit(1);
      }
      if (process.env.ADD_TYPE__TYPE_NAME === undefined || process.env.ADD_TYPE__TYPE_NAME.length == 0) {
        console.log(
          chalk.red.bold.inverse(
            `Bad process.env.ADD_TYPE__TYPE_NAME (${process.env.ADD_TYPE__TYPE_NAME}); supply a valid new base type name.`,
          ),
        );
        process.exit(1);
      }

      // get whitelist from the latest deployed controller (we will set new the base type's whitelist to match)
      process.env.CONTRACT_TYPE = 'CASHFLOW_CONTROLLER';
      console.log('getting whitelist...');
      const controllerWhitelist = await CONST.web3_call('getWhitelist', []);

      //console.log('controllerWhitelist', controllerWhitelist);
      if (!controllerWhitelist) throw `Cannot fetch controller whitelist.`;
      if (controllerWhitelist.length == 0)
        throw `Cannot deploy new base type; controller whitelist is not set. Run 04_Web3_INIT_MULTI_DATA_AC.js...`;

      // deploy a new base type
      process.env.CONTRACT_TYPE = 'CASHFLOW_BASE';
      const addrBase = await deploymentHelper.Deploy({
        deployer,
        artifacts,
        contractType: 'CASHFLOW_BASE',
        custodyType: process.env.CUSTODY_TYPE,
        nameOverride: nameBase,
        symbolOverride: symbolBase,
      });
      if (!deployer.network.includes('-fork')) {
        console.log(chalk.inverse('nameBase'), nameBase);
        console.log(chalk.inverse('addrBase'), addrBase);

        // link new base type to the controller (can also be disabled: we can do this manually through AdminWeb...)
        process.env.CONTRACT_TYPE = 'CASHFLOW_CONTROLLER';
        const { evs: evsBase } = await CONST.web3_tx(
          'addSecTokenType',
          [process.env.ADD_TYPE__TYPE_NAME, CONST.settlementType.SPOT, CONST.nullFutureArgs, addrBase],
          O.addr,
          O.privKey,
        );

        // init new base type, set whitelist to match controller
        await setup.setDefaults({ nameOverride: nameBase });

        const wlChunked = _.chunk(controllerWhitelist, 50);
        for (let chunk of wlChunked) {
          //try {
          await CONST.web3_tx(
            'whitelistMany',
            [chunk],
            O.addr,
            O.privKey,
            /*nameOverride*/ undefined,
            /*addrOverride*/ addrBase,
          );
          //} catch(ex) { console.warn(ex); }
        }

        const baseWhitelist = await CONST.web3_call(
          'getWhitelist',
          [],
          /*nameOverride*/ undefined,
          /*addrOverride*/ addrBase,
        );
        console.log('      baseWhitelist.length', baseWhitelist.length);
        console.log('controllerWhitelist.length', controllerWhitelist.length);
        await CONST.web3_tx(
          'sealContract',
          [],
          O.addr,
          O.privKey,
          /*nameOverride*/ undefined,
          /*addrOverride*/ addrBase,
        );

        // list types in the controller
        process.env.CONTRACT_TYPE = 'CASHFLOW_CONTROLLER';
        const spotTypes = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.filter(
          (p) => p.settlementType == CONST.settlementType.SPOT,
        );
        console.log('spotTypes', spotTypes);
      }
      break;

    default:
      throw `Missing or unknown CONTRACT_TYPE ("${process.env.CONTRACT_TYPE}"): set to CASHFLOW_BASE, CASHFLOW_CONTROLLER, or COMMODITY.`;
  }
};
