const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');

const { DateTime } = require('luxon');

const futuresHelper = require('../test/futuresHelper.js');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;

    var FT1, FT1_underlyer, FT1_refCcy;
    var spotTypes, ccyTypes;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() == CONST.contractType.CASHFLOW) this.skip();
        await stm.sealContract();
        if (!global.TaddrNdx) global.TaddrNdx = 0;

        // add test FT type
        ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        const ftTestName = `FT_TEST_${new Date().getTime()}`;
        const addFtTx = await stm.addSecTokenType(ftTestName, CONST.settlementType.FUTURE, DateTime.local().plus({ days: 30 }).toMillis(), spotTypes[0].id, ccyTypes[0].id);
        FT1 = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.FUTURE).filter(p => p.name == ftTestName)[0];
        FT1_underlyer = spotTypes.filter(p => p.id == FT1.underlyerId)[0];
        FT1_refCcy = ccyTypes.filter(p => p.id == FT1.refCcyId)[0];
        //console.dir(FT1);
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`FT - should not allow non-owner to open a futures position`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        try {
            const x = await stm.openFtPos({ tokTypeId: FT1.id, ledger_A: A, ledger_B: B, qty_A: +10, qty_B: -10, price: 100 }, { from: accounts[1] });
        }
        catch (ex) { assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT - should not be able to open a futures position when read only`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: FT1.id, ledger_A: A, ledger_B: B, qty_A: +10, qty_B: -10, price: 100 });
            await stm.setReadOnly(false, { from: accounts[0] });
        }
        catch (ex) { 
            await stm.setReadOnly(false, { from: accounts[0] });
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`FT - should not be able to open a futures position without two distinct parties`, async () => {
        const A = accounts[global.TaddrNdx];
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: FT1.id, ledger_A: A, ledger_B: A, qty_A: +10, qty_B: -10, price: 100 });
        }
        catch (ex) { assert(ex.reason == 'Bad transfer', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT - should not be able to open a futures position with mismatched quantities`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: FT1.id, ledger_A: A, ledger_B: B, qty_A: +10, qty_B: -11, price: 100 });
        }
        catch (ex) { assert(ex.reason == 'Quantity mismatch', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT - should not be able to open a futures position with invalid (0) quantities`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: FT1.id, ledger_A: A, ledger_B: B, qty_A: 0, qty_B: 0, price: 100 });
        }
        catch (ex) { assert(ex.reason == 'Bad quantity', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT - should not be able to open a futures position with invalid (too large/small for signed int64) quantities`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        try {
            const bn = new BN(2).pow(new BN(64)).div(new BN(2));//.sub(new BN(1));

            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: FT1.id, ledger_A: A, ledger_B: B, 
                qty_A: bn.neg().toString(), qty_B: bn.toString(), 
                price: 100 });
        }
        catch (ex) { assert(ex.reason == 'Bad quantity', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
});
