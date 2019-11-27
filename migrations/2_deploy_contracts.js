const os = require('os');
const publicIp = require('public-ip');

//const St2x = artifacts.require('./St2x.sol');
const StructLib = artifacts.require('./StructLib.sol');
const CcyLib = artifacts.require('./CcyLib.sol');
const TokenLib = artifacts.require('./TokenLib.sol');
const LedgerLib = artifacts.require('./LedgerLib.sol');
const TransferLib = artifacts.require('./TransferLib.sol');

//const StMintable = artifacts.require('./StMintable.sol');
//const StLedger = artifacts.require('./StLedger.sol');
const StMaster = artifacts.require('./StMaster.sol');

const { db } = require('../../common/dist');

module.exports = async function (deployer) {

    process.env.NETWORK = deployer.network; 
    console.log('2_deploy_contracts: ', deployer.network);

    StMaster.synchronization_timeout = 42;  // seconds

    //deployer.deploy(St2x).then(async st2x => {
        //deployer.link(St2x, StMaster);

    deployer.deploy(StructLib).then(async ccyLib => { 
        deployer.link(StructLib, CcyLib);
        deployer.link(StructLib, TokenLib);
        deployer.link(StructLib, LedgerLib);
        deployer.link(StructLib, TransferLib);

        deployer.link(StructLib, StMaster);

    return deployer.deploy(LedgerLib).then(async ccyLib => { 
        deployer.link(LedgerLib, StMaster);

    return deployer.deploy(CcyLib).then(async ccyLib => {
        deployer.link(CcyLib, StMaster);

    return deployer.deploy(TokenLib).then(async tokenLib => { 
        deployer.link(TokenLib, StMaster);

    return deployer.deploy(TransferLib).then(async transferLib => { 
        deployer.link(TransferLib, StMaster);
    
        // StMaster
        return deployer.deploy(StMaster/*, st2x.address*/).then(async stm => {
            
            //console.dir(stm.abi);
            //console.dir(deployer);

            if (!deployer.network.includes("-fork")) {
                global.configContext = 'erc20';

                const contractName = "SecTok_Master";
                const contractVer = "0.4";

                var ip = "unknown";
                publicIp.v4().then(p => ip = p).catch(e => { console.log('warn: could not get IP'); });

                await db.SaveDeployment({
                    contractName: contractName,
                     contractVer: contractVer,
                       networkId: deployer.network_id,
                 deployedAddress: stm.address,
                deployerHostName: os.hostname(),
                    deployerIpv4: ip,
                     deployedAbi: JSON.stringify(stm.abi)
                });
            }
        }).catch(err => { console.error('failed deployment: StMaster', err); });
    
    }).catch(err => { console.error('failed deployment: TransferLib', err); });
    }).catch(err => { console.error('failed deployment: StLib', err); });
    }).catch(err => { console.error('failed deployment: CcyLib', err); });
    }).catch(err => { console.error('failed deployment: LedgerLib', err); });
    }).catch(err => { console.error('failed deployment: StructLib', err); });

};
