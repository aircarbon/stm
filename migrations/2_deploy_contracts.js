const os = require('os');
const publicIp = require('public-ip');

const StructLib = artifacts.require('./StructLib.sol');
const CcyLib = artifacts.require('./CcyLib.sol');
const TokenLib = artifacts.require('./TokenLib.sol');
const LedgerLib = artifacts.require('./LedgerLib.sol');
const TransferLib = artifacts.require('./TransferLib.sol');
const FeeLib = artifacts.require('./FeeLib.sol');
const Erc20Lib = artifacts.require('./Erc20Lib.sol');
const LoadLib = artifacts.require('./LoadLib.sol');
const PayableLib = artifacts.require('./PayableLib.sol');

const StMaster = artifacts.require('./StMaster.sol');

const CONST = require('../const.js');
const { db } = require('../../common/dist');
const chalk = require('chalk');

module.exports = async function (deployer) {
    process.env.NETWORK = deployer.network;
    process.env.NETWORK_ID = deployer.network_id;
    process.env.WEB3_NETWORK_ID = deployer.network_id;

    console.log('== SecTokMaster == DEPLOY...');

    var contractType;
    switch (process.env.CONTRACT_TYPE) {
        case 'CASHFLOW':
        case 'COMMODITY': contractType = process.env.CONTRACT_TYPE; break;
        default: throw('Missing or unknown process.env.CONTRACT_TYPE: set to CASHFLOW or COMMODITY.');
    }

    StMaster.synchronization_timeout = 42;  // seconds

    deployer.deploy(StructLib).then(async ccyLib => { 
        deployer.link(StructLib, CcyLib);
        deployer.link(StructLib, TokenLib);
        deployer.link(StructLib, LedgerLib);
        deployer.link(StructLib, TransferLib);
        deployer.link(StructLib, FeeLib);

        deployer.link(StructLib, StMaster);

    return deployer.deploy(LedgerLib).then(async ccyLib => { 
        deployer.link(LedgerLib, StMaster);

    return deployer.deploy(CcyLib).then(async ccyLib => {
        deployer.link(CcyLib, StMaster);

    return deployer.deploy(TokenLib).then(async tokenLib => { 
        deployer.link(TokenLib, StMaster);

    return deployer.deploy(TransferLib).then(async transferLib => { 
        deployer.link(TransferLib, Erc20Lib);
        deployer.link(TransferLib, PayableLib);

        deployer.link(TransferLib, StMaster);
    
    return deployer.deploy(FeeLib).then(async feeLib => { 
        deployer.link(FeeLib, StMaster);

    return deployer.deploy(Erc20Lib).then(async feeLib => { 
        deployer.link(Erc20Lib, StMaster);

    return deployer.deploy(LoadLib).then(async loadLib => { 
        deployer.link(LoadLib, StMaster);

    return deployer.deploy(PayableLib).then(async payableLib => { 
        deployer.link(PayableLib, StMaster);
        
        //console.log('cashflowArgs', CONST.contractProps[type].cashflowArgs);
        
        return deployer.deploy(StMaster, 
            contractType == "CASHFLOW" ? CONST.contractType.CASHFLOW : CONST.contractType.COMMODITY,
            CONST.contractProps[contractType].cashflowArgs,
            CONST.contractProps[contractType].contractName,
            CONST.contractProps[contractType].contractVer,
            CONST.contractProps[contractType].contractUnit,
            CONST.contractProps[contractType].contractSymbol,
            CONST.contractProps[contractType].contractDecimals,
            CONST.chainlinkAggregators[process.env.NETWORK_ID].btcUsd,
            CONST.chainlinkAggregators[process.env.NETWORK_ID].ethUsd
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

            // 
            const MNEMONIC = require('../dev_mnemonic.js').MNEMONIC;
            const accountAndKey = await CONST.getAccountAndKey(0, MNEMONIC);
            const OWNER = accountAndKey.addr;
            const OWNER_privKey = accountAndKey.privKey;
            // TODO: derive - an encryption key & salt [from contract name?] -> derivation code should be in a private repo (AWS lambda?)
            // TODO: encrypt - privKey & display encrypted [for manual population of AWS secret, L1]
            logEnv("DEPLOYMENT COMPLETE", OWNER, OWNER_privKey);

            // save to DB
            if (!deployer.network.includes("-fork")) {
                var ip = "unknown";
                publicIp.v4().then(p => ip = p).catch(e => { console.log("\tWARN: could not get IP - will write 'unknown'"); });

                console.log(`>>> SAVING DEPLOYMENT: ${CONST.contractProps[contractType].contractName} ${CONST.contractProps[contractType].contractVer}`);
                await db.SaveDeployment({
                    contractName: CONST.contractProps[contractType].contractName,
                     contractVer: CONST.contractProps[contractType].contractVer,
                       networkId: deployer.network_id,
                 deployedAddress: stm.address,
                deployerHostName: os.hostname(),
                    deployerIpv4: ip,
                     deployedAbi: JSON.stringify(stm.abi),
                    contractType,
                });
            }
        }).catch(err => { console.error('failed deployment: StMaster', err); });
    
    }).catch(err => { console.error('failed deployment: PayableLib', err); });
    }).catch(err => { console.error('failed deployment: DataLib', err); });
    }).catch(err => { console.error('failed deployment: Erc20Lib', err); });
    }).catch(err => { console.error('failed deployment: FeeLib', err); });
    }).catch(err => { console.error('failed deployment: TransferLib', err); });
    }).catch(err => { console.error('failed deployment: StLib', err); });
    }).catch(err => { console.error('failed deployment: CcyLib', err); });
    }).catch(err => { console.error('failed deployment: LedgerLib', err); });
    }).catch(err => { console.error('failed deployment: StructLib', err); });
};

function logEnv(phase, owner, ownerPrivKey) {
    console.log(chalk.black.bgWhite(phase));
    console.log(chalk.red('\tprocess.env.CONTRACT_TYPE: '), process.env.CONTRACT_TYPE);
    console.log(chalk.red('\t      process.env.NETWORK: '), process.env.NETWORK);
    console.log(chalk.red('\t   process.env.NETWORK_ID: '), process.env.NETWORK_ID);
    console.log(chalk.red('\t                    owner: '), owner);
    console.log(chalk.red('\t             ownerPrivKey: '), ownerPrivKey);
}
