// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StFutures.sol => FuturesLib.sol
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
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;
    var usdFT, usdFT_underlyer, usdFT_refCcy; // usd FT
    
    var ccyTypes, spotTypes;

    const FEE_PER_CONTRACT = new BN(300); // $3.00

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        
        await setupHelper.whitelistAndSeal({ stm, accounts });
        await setupHelper.setDefaults({ stm, accounts });
        
        if (!global.TaddrNdx) global.TaddrNdx = 0;

        // add test FT type - USD
        ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        const ftTestName_USD = `FT_USD_${new Date().getTime()}`;
        const addFtTx_USD = await stm.addSecTokenType(ftTestName_USD, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
              expiryTimestamp: DateTime.local().plus({ days: 30 }).toMillis(),
              underlyerTypeId: spotTypes[0].id,
                     refCcyId: ccyTypes.find(p => p.name === 'USD').id,
                 contractSize: 1000,
               initMarginBips: 50,
                varMarginBips: 50,
               feePerContract: FEE_PER_CONTRACT.toString()
        }, CONST.nullAddr);
        usdFT = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_USD)[0];
        usdFT_underlyer = spotTypes.filter(p => p.id == usdFT.ft.underlyerTypeId)[0];
        usdFT_refCcy = ccyTypes.filter(p => p.id == usdFT.refCcyId)[0];
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`FT fee per contract override - should be able to override fee per contract for a ledger entry (A & B)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const POS_QTY = new BN(1), CONTRACT_PRICE = new BN(1);
        const NOTIONAL = new BN(usdFT.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        
        const FPC_A = new BN(100); // $1.00
        const FPC_B = new BN(200); // $2.00
        await stm.setLedgerOverride(2, usdFT.id, A, FPC_A); //await stm.feePerContractOverride(usdFT.id, A, FPC_A);
        await stm.setLedgerOverride(2, usdFT.id, B, FPC_B); //await stm.feePerContractOverride(usdFT.id, B, FPC_B);

        const POS_MARGIN = (((new BN(100) // total margin, bips - 1.00%
                              .mul(new BN(1000000))).div(new BN(10000))).mul(NOTIONAL)).div(new BN(1000000));
        const CHECK = Math.floor(Number(NOTIONAL) * 0.01);
        assert(CHECK == POS_MARGIN);

        const MIN_BALANCE_A = FPC_A.mul(POS_QTY).add(new BN(POS_MARGIN));
        const MIN_BALANCE_B = FPC_B.mul(POS_QTY).add(new BN(POS_MARGIN));
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE_A.toString(), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE_B.toString(), B, 'TEST');
        await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
    });

    it(`FT fee per contract override - should be able to override fee per contract for a ledger entry (A)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const POS_QTY = new BN(1), CONTRACT_PRICE = new BN(1);
        const NOTIONAL = new BN(usdFT.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        
        const FPC_A = new BN(100); // $1.00
        await stm.setLedgerOverride(2, usdFT.id, A, FPC_A); //await stm.feePerContractOverride(usdFT.id, A, FPC_A);

        const POS_MARGIN = (((new BN(100) // total margin, bips - 1.00%
                              .mul(new BN(1000000))).div(new BN(10000))).mul(NOTIONAL)).div(new BN(1000000));
        const CHECK = Math.floor(Number(NOTIONAL) * 0.01);
        assert(CHECK == POS_MARGIN);

        const MIN_BALANCE_A = FPC_A.mul(POS_QTY).add(new BN(POS_MARGIN));
        const MIN_BALANCE_B = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN));
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE_A.toString(), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE_B.toString(), B, 'TEST');
        await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
    });
    it(`FT fee per contract override - should be able to override fee per contract for a ledger entry (B)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const POS_QTY = new BN(1), CONTRACT_PRICE = new BN(1);
        const NOTIONAL = new BN(usdFT.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        
        const FPC_B = new BN(100); // $1.00
        await stm.setLedgerOverride(2, usdFT.id, B, FPC_B); //await stm.feePerContractOverride(usdFT.id, B, FPC_B);

        const POS_MARGIN = (((new BN(100) // total margin, bips - 1.00%
                              .mul(new BN(1000000))).div(new BN(10000))).mul(NOTIONAL)).div(new BN(1000000));
        const CHECK = Math.floor(Number(NOTIONAL) * 0.01);
        assert(CHECK == POS_MARGIN);

        const MIN_BALANCE_A = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN));
        const MIN_BALANCE_B = FPC_B.mul(POS_QTY).add(new BN(POS_MARGIN));
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE_A.toString(), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE_B.toString(), B, 'TEST');
        await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
    });

    it(`FT fee per contract override - should not allow non-owner to override fee per contract`, async () => {
        const A = accounts[global.TaddrNdx];
        try {
            const x = await stm.setLedgerOverride(2, usdFT.id, A, 100, { from: accounts[10] });
        }
        catch (ex) { assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT fee per contract override - should not be able to override fee per contract when read only`, async () => {
        const A = accounts[global.TaddrNdx];
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            const x = await stm.setLedgerOverride(2, usdFT.id, A, 100); //await stm.feePerContractOverride(usdFT.id, A, 100);
            await stm.setReadOnly(false, { from: accounts[0] });
        }
        catch (ex) { 
            await stm.setReadOnly(false, { from: accounts[0] });
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`FT fee per contract override - should not be able to override fee per contract for an invalid (non-existent) token type`, async () => {
        const A = accounts[global.TaddrNdx]; await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, 100, A, 'TEST');
        try {
            const x = await stm.setLedgerOverride(2, 0xdeaddead, A, 1001); //await stm.feePerContractOverride(0xdeaddead, A, 1001);
        }
        catch (ex) { assert(ex.reason == 'Bad tokTypeId', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT fee per contract override - should not be able to override fee per contract for an invalid (non-future) token type`, async () => {
        const A = accounts[global.TaddrNdx]; await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, 100, A, 'TEST');
        try {
            const x = await stm.setLedgerOverride(2, CONST.tokenType.TOK_T1, A, 1002); //await stm.feePerContractOverride(CONST.tokenType.TOK_T1, A, 1002);
        }
        catch (ex) { assert(ex.reason == 'Bad token settlement type', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
});
