const os = require('os');
const publicIp = require('public-ip');
const AcMaster = artifacts.require('./AcMaster.sol');
const db = require('../../util/db.js');

module.exports = function (deployer) {

    process.env.NETWORK = deployer.network; // e.g. "ropsten_scoop"

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
    });
};
