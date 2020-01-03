const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');

const CONST = require('../const.js');
const helper = require('../test/transferHelper.js');

contract("StMaster", accounts => {
    var stm;
    var OWNER, OWNER_privKey;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.CASHFLOW) this.skip();
        await stm.sealContract();
        if (!global.TaddrNdx) global.TaddrNdx = 0;

        const x = await CONST.getAccountAndKey(0);
        OWNER = x.addr; OWNER_privKey = x.privKey;
    });

    beforeEach(async () => {
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${OWNER})`);
    });

    it(`cashflow - issuance - can multi-subscribe up to max issuance`, async () => {

        // mint for issuer
        const ISSUER = accounts[1];
        await stm.mintSecTokenBatch(1, 1000, 1, ISSUER, CONST.nullFees, [], [], { from: OWNER });
        const contract_balBefore = await web3.eth.getBalance(stm.address);
        const issuer_balBefore = await web3.eth.getBalance(ISSUER);

        // const whitelist = await stm.getWhitelist();
        // console.log('whitelist', whitelist);
        // console.log('readOnly', await stm.readOnly());

        // subscribe
        // TODO: multi-loop, expect last fill fails (subscription full)
        const SUB_1 = accounts[2];
        const sub1_balBefore = await web3.eth.getBalance(SUB_1);
        const subTx = await stm.send(web3.utils.toWei("2.5", "ether"), { from: SUB_1 });
        const sub1_balAfter = await web3.eth.getBalance(SUB_1);
        truffleAssert.prettyPrintEmittedEvents(subTx);
        CONST.logGas(subTx, 'Subscribe to issuance');

        // expect subscriber has paid
        //...

        // expect change
        //...

        // expect tokens moved
        //...

        // expect issuer is paid
        //...

        const contract_balAfter = await web3.eth.getBalance(stm.address);
        const issuer_balAfter = await web3.eth.getBalance(ISSUER);

        console.log('    sub1_balBefore', sub1_balBefore.toString());
        console.log('     sub1_balAfter', sub1_balBefore.toString());

        console.log('contract_balBefore', contract_balBefore.toString());
        console.log('  issuer_balBefore', issuer_balBefore.toString());

        console.log(' contract_balAfter', contract_balAfter.toString());
        console.log('   issuer_balAfter', issuer_balAfter.toString());
    });

});