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
        if (await stm.getContractType() != CONST.contractType.CASHFLOW) this.skip();
        await stm.sealContract();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
    });

    beforeEach(async () => {
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`setup - have correct initial state`, async () => {
        assert((await stm.getSecTokenTypes()).tokenTypes.length == 1);
        assert((await stm.getCcyTypes()).ccyTypes.length == 1);
    });

    it(`setup - should not be able add token types`, async () => {
        try {
            await stm.addSecTokenType('NEW_TYPE_NAME');
        } catch (ex) {
            assert(ex.reason == 'Bad cashflow request', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`setup - should not be able to mint more than one batch`, async () => {
        await stm.mintSecTokenBatch(1, 1000, 1, accounts[1], CONST.nullFees, [], [], { from: accounts[0] });
        try {
            await stm.mintSecTokenBatch(1, 1000, 1, accounts[1], CONST.nullFees, [], [], { from: accounts[0] });
        } catch (ex) {
            assert(ex.reason == 'Bad cashflow request', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
});