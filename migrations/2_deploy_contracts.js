const os = require('os');
const publicIp = require('public-ip');
const StMaster = artifacts.require('./StMaster.sol');
const { db } = require('../../common/dist');

module.exports = function (deployer) {

    process.env.NETWORK = deployer.network; 
    console.log('2_deploy_contracts: ', deployer.network);

    StMaster.synchronization_timeout = 42;  // seconds

    deployer.deploy(StMaster).then(async stm => {
        //console.dir(stm.abi);
        //console.dir(deployer);

        if (!deployer.network.includes("-fork")) {
            global.configContext = 'erc20';

            const contractName = "SecTok_Master";
            const contractVer = "0.3";

            await db.SaveDeployment({
                contractName: contractName,
                 contractVer: contractVer,
                   networkId: deployer.network_id,
             deployedAddress: stm.address,
            deployerHostName: os.hostname(),
                deployerIpv4: await publicIp.v4(),
                 deployedAbi: JSON.stringify(stm.abi)
            });
        }
    }).catch(err => {
        console.error('failed deployment', err);
    });
};
