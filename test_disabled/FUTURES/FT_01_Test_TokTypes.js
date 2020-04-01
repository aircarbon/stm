const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');

const transferHelper = require('../test/transferHelper.js');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() == CONST.contractType.CASHFLOW) this.skip();
        await stm.sealContract();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
    });

    beforeEach(async () => {
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // * can add fut type (+ve)
    // * spot type add can't have expiry or underlyer (-ve)
    // * ft type add can't have bad expiry time (too low)
    // * ft type add can't have non-existent underlyer type id
    // * ft type add can't have non-spot (ft) underlyer type 
    it(`FT types - add future tok-type`, async () => {

        //...
        await stm.addSecTokenType('NEW_TYPE_NAME', CONST.settlementType.FUTURE, 0, 0 ); 

    });

});
