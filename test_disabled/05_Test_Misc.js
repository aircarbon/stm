const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');

const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;

    beforeEach(async () => {
        stm = await st.deployed();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // tmp test: for non-dev funding of erc20 accounts ()
    // it('web3 - use web3 to fund erc20 test accounts from owner', async () => {
        //     const data = await CONST.web3_sendEthTestAddr(0, 1, "0.01"); // working ok
    //     console.log('data', data);
    // });

    it('setup - contract owner should have default ledger entry', async () => {
        const ownerLedgerEntry = await stm.getLedgerEntry(accounts[0]);
        assert(ownerLedgerEntry.exists == true, 'contract owner missing ledger entry');
    });

    it('setup - only contract owner should be able to set read only state', async () => {
        try {
            await stm.setReadOnly(true, { from: accounts[1] });
        } catch (ex) {
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
});
