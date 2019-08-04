const AcMaster = artifacts.require('./AcMaster.sol');
const db = require('../db.js');

// JavaScript export
module.exports = function (deployer) {
    // Deployer is the Truffle wrapper for deploying
    // contracts to the network

    process.env.NETWORK = deployer.network; // Network Id, for instance "ganache"
    //console.dir(deployer);

    // Deploy the contract to the network
    deployer.deploy(AcMaster).then(async acm => {
        // save the deployed addr ("truffle test" doesn't update the AcMaster.json file, only "truffle migrate" seems to)
        // console.log('acm_addr: ', acm.address);
        // fs.writeFile(
        //     `build/deployed/${deployer.network_id}.json`,
        //     JSON.stringify({ deployed: acm.address }),
        //     err => {
        //         if (err) console.log(err);
        //     }
        // );
        const os = require('os');
        const publicIp = require('public-ip');

        await db.SaveDeployment(
            'AcMaster',
            deployer.network_id,
            acm.address,
            os.hostname(),
            await publicIp.v4()
        );
    });
};
