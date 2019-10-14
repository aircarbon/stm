const os = require('os');
const publicIp = require('public-ip');
const AcMaster = artifacts.require('./AcMaster.sol');
const db = require('../../util/db.js');

module.exports = function (deployer) {

    process.env.NETWORK = deployer.network; // e.g. "ropsten_ac"

    //console.log('2_deploy_contracts...', deployer);

    AcMaster.synchronization_timeout = 42;  // seconds

    deployer.deploy(AcMaster).then(async acm => {

        //console.dir(acm.abi);
        //console.dir(deployer);

        global.configContext = 'erc20';
        await db.erc20.SaveDeployment({
            contractName: 'AcMaster',
               networkId: deployer.network_id,
         deployedAddress: acm.address,
        deployerHostName: os.hostname(),
            deployerIpv4: await publicIp.v4(),
             deployedAbi: JSON.stringify(acm.abi)
        });
    }).catch(err => {
        console.error('failed deployment', err);
    });
};
