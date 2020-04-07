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

    var usd, usdFT_underlyer, usdFT_refCcy; // usd FT
    var eth, ethFT_underlyer, ethFT_refCcy; // eth FT
    var spotTypes, ccyTypes;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() == CONST.contractType.CASHFLOW) this.skip();
        await stm.sealContract();
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
               initMarginBips: 0,
                varMarginBips: 0,
        });
        usd = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_USD)[0];
        usdFT_underlyer = spotTypes.filter(p => p.id == usd.ft.underlyerTypeId)[0];
        usdFT_refCcy = ccyTypes.filter(p => p.id == usd.refCcyId)[0];

        // add test FT type - ETH
        const ftTestName_ETH = `FT_ETH_${new Date().getTime()}`;
        const addFtTx_ETH = await stm.addSecTokenType(ftTestName_ETH, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
            expiryTimestamp: DateTime.local().plus({ days: 30 }).toMillis(),
            underlyerTypeId: spotTypes[0].id,
                   refCcyId: ccyTypes.find(p => p.name === 'ETH').id,
               contractSize: 1000,
             initMarginBips: 0,
              varMarginBips: 0,
        });
        eth = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_ETH)[0];
        ethFT_underlyer = spotTypes.filter(p => p.id == eth.ft.underlyerTypeId)[0];
        ethFT_refCcy = ccyTypes.filter(p => p.id == eth.refCcyId)[0];
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`FT position fees & margin - should be able apply USD $3 per contract fee and 10% margin on a new futures position`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE_PER_CONTRACT = new BN(300), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(3000);
        await stm.setFuture_FeePerContract(usd.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(usd.id, 1000); // 10%

        const NOTIONAL = new BN(usd.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        const POS_MARGIN = NOTIONAL.div(new BN(10)); // 10%
        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN));
        console.log('NOTIONAL $', Number(NOTIONAL.toString())/100);
        console.log('POS_MARGIN $', Number(POS_MARGIN.toString())/100);
        console.log('MIN_BALANCE $', Number(MIN_BALANCE.toString())/100);

        await stm.fund(usd.ft.refCcyId, MIN_BALANCE.toString(), A);
        await stm.fund(usd.ft.refCcyId, MIN_BALANCE.toString(), B);
        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usd.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
        await CONST.logGas(web3, x.tx, `Open futures position (USD)`);
        truffleAssert.prettyPrintEmittedEvents(x.tx);
    });
    it(`FT positions fees & margin - should be able apply (large) ETH per contract fee and 10% margin on a new futures position`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE_PER_CONTRACT = new BN(CONST.oneEth_wei), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(CONST.oneEth_wei).mul(new BN(10));
        await stm.setFuture_FeePerContract(eth.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(eth.id, 1000); // 10%

        const NOTIONAL = new BN(eth.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        const POS_MARGIN = NOTIONAL.div(new BN(10)); // 10%
        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN));
        //console.log('NOTIONAL Ξ', web3.utils.fromWei(NOTIONAL).toString());
        //console.log('POS_MARGIN Ξ', web3.utils.fromWei(POS_MARGIN).toString());
        //console.log('MIN_BALANCE Ξ', web3.utils.fromWei(MIN_BALANCE).toString());

        await stm.fund(eth.ft.refCcyId, MIN_BALANCE.toString(), A);
        await stm.fund(eth.ft.refCcyId, MIN_BALANCE.toString(), B);

        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: eth.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
        await CONST.logGas(web3, x.tx, `Open futures position (ETH)`);
        truffleAssert.prettyPrintEmittedEvents(x.tx);
    });

    it(`FT positions fees & margin - should not allow a futures position to be opened with insufficient (balance) USD to cover fees & margin (A)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE_PER_CONTRACT = new BN(300), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(3000);
        await stm.setFuture_FeePerContract(usd.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(usd.id, 1000); // 10%

        const NOTIONAL = new BN(usd.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        const POS_MARGIN = NOTIONAL.div(new BN(10)); // 10%
        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(POS_MARGIN);

        await stm.fund(usd.ft.refCcyId, MIN_BALANCE.sub(POS_MARGIN).toString(), A); // sufficient for fees (applied first), insufficient for margin 
        await stm.fund(usd.ft.refCcyId, MIN_BALANCE.toString(), B);
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usd.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
        }
        catch (ex) { assert(ex.reason == 'Reservation exceeds balance', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
    it(`FT positions fees & margin - should not allow a futures position to be opened with insufficient (balance) USD to cover fees & margin (B)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE_PER_CONTRACT = new BN(300), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(3000);
        await stm.setFuture_FeePerContract(usd.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(usd.id, 1000); // 10%

        const NOTIONAL = new BN(usd.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        const POS_MARGIN = NOTIONAL.div(new BN(10)); // 10%
        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(POS_MARGIN);

        await stm.fund(usd.ft.refCcyId, MIN_BALANCE.toString(), A);
        await stm.fund(usd.ft.refCcyId, MIN_BALANCE.sub(POS_MARGIN).toString(), B); // sufficient for fees (applied first), insufficient for margin 
        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usd.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
        }
        catch (ex) { assert(ex.reason == 'Reservation exceeds balance', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT positions fees & margin - should not allow a futures position to be opened with insufficient (unreserved) USD to cover fees & margin (A)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE_PER_CONTRACT = new BN(300), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(3000);
        await stm.setFuture_FeePerContract(usd.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(usd.id, 1000); // 10%

        const NOTIONAL = new BN(usd.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        const POS_MARGIN = NOTIONAL.div(new BN(10)); // 10%
        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(POS_MARGIN);

        await stm.fund(usd.ft.refCcyId, MIN_BALANCE.toString(), A);
        await stm.fund(usd.ft.refCcyId, MIN_BALANCE.toString(), B);
        
        await stm.setReservedCcy(usd.ft.refCcyId, new BN(1), A); // insufficient unreserved 

        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usd.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
        }
        catch (ex) { assert(ex.reason == 'Reservation exceeds balance', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });

    it(`FT positions fees & margin - should not allow a futures position to be opened with insufficient (unreserved) USD to cover fees & margin (B)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE_PER_CONTRACT = new BN(300), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(3000);
        await stm.setFuture_FeePerContract(usd.id, FEE_PER_CONTRACT);
        await stm.setFuture_VariationMargin(usd.id, 1000); // 10%

        const NOTIONAL = new BN(usd.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);
        const POS_MARGIN = NOTIONAL.div(new BN(10)); // 10%
        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(POS_MARGIN);

        await stm.fund(usd.ft.refCcyId, MIN_BALANCE.toString(), A);
        await stm.fund(usd.ft.refCcyId, MIN_BALANCE.toString(), B);
        
        await stm.setReservedCcy(usd.ft.refCcyId, new BN(1), B); // insufficient unreserved 

        try {
            const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usd.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
        }
        catch (ex) { assert(ex.reason == 'Reservation exceeds balance', `unexpected: ${ex.reason}`); return; }
        assert.fail('expected contract exception');
    });
});
