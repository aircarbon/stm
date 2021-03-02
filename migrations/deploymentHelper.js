const _ = require('lodash');
const chalk = require('chalk');
const BN = require('bn.js');
const os = require('os');
const publicIp = require('public-ip');

const CONST = require('../const.js');
const { db } = require('../../utils-server/dist');
const { assert } = require('console');

module.exports = {

    Deploy: async (p) => {
        const { deployer, artifacts, contractType, nameOverride, symbolOverride } = p;
        var stmAddr;
        //const contractType = process.env.CONTRACT_TYPE;
        if (contractType != 'CASHFLOW_BASE' && contractType != 'CASHFLOW_CONTROLLER' && contractType != 'COMMODITY') throw ('Unknown contractType');

        const StructLib = artifacts.require('../Interfaces/StructLib.sol');
        const CcyLib = artifacts.require('./CcyLib.sol');
        const TokenLib = artifacts.require('./TokenLib.sol');
        const LedgerLib = artifacts.require('./LedgerLib.sol');
        const TransferLib = artifacts.require('./TransferLib.sol');
        const SpotFeeLib = artifacts.require('./SpotFeeLib.sol');
        const Erc20Lib = artifacts.require('./Erc20Lib.sol');
        const LoadLib = artifacts.require('./LoadLib.sol');
        const PayableLib = artifacts.require('./PayableLib.sol');
        const FuturesLib = artifacts.require('./FuturesLib.sol');
        const StMaster = artifacts.require('./StMaster.sol');

        // deploy
        StMaster.synchronization_timeout = 42; // secs
        await deployer.deploy(StructLib).then(async structLib => {
            deployer.link(StructLib, CcyLib);
            deployer.link(StructLib, TokenLib);
            deployer.link(StructLib, LedgerLib);
            deployer.link(StructLib, TransferLib);
            deployer.link(StructLib, SpotFeeLib);
            deployer.link(StructLib, FuturesLib);

            deployer.link(StructLib, StMaster);

        await deployer.deploy(LedgerLib).then(async ledgerLib => {
            deployer.link(LedgerLib, StMaster);

        await deployer.deploy(CcyLib).then(async ccyLib => {
            deployer.link(CcyLib, StMaster);

        await deployer.deploy(TokenLib).then(async tokenLib => {
            deployer.link(TokenLib, StMaster);

        await deployer.deploy(TransferLib).then(async transferLib => {
            deployer.link(TransferLib, Erc20Lib);
            deployer.link(TransferLib, PayableLib);

            deployer.link(TransferLib, StMaster);

        await deployer.deploy(SpotFeeLib).then(async feeLib => {
            deployer.link(SpotFeeLib, StMaster);

        await deployer.deploy(Erc20Lib).then(async feeLib => {
            deployer.link(Erc20Lib, StMaster);

        await deployer.deploy(LoadLib).then(async loadLib => {
            deployer.link(LoadLib, StMaster);

        await deployer.deploy(PayableLib).then(async payableLib => {
            deployer.link(PayableLib, StMaster);

        await deployer.deploy(FuturesLib).then(async futuresLib => {
            deployer.link(FuturesLib, StMaster);
            const contractName = `${process.env.CONTRACT_PREFIX}${nameOverride || CONST.contractProps[contractType].contractName}`;
            
            // parse cashflow args; convert from days to blocks
//#if process.env.CONTRACT_TYPE === 'CASHFLOW_BASE'
            const cfa = process.env.ADD_TYPE__CASHFLOW_ARGS !== undefined
                        ? JSON.parse(process.env.ADD_TYPE__CASHFLOW_ARGS)
                        : CONST.contractProps[contractType].cashflowArgs;
            console.log('cfa(pre)', cfa);
            if (cfa.term_Days === undefined || cfa.bond_int_EveryDays === undefined) throw('Undefined cashflow args; aborting.')
            cfa.term_Blks = CONST.blocksFromDays(cfa.term_Days);
            cfa.bond_int_EveryBlks = CONST.blocksFromDays(cfa.bond_int_EveryDays);
            delete cfa.term_Days;
            delete cfa.bond_int_EveryDays;
            console.log('cfa(post)', cfa);
//#endif

            // derive primary owner/deployer (&[0]), and a further n more keypairs ("backup owners");
            // (bkp-owners are passed to contract ctor, and have identical permissions to the primary owner)
            const MNEMONIC = process.env.DEV_MNEMONIC || process.env.PROD_MNEMONIC || require('../DEV_MNEMONIC.js').MNEMONIC;
            const accountAndKeys = [];
            for (let i=0 ; i < CONST.RESERVED_ADDRESSES_COUNT ; i++) {
                accountAndKeys.push(await CONST.getAccountAndKey(i, MNEMONIC))
            }
            const owners = accountAndKeys.map(p => p.addr);

            //
            // Deploy StMaster
            //
            stmAddr = await deployer.deploy(StMaster,
                owners,
                contractType == 'CASHFLOW_BASE'       ? CONST.contractType.CASHFLOW_BASE :
                contractType == 'CASHFLOW_CONTROLLER' ? CONST.contractType.CASHFLOW_CONTROLLER :
                                                        CONST.contractType.COMMODITY,
//#if process.env.CONTRACT_TYPE === 'CASHFLOW_BASE'
                cfa,
//#endif
                contractName,
                CONST.contractProps[contractType].contractVer,
                CONST.contractProps[contractType].contractUnit
//#if process.env.CONTRACT_TYPE === 'CASHFLOW_BASE' || process.env.CONTRACT_TYPE === 'COMMODITY'
                ,
                symbolOverride || CONST.contractProps[contractType].contractSymbol,
                CONST.contractProps[contractType].contractDecimals
//#endif
//#if process.env.CONTRACT_TYPE === 'CASHFLOW_BASE'
            ,
          //CONST.chainlinkAggregators[process.env.NETWORK_ID].btcUsd,    // 24k
            CONST.chainlinkAggregators[process.env.NETWORK_ID].ethUsd,
            CONST.chainlinkAggregators[process.env.NETWORK_ID].bnbUsd,
//#endif
            ).then(async stm => {
                //console.dir(stm);
                //console.dir(stm.abi);
                //console.dir(deployer);

                // get ABI-encoded ctor params (for etherscan contract verification)
                // ## https://github.com/ethereumjs/ethereumjs-abi/issues/69
                //const ejs_abi = require('ethereumjs-abi');
                //var encodedArgs = ejs_abi.encode(stm.abi, "balanceOf(uint256 address)", [ "0x0000000000000000000000000000000000000000" ])
                //console.log('encodedArgs', encodedArgs.toString('hex'));
                // TODO: try https://github.com/Zoltu/ethereum-abi-encoder ...

                if (!deployer.network.includes("-fork")) {
                    // save to DB
                    var ip = "unknown";
                    publicIp.v4().then(p => ip = p).catch(e => { console.log("\tWARN: could not get IP - will write 'unknown'"); });
                    console.log(`>>> SAVING DEPLOYMENT: ${contractName} ${CONST.contractProps[contractType].contractVer} to ${process.env.sql_server}`);
                    await db.SaveDeployment({
                        contractName: contractName,
                         contractVer: CONST.contractProps[contractType].contractVer,
                           networkId: deployer.network_id,
                     deployedAddress: stm.address,
                    deployerHostName: os.hostname(),
                        deployerIpv4: ip,
                         deployedAbi: JSON.stringify(stm.abi),
                        contractType,
                              txHash: stm.transactionHash,
                              symbol: symbolOverride || ''
                    });

                    // log & validate deployment
                    logEnv("DEPLOYMENT COMPLETE", owners, contractType, contractName);
                    const contractOwners = await CONST.web3_call('getOwners', [], undefined/*nameOverride*/, stm.address/*addrOverride*/);
                    if (contractOwners.length != CONST.RESERVED_ADDRESSES_COUNT) { 
                        console.log(chalk.red.bold.inverse(`Deployment failed: unexpected owners data`), contractOwners);
                        process.exit(1);
                    }
                }
                return stm.address;
            }).catch(err => { console.error('failed deployment: StMaster', err); });
        }).catch(err => { console.error('failed deployment: FuturesLib', err); });
        }).catch(err => { console.error('failed deployment: PayableLib', err); });
        }).catch(err => { console.error('failed deployment: DataLib', err); });
        }).catch(err => { console.error('failed deployment: Erc20Lib', err); });
        }).catch(err => { console.error('failed deployment: SpotFeeLib', err); });
        }).catch(err => { console.error('failed deployment: TransferLib', err); });
        }).catch(err => { console.error('failed deployment: TokenLib', err); });
        }).catch(err => { console.error('failed deployment: CcyLib', err); });
        }).catch(err => { console.error('failed deployment: LedgerLib', err); });
        }).catch(err => { console.error('failed deployment: StructLib', err); });
        return stmAddr;
    }
};

function logEnv(phase, owners, contractType, contractName) {
    console.log(chalk.black.bgWhite(phase));

    console.log(chalk.red('\t                contractName: '), contractName);
    console.log(chalk.red('\t                contractType: '), contractType);
    console.log(chalk.red('\t process.env.CONTRACT_PREFIX: '), process.env.CONTRACT_PREFIX);
    console.log(chalk.red('\t      process.env.NETWORK_ID: '), process.env.NETWORK_ID);
    console.log(chalk.red('\t                      owners: '), owners);

}
