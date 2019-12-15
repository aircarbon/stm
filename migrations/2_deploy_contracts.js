const os = require('os');
const publicIp = require('public-ip');

//const St2x = artifacts.require('./St2x.sol');
const StructLib = artifacts.require('./StructLib.sol');
const CcyLib = artifacts.require('./CcyLib.sol');
const TokenLib = artifacts.require('./TokenLib.sol');
const LedgerLib = artifacts.require('./LedgerLib.sol');
const TransferLib = artifacts.require('./TransferLib.sol');
const FeeLib = artifacts.require('./FeeLib.sol');
const Erc20Lib = artifacts.require('./Erc20Lib.sol');

//const StMintable = artifacts.require('./StMintable.sol');
//const StLedger = artifacts.require('./StLedger.sol');
const StMaster = artifacts.require('./StMaster.sol');

const CONST = require('../const.js');
const { db } = require('../../common/dist');

module.exports = async function (deployer) {

    process.env.NETWORK = deployer.network; 
    process.env.NETWORK_ID = deployer.network_id; 

    console.log('2_deploy_contracts: ', deployer.network);

    StMaster.synchronization_timeout = 42;  // seconds

    //deployer.deploy(St2x).then(async st2x => {
        //deployer.link(St2x, StMaster);

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
        
        deployer.link(TransferLib, StMaster);
    
    return deployer.deploy(FeeLib).then(async feeLib => { 
        deployer.link(FeeLib, StMaster);

    return deployer.deploy(Erc20Lib).then(async feeLib => { 
        deployer.link(Erc20Lib, StMaster);

        // StMaster
        // const contractName = CONST.contractName; //"SecTok_Master";
        // const contractVer = CONST.contractVer; //"0.7";
        // const contractUnit = CONST.contractUnit; //"KG";
        // const contractSymbol = CONST.contractSymbol; //"CCC";
        // const contractDecimals = CONST.contractDecimals; //4;
        return deployer.deploy(StMaster, CONST.contractName, CONST.contractVer, CONST.contractUnit, CONST.contractSymbol, CONST.contractDecimals).then(async stm => {
            console.log('deplyed ok');

            //console.dir(stm.abi);
            //console.dir(deployer);

            if (!deployer.network.includes("-fork")) {

                var ip = "unknown";
                publicIp.v4().then(p => ip = p).catch(e => { console.log("WARN: could not get IP - will write 'unknown'"); });

                await db.SaveDeployment({
                    contractName: CONST.contractName,
                     contractVer: CONST.contractVer,
                       networkId: deployer.network_id,
                 deployedAddress: stm.address,
                deployerHostName: os.hostname(),
                    deployerIpv4: ip,
                     deployedAbi: JSON.stringify(stm.abi)
                });
            }
        }).catch(err => { console.error('failed deployment: StMaster', err); });
    
    }).catch(err => { console.error('failed deployment: Erc20Lib', err); });
    }).catch(err => { console.error('failed deployment: FeeLib', err); });
    }).catch(err => { console.error('failed deployment: TransferLib', err); });
    }).catch(err => { console.error('failed deployment: StLib', err); });
    }).catch(err => { console.error('failed deployment: CcyLib', err); });
    }).catch(err => { console.error('failed deployment: LedgerLib', err); });
    }).catch(err => { console.error('failed deployment: StructLib', err); });

};
