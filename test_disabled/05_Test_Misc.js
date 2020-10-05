const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');

const transferHelper = require('../test/transferHelper.js');
const setupHelper = require('../test/testSetupContract.js');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        //await stm.sealContract();
        //await setupHelper.setDefaults({ stm, accounts });
        if (!global.TaddrNdx) global.TaddrNdx = 0;
    });

    beforeEach(async () => {
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // it(`misc - (commodity) should have default USD $3/1m tokens, mirrored`, async function() {
    //     const gfUsd = await stm.getFee(CONST.getFeeType.CCY, CONST.ccyType.USD, CONST.nullAddr);
    //     if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();

    //     assert(gfUsd.fee_min == 300, 'unexpected global fee USD fee_min');
    //     assert(gfUsd.ccy_perMillion == 300, 'unexpected global fee USD ccy_perMillion');
    //     assert(gfUsd.ccy_mirrorFee == true, 'unexpected global fee USD ccy_mirrorFee');
    // });

    // // https://iancoleman.io/bip39/#english
    // it(`misc - bip39 - should be able to use a maximum entropy (24 word = 512-bit) BIP39 mnemonic (BIP44 HD)`, async () => {
    //     for (let i=0 ; i < 10 ; i++) {
    //         const x = await CONST.getAccountAndKey(i,
    //             '...'
    //             );
    //         console.log(`${i} addr: ${x.addr} privKey: ${x.privKey}`);
    //         // if (i==0) {
    //         //     assert(x.privKey == '...', 'unexpected key')
    //         // }
    //     }
    // });

    // it(`misc - bip39 - should be able to generate Binace Smart Chain (BSC) (eth-compat) address from BIP39 mnemonic (BIP44 HD)`, async () => {
    //     for (let i=0 ; i < 10 ; i++) {
    //         const x = await CONST.getAccountAndKey(i,
    //             '',
    //             );

    //         console.log(`${i} addr: ${x.addr} privKey: ${x.privKey}`);
    //     }
    // });

    // it(`misc - contract owner should have default ledger entry`, async () => {
    //     const ownerLedgerEntry = await stm.getLedgerEntry(accounts[0]);
    //     assert(ownerLedgerEntry.exists == true, 'contract owner missing ledger entry');
    // });

    // it(`misc - only contract owner should be able to set read only state`, async () => {
    //     try {
    //         await stm.setReadOnly(true, { from: accounts[1] });
    //     } catch (ex) {
    //         assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`);
    //         return;
    //     }
    //     assert.fail('expected contract exception');
    // });

    // it(`misc - should be able to read contract type`, async () => {
    //     const type = await stm.getContractType();
    //     assert(type == CONST.contractType.COMMODITY || 
    //            type == CONST.contractType.CASHFLOW_BASE || 
    //            type == CONST.contractType.CASHFLOW_CONTROLLER);
    // });
});
