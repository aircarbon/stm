const os = require('os');
const publicIp = require('public-ip');
const AcMaster = artifacts.require('./AcMaster.sol');
const db = require('../../util/db.js');

module.exports = function (deployer) {

    process.env.NETWORK = deployer.network; // e.g. "ropsten_scoop"

    deployer.deploy(AcMaster).then(async acm => {

        global.configContext = 'erc20';
        await db.erc20.SaveDeployment(
            'AcMaster',
            deployer.network_id,
            acm.address,
            os.hostname(),
            await publicIp.v4()
        );
    });
};
