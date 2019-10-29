const Migrations = artifacts.require('Migrations');

module.exports = function (deployer) {
    console.log('1_initial_migration: ', deployer.network);

    deployer.deploy(Migrations);
};
