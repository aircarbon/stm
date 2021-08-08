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
    var ethFT, ethFT_underlyer, ethFT_refCcy; // eth FT
    var spotTypes, ccyTypes;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        
        await setupHelper.whitelistAndSeal({ stm, accounts });
        await setupHelper.setDefaults({ stm, accounts });
        if (!global.TaddrNdx) global.TaddrNdx = 0;

        ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);

        // add test FT type - USD
        const ftTestName_USD = `FT_USD_${new Date().getTime()}`;
        const addFtTx_USD = await stm.addSecTokenType(ftTestName_USD, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
              expiryTimestamp: DateTime.local().plus({ days: 30 }).toMillis(),
              underlyerTypeId: spotTypes[0].id,
                     refCcyId: ccyTypes.find(p => p.name === 'USD').id,
                 contractSize: 1000,
        }, CONST.nullAddr);
        usdFT = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_USD)[0];
        usdFT_underlyer = spotTypes.filter(p => p.id == usdFT.ft.underlyerTypeId)[0];
        usdFT_refCcy = ccyTypes.filter(p => p.id == usdFT.refCcyId)[0];

        // add test FT type - ETH
        const ftTestName_ETH = `FT_ETH_${new Date().getTime()}`;
        const addFtTx_ETH = await stm.addSecTokenType(ftTestName_ETH, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
            expiryTimestamp: DateTime.local().plus({ days: 30 }).toMillis(),
            underlyerTypeId: spotTypes[0].id,
                   refCcyId: ccyTypes.find(p => p.name === 'ETH').id,
               contractSize: 1000,
        }, CONST.nullAddr);
        ethFT = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_ETH)[0];
        ethFT_underlyer = spotTypes.filter(p => p.id == ethFT.ft.underlyerTypeId)[0];
        ethFT_refCcy = ccyTypes.filter(p => p.id == ethFT.refCcyId)[0];
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`FT position fees - should be able apply two-sided mirrored USD fees on an new futures position`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE = new BN(300), POS_QTY = new BN(1000);
        await stm.setFuture_FeePerContract(usdFT.id, FEE);
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, FEE.mul(POS_QTY).toString(), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, FEE.mul(POS_QTY).toString(), B, 'TEST');
        
        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: 100 });
        //await CONST.logGas(web3, x.tx, `Open futures position (USD)`);
        //truffleAssert.prettyPrintEmittedEvents(x.tx);
    });
    it(`FT positions fees - should be able apply large two-sided mirrored ETH fees on an new futures position`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE = new BN(CONST.oneEth_wei), POS_QTY = new BN(1000000000);
        await stm.setFuture_FeePerContract(ethFT.id, FEE);
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, ethFT.ft.refCcyId, FEE.mul(POS_QTY), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, ethFT.ft.refCcyId, FEE.mul(POS_QTY), B, 'TEST');

        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: ethFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONST.millionEth_wei });
        //await CONST.logGas(web3, x.tx, `Open futures position (ETH)`);
        //truffleAssert.prettyPrintEmittedEvents(x.tx);
    });

    it(`FT positions fees - should not allow a futures position to be opened with insufficient (balance) USD to cover fees (A)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        const FEE = new BN(300), POS_QTY = new BN(1000);
        await stm.setFuture_FeePerContract(usdFT.id, FEE);
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, FEE.mul(POS_QTY).toString(), B, 'TEST');
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: 100 });
        }
        catch (ex) { assert(ex.reason == 'Insufficient currency A', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT positions fees - should not allow a futures position to be opened with insufficient (balance) USD to cover fees (B)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        const FEE = new BN(300), POS_QTY = new BN(1000);
        await stm.setFuture_FeePerContract(usdFT.id, FEE);
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, FEE.mul(POS_QTY).toString(), A, 'TEST');
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: 100 });
        }
        catch (ex) { assert(ex.reason == 'Insufficient currency B', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT positions fees - should not allow a futures position to be opened with insufficient (unreserved) USD to cover fees (A)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        const FEE = new BN(300), POS_QTY = new BN(1000);
        await stm.setFuture_FeePerContract(usdFT.id, FEE);
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, FEE.mul(POS_QTY).toString(), A, 'TEST'); await stm.setReservedCcy(CONST.ccyType.USD, 1, A);
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, FEE.mul(POS_QTY).toString(), B, 'TEST');
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: 100 });
        }
        catch (ex) { assert(ex.reason == 'Insufficient currency A', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT positions fees - should not allow a futures position to be opened with insufficient (unreserved) USD to cover fees (B)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        const FEE = new BN(300), POS_QTY = new BN(1000);
        await stm.setFuture_FeePerContract(usdFT.id, FEE);
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, FEE.mul(POS_QTY).toString(), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, FEE.mul(POS_QTY).toString(), B, 'TEST'); await stm.setReservedCcy(CONST.ccyType.USD, 1, B);
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: 100 });
        }
        catch (ex) { assert(ex.reason == 'Insufficient currency B', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
});
