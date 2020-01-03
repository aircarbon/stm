const st = artifacts.require('StMaster');
const CONST = require('../const.js');
const helper = require('../test/transferHelper.js');

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() == CONST.contractType.CASHFLOW) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 0;
        
        for (let i=0 ; i < 60 ; i++) { // whitelist enough accounts for the tests
            await stm.whitelist(accounts[global.TaddrNdx + i]);
        }
        await stm.sealContract();
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`transferring ccy - should allow one-sided transfer (A -> B) of one currency (USD) across ledger entries`, async () => {
        await stm.fund(CONST.ccyType.SGD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.SGD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1], { from: accounts[0] });
        await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],       ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                tokenTypeId_A: 0,
                   qty_B: 0,                                tokenTypeId_B: 0,
            ccy_amount_A: CONST.thousandCcy_cents / 2,        ccyTypeId_A: CONST.ccyType.SGD,
            ccy_amount_B: 0,                                  ccyTypeId_B: 0,
        });
    });

    it(`transferring ccy - should allow one-sided transfer (B -> A) of one currency (ETH) across ledger entries`, async () => {
        await stm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.TaddrNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.TaddrNdx + 1], { from: accounts[0] });
        await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],       ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                tokenTypeId_A: 0,
                   qty_B: 0,                                tokenTypeId_B: 0,
            ccy_amount_A: 0,                                  ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                   ccyTypeId_B: CONST.ccyType.ETH,
        });
    });
    
    it(`transferring ccy - should allow two-sided transfer (A <-> B) of the same currency across ledger entries`, async () => {
        await stm.fund(CONST.ccyType.SGD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.SGD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1], { from: accounts[0] });
        await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],      ledger_B: accounts[global.TaddrNdx + 1],
                  qty_A: 0,                                tokenTypeId_A: 0,
                  qty_B: 0,                                tokenTypeId_B: 0,
            ccy_amount_A: CONST.thousandCcy_cents / 2,       ccyTypeId_A: CONST.ccyType.SGD,
            ccy_amount_B: CONST.thousandCcy_cents / 4,       ccyTypeId_B: CONST.ccyType.SGD,
        });
    });

    it(`transferring ccy - should allow two-sided transfer (A <-> B) of different currencies across ledger entries`, async () => {
        await stm.fund(CONST.ccyType.SGD, CONST.billionCcy_cents,        accounts[global.TaddrNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH, CONST.millionEth_wei,          accounts[global.TaddrNdx + 1], { from: accounts[0] });
        await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],      ledger_B: accounts[global.TaddrNdx + 1],
                  qty_A: 0,                                tokenTypeId_A: 0,
                  qty_B: 0,                                tokenTypeId_B: 0,
            ccy_amount_A: CONST.billionCcy_cents,            ccyTypeId_A: CONST.ccyType.SGD,
            ccy_amount_B: CONST.millionEth_wei,              ccyTypeId_B: CONST.ccyType.ETH,
        });
    });

    it(`transferring ccy - should have reasonable gas cost for one-sided currency transfer (A -> B), aka. fund movement`, async () => {
        await stm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.TaddrNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH, 0,                             accounts[global.TaddrNdx + 1], { from: accounts[0] });
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],      ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                               tokenTypeId_A: 0,
                   qty_B: 0,                               tokenTypeId_B: 0,
            ccy_amount_A: CONST.oneEth_wei,                  ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                 ccyTypeId_B: 0,
        });
        await CONST.logGas(web3, data.transferTx, `ccy one-way (A -> B)`);
    });

    it(`transferring ccy - should have reasonable gas cost for two-sided currency transfer (A <-> B)`, async () => {
        await stm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.TaddrNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.TaddrNdx + 1], { from: accounts[0] });
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.TaddrNdx + 0],       ledger_B: accounts[global.TaddrNdx + 1],
                   qty_A: 0,                                tokenTypeId_A: 0,
                   qty_B: 0,                                tokenTypeId_B: 0,
            ccy_amount_A: 10000000,                           ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 50000000,                           ccyTypeId_B: CONST.ccyType.ETH,
        });
        await CONST.logGas(web3, data.transferTx, `ccy two-way (A <-> B)`);
    });

    it(`transferring ccy - should not allow one-sided transfer (A -> B) of an invalid currency value`, async () => {
        await stm.fund(CONST.ccyType.SGD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.SGD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1], { from: accounts[0] });
        try {
            await helper.transferWrapper(stm, accounts,
                accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0, 0, 0, 0, 0
                -1,                          // ccy_amount_A
                CONST.ccyType.SGD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) {
            assert(ex.reason == 'Bad null transfer', `unexpected: ${ex.reason}`);
            return; 
        }
        assert.fail('expected contract exception');
    });

    it(`transferring ccy - should not allow one-sided transfer (B -> A) of an invalid currency value`, async () => {
        await stm.fund(CONST.ccyType.SGD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.SGD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1], { from: accounts[0] });
        try {
            await helper.transferWrapper(stm, accounts,
                accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0, 0, 0, 0, 
                0,                           // ccy_amount_A
                0,                           // ccyTypeId_A
                -1,                          // ccy_amount_B
                CONST.ccyType.SGD,           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad null transfer', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring ccy - should not allow two-sided transfer (A <-> B) of invalid currency values`, async () => {
        await stm.fund(CONST.ccyType.SGD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.SGD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1], { from: accounts[0] });
        try {
            await helper.transferWrapper(stm, accounts,
                accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0, 0, 0, 0, 
                -1,                          // ccy_amount_A
                CONST.ccyType.SGD,           // ccyTypeId_A
                -1,                          // ccy_amount_B
                CONST.ccyType.SGD,           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Bad null transfer', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring ccy - should not allow one-sided transfer (A -> B) of a currency value in excess of the balance`, async () => {
        await stm.fund(CONST.ccyType.SGD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.SGD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 1], { from: accounts[0] });
        try {
            await helper.transferWrapper(stm, accounts,
                accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0, 0, 0, 0, 
                CONST.thousandCcy_cents + 1, // ccy_amount_A
                CONST.ccyType.SGD,           // ccyTypeId_A
                0,                           // ccy_amount_B
                0,                           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Insufficient currency A', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring ccy - should not allow one-sided transfer (B -> A) of a currency value in excess of the balance`, async () => {
        await stm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.TaddrNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.TaddrNdx + 1], { from: accounts[0] });
        try {
            await helper.transferWrapper(stm, accounts,
                accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0, 0, 0, 0, 
                0,                           // ccy_amount_A
                0,                           // ccyTypeId_A
                CONST.thousandEth_wei,       // ccy_amount_B
                CONST.ccyType.ETH,           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Insufficient currency B', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`transferring ccy - should not allow two-sided transfer (A <-> B) of currency values in excess of the balances`, async () => {
        await stm.fund(CONST.ccyType.SGD, CONST.thousandCcy_cents,       accounts[global.TaddrNdx + 0], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH, CONST.oneEth_wei,              accounts[global.TaddrNdx + 1], { from: accounts[0] });
        try {
            await helper.transferWrapper(stm, accounts,
                accounts[global.TaddrNdx + 0], accounts[global.TaddrNdx + 1], 
                0, 0, 0, 0, 
                CONST.millionCcy_cents,      // ccy_amount_A
                CONST.ccyType.SGD,           // ccyTypeId_A
                CONST.thousandEth_wei,       // ccy_amount_B
                CONST.ccyType.ETH,           // ccyTypeId_B
                false,                       // applyFees
                { from: accounts[0] });
        } catch (ex) { 
            assert(ex.reason == 'Insufficient currency A', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
});