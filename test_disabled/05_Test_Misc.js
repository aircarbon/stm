const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');

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

    it(`setup - contract owner should have default ledger entry`, async () => {
        const ownerLedgerEntry = await stm.getLedgerEntry(accounts[0]);
        assert(ownerLedgerEntry.exists == true, 'contract owner missing ledger entry');
    });

    it(`setup - only contract owner should be able to set read only state`, async () => {
        try {
            await stm.setReadOnly(true, { from: accounts[1] });
        } catch (ex) {
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`setup - should be able to read contract type`, async () => {
        const type = await stm.getContractType();
        assert(type == CONST.contractType.COMMODITY || type == CONST.contractType.CASHFLOW);
    });
});
