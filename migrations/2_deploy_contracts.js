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

module.exports = async function (deployer) {
    process.env.NETWORK = deployer.network;
    process.env.NETWORK_ID = deployer.network_id;
    process.env.WEB3_NETWORK_ID = deployer.network_id;

    console.log('== SecTokMaster == DEPLOY...');
    console.log('\tprocess.env.CONTRACT_TYPE: ', process.env.CONTRACT_TYPE);
    console.log('\t      process.env.NETWORK: ', process.env.NETWORK);
    console.log('\t   process.env.NETWORK_ID: ', process.env.NETWORK_ID);
    var type;
    switch (process.env.CONTRACT_TYPE) {
        case 'CASHFLOW':
        case 'COMMODITY': type = process.env.CONTRACT_TYPE; break;
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
        //deployer.link(TokenLib, PayableLib);

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
            type == "CASHFLOW" ? CONST.contractType.CASHFLOW : CONST.contractType.COMMODITY,
            CONST.contractProps[type].cashflowArgs,
            CONST.contractProps[type].contractName,
            CONST.contractProps[type].contractVer,
            CONST.contractProps[type].contractUnit, 
            CONST.contractProps[type].contractSymbol, 
            CONST.contractProps[type].contractDecimals
        ).then(async stm => {
            //console.dir(stm.abi);
            //console.dir(deployer);

            if (!deployer.network.includes("-fork")) {

                var ip = "unknown";
                publicIp.v4().then(p => ip = p).catch(e => { console.log("\tWARN: could not get IP - will write 'unknown'"); });

                console.log(`>>> SAVING DEPLOYMENT: ${CONST.contractProps[type].contractName} ${CONST.contractProps[type].contractVer}`);
                await db.SaveDeployment({
                    contractName: CONST.contractProps[type].contractName,
                     contractVer: CONST.contractProps[type].contractVer,
                       networkId: deployer.network_id,
                 deployedAddress: stm.address,
                deployerHostName: os.hostname(),
                    deployerIpv4: ip,
                     deployedAbi: JSON.stringify(stm.abi)
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