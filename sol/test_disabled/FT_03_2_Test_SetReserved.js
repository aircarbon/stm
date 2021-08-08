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

const transferHelper = require('../test/transferHelper.js');
const CONST = require('../const.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;
    
    var ccyTypes, usdCcy, ethCcy;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 0;

        await setupHelper.whitelistAndSeal({ stm, accounts });
        await setupHelper.setDefaults({ stm, accounts });

        ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        usdCcy = ccyTypes.find(p => p.name === 'USD');
        ethCcy = ccyTypes.find(p => p.name === 'ETH');
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`FT reserved ccy - should be able to set a reserved USD amount for a ledger entry`, async () => {
        const A = accounts[global.TaddrNdx];
        const FUND = 100 * 10000,
           RESERVE = 100 * 10000;
        const fundTx = await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdCcy.id, FUND, A, 'TEST');
        const reserveTx = await stm.setReservedCcy(usdCcy.id, RESERVE, A, );
        const leCcy = (await stm.getLedgerEntry(A)).ccys.find(p => p.ccyTypeId == usdCcy.id);
        assert(leCcy.balance == FUND && leCcy.reserved == RESERVE);
    });
    it(`FT reserved ccy - should be able to set a (huge) reserved ETH amount for a ledger entry`, async () => {
        const A = accounts[global.TaddrNdx];
        const FUND = new BN(CONST.millionEth_wei).mul(new BN(1000000000)),
           RESERVE = new BN(CONST.millionEth_wei).mul(new BN(1000000000)).div(new BN(2));
        const fundTx = await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, ethCcy.id, FUND, A, 'TEST');
        const reserveTx = await stm.setReservedCcy(ethCcy.id, RESERVE, A, );
        const leCcy = (await stm.getLedgerEntry(A)).ccys.find(p => p.ccyTypeId == ethCcy.id);
        assert(leCcy.balance == FUND && leCcy.reserved == RESERVE);
    });

    it(`FT reserved ccy - should not allow non-owner to set reserved ammount for a ledger entry`, async () => {
        const A = accounts[global.TaddrNdx];
        try {
            const x = await stm.setReservedCcy(usdCcy.id, 100, A, { from: accounts[10] });
        }
        catch (ex) { assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT reserved ccy - should not be able to set reserved ammount for a ledger entry when read only`, async () => {
        const A = accounts[global.TaddrNdx];
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            const x = await stm.setReservedCcy(usdCcy.id, 100, A, );
            await stm.setReadOnly(false, { from: accounts[0] });
        }
        catch (ex) { 
            await stm.setReadOnly(false, { from: accounts[0] });
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`FT reserved ccy - should not be able to set an invalid (< 0) reserved amount for a ledger entry`, async () => {
        const A = accounts[global.TaddrNdx];
        try {
            const x = await stm.setReservedCcy(usdCcy.id, -1, A);
        }
        catch (ex) { assert(ex.reason == 'Bad reservedAmount', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT reserved ccy - should not be able to perform a spot USD/token trade (no fees) if currency consideration exceeds unreserved balance (USD from A)`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];
        const FUNDED = new BN(10000), RESERVED = FUNDED.div(new BN(2)), AVAIL = FUNDED.sub(RESERVED);

        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,       FUNDED, A, 'TEST');
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,   CONST.MT_CARBON,  1,     B, CONST.nullFees, 0, [], [], );
        await stm.setReservedCcy(CONST.ccyType.USD,           RESERVED,                A);
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, CONST.nullFees);
        await stm.setFee_CcyType(CONST.ccyType.USD,      CONST.nullAddr, CONST.nullFees);
        try {
            const x = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: 0,                                      tokTypeId_A: 0,
                       qty_B: CONST.KT_CARBON,                        tokTypeId_B: CONST.tokenType.TOK_T2,
                ccy_amount_A: AVAIL.add(new BN(1)),                   ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                      ccyTypeId_B: 0,
                   applyFees: true,
            });
        }
        catch (ex) { assert(ex.reason == 'Insufficient currency A', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT reserved ccy - should not be able to perform a spot USD/token trade (no fees) if currency consideration exceeds unreserved balance (USD from B)`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];
        const FUNDED = new BN(10000), RESERVED = FUNDED.div(new BN(2)), AVAIL = FUNDED.sub(RESERVED);

        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,   CONST.MT_CARBON,  1,     A, CONST.nullFees, 0, [], [], );
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,       FUNDED, B, 'TEST');
        await stm.setReservedCcy(CONST.ccyType.USD,           RESERVED,                B);
        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, CONST.nullFees);
        await stm.setFee_CcyType(CONST.ccyType.USD,      CONST.nullAddr, CONST.nullFees);
        try {
            const x = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: CONST.KT_CARBON,                        tokTypeId_A: CONST.tokenType.TOK_T2,
                       qty_B: 0,                                      tokTypeId_B: 0,
                ccy_amount_A: 0,                                      ccyTypeId_A: 0,
                ccy_amount_B: AVAIL.add(new BN(1)),                   ccyTypeId_B: CONST.ccyType.USD,
                   applyFees: true,
            });
        }
        catch (ex) { assert(ex.reason == 'Insufficient currency B', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT reserved ccy - should not be able to perform a spot USD/token trade ($3 per million, mirrored) if currency consideration exceeds unreserved balance (USD from A)`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];
        const FUNDED = new BN(10000), RESERVED = FUNDED.div(new BN(2)), AVAIL = FUNDED.sub(RESERVED), AVAIL_EX_FEES = AVAIL.sub(new BN(300)); // expected fee per 1m KG: $3

        // balance partially reserved on ccy sender A
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, FUNDED, A, 'TEST');
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,   CONST.MT_CARBON,  1,       B, CONST.nullFees, 0, [], [], );
        await stm.setReservedCcy(CONST.ccyType.USD,           RESERVED,                  A);

        // balance fully reserved on ccy receiver B - but he pays the mirrored fee from the ccy consideration
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, FUNDED, B, 'TEST');
        await stm.setReservedCcy(CONST.ccyType.USD,           FUNDED,                    B);

        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, CONST.nullFees);
        await stm.setFee_CcyType(CONST.ccyType.USD,      CONST.nullAddr, {...CONST.nullFees, ccy_mirrorFee: true, ccy_perMillion: 300 }); // fee per 1m KG: $3
        try {
            const x = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: 0,                                      tokTypeId_A: 0,
                       qty_B: CONST.KT_CARBON,                        tokTypeId_B: CONST.tokenType.TOK_T2, // 1m KG
                ccy_amount_A: AVAIL_EX_FEES.add(new BN(1)),           ccyTypeId_A: CONST.ccyType.USD,      // consideration in excess of available (unreserved) 
                ccy_amount_B: 0,                                      ccyTypeId_B: 0,
                   applyFees: true,
            });
        }
        catch (ex) { assert(ex.reason == 'Insufficient currency A', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT reserved ccy - should not be able to perform a spot USD/token trade ($3 per million, mirrored) if currency consideration exceeds unreserved balance (USD from B)`, async () => {
        const A = accounts[global.TaddrNdx + 0], B = accounts[global.TaddrNdx + 1];
        const FUNDED = new BN(10000), RESERVED = FUNDED.div(new BN(2)), AVAIL = FUNDED.sub(RESERVED), AVAIL_EX_FEES = AVAIL.sub(new BN(300)); // expected fee per 1m KG: $3

        // balance partially reserved on ccy sender B
        await stm.mintSecTokenBatch(CONST.tokenType.TOK_T2,   CONST.MT_CARBON,  1,       A, CONST.nullFees, 0, [], [], );
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, FUNDED, B, 'TEST');
        await stm.setReservedCcy(CONST.ccyType.USD,           RESERVED,                  B);

        // balance fully reserved on ccy receiver A - but he pays the mirrored fee from the ccy consideration
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,         FUNDED, A, 'TEST');
        await stm.setReservedCcy(CONST.ccyType.USD,           FUNDED,                    A);

        await stm.setFee_TokType(CONST.tokenType.TOK_T2, CONST.nullAddr, CONST.nullFees);
        await stm.setFee_CcyType(CONST.ccyType.USD,      CONST.nullAddr, {...CONST.nullFees, ccy_mirrorFee: true, ccy_perMillion: 300 }); // fee per 1m KG: $3
        try {
            const x = await transferHelper.transferLedger({ stm, accounts,
                    ledger_A: A,                                         ledger_B: B,
                       qty_A: CONST.KT_CARBON,                        tokTypeId_A: CONST.tokenType.TOK_T2, // 1m KG
                       qty_B: 0,                                      tokTypeId_B: 0,
                ccy_amount_A: 0,                                      ccyTypeId_A: 0,
                ccy_amount_B: AVAIL_EX_FEES.add(new BN(1)),           ccyTypeId_B: CONST.ccyType.USD,     
                   applyFees: true,
            });
        }
        catch (ex) { assert(ex.reason == 'Insufficient currency B', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT reserved ccy - should not be able to withdraw USD in excess of the ledger unreserved balance`, async () => {
        const A = accounts[global.TaddrNdx];
        const FUNDED = new BN(10000), RESERVED = FUNDED.div(new BN(2)), AVAIL = FUNDED.sub(RESERVED);
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD,        FUNDED, A, 'TEST');
        await stm.setReservedCcy(CONST.ccyType.USD,           RESERVED,                 A);
        try {
            await stm.fundOrWithdraw(CONST.fundWithdrawType.WITHDRAW, CONST.ccyType.USD, AVAIL.add(new BN(1)), A, 'TEST');
        }
        catch (ex) { assert(ex.reason == 'Insufficient balance', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT reserved ccy - should not be able to set a reserved USD amount in excess of the ledger balance (1)`, async () => {
        const A = accounts[global.TaddrNdx];
        try {
            const tx = await stm.setReservedCcy(usdCcy.id, 100, A);
        }
        catch (ex) { assert(ex.reason == 'Reservation exceeds balance', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT reserved ccy - should not be able to set a reserved USD amount in excess of the ledger balance (2)`, async () => {
        const A = accounts[global.TaddrNdx];
        const FUND = 100 * 10000,
           RESERVE = 100 * 10000 + 1;
        const fundTx = await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdCcy.id, FUND, A, 'TEST');
        try {
            const reserveTx = await stm.setReservedCcy(usdCcy.id, RESERVE, A);
        }
        catch (ex) { assert(ex.reason == 'Reservation exceeds balance', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

});
