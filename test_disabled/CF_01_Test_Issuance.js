const Big = require('big.js');

const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');

const CONST = require('../const.js');
const transferHelper = require('../test/transferHelper.js');

const issuanceHelper = require('../test/issuanceHelper.js');

contract("StMaster", accounts => {
    var stm;
    var OWNER, OWNER_privKey;
    var ISSUER;

    const ISSUANCE_QTY = 1000000;
    var cashflowData;

    // sol: wrap mint + setArgs new qtyForSale (issue())

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.CASHFLOW) this.skip();
        if (!global.TaddrNdx) global.TaddrNdx = 0;

        const x = await CONST.getAccountAndKey(0);
        OWNER = x.addr; OWNER_privKey = x.privKey;

        cashflowData = await stm.getCashflowData();
    });

    beforeEach(async () => {
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${OWNER})`);
    });

    it(`cashflow - issuance - should not be able to subscribe when contract is not sealed`, async () => {
        try {
            await stm.send(cashflowData.wei_currentPrice, { from: accounts[++global.TaddrNdx] });
        } catch (ex) {  
            assert(ex.reason == 'Contract is not sealed', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance - should be able to seal contract`, async () => {
        await stm.sealContract();
    });

    it(`cashflow - issuance - should not handle payable tx when no issuance batch is minted`, async () => {
        try {
            await stm.send(cashflowData.wei_currentPrice, { from: accounts[++global.TaddrNdx] });
        } catch (ex) {  
            assert(ex.reason == 'Bad cashflow request: no minted batch', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance - should be able to mint issuance batch`, async () => {
        ISSUER = accounts[++global.TaddrNdx];
        await stm.mintSecTokenBatch(1, ISSUANCE_QTY, 1, ISSUER, CONST.nullFees, [], [], { from: OWNER });
    });

    it(`cashflow - issuance - should not be able to subscribe when issuer price is not set`, async () => {
        try {
            await stm.send(cashflowData.wei_currentPrice, { from: accounts[++global.TaddrNdx] });
        } catch (ex) {  
            assert(ex.reason == 'Bad cashflow request: no price set', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance - should not allow non-issuer to set issuer values`, async () => {
        try {
            await stm.setIssuerValues(web3.utils.toWei("0.02", "ether"), 1, { from: OWNER });
        } catch (ex) {  
            assert(ex.reason == 'Bad cashflow request: access denied', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance - should not allow issuer to set invalid issuer values (sale qty > monobatch)`, async () => {
        try {
            await stm.setIssuerValues(web3.utils.toWei("0.02", "ether"), ISSUANCE_QTY + 1, { from: ISSUER });
        } catch (ex) {  
            assert(ex.reason == 'Bad cashflow request: qty_saleAllocation too large', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance - should be able to set valid issuer values (sale qty = all monobatch)`, async () => {
        const wei_currentPrice = web3.utils.toWei("0.02", "ether");
        const qty_saleAllocation = ISSUANCE_QTY;
        await stm.setIssuerValues(wei_currentPrice, qty_saleAllocation, { from: ISSUER });
        cashflowData = await stm.getCashflowData();
        assert(cashflowData.qty_saleAllocation == qty_saleAllocation, 'unexpected qty_saleAllocation after setting issuer values');
        assert(cashflowData.wei_currentPrice == wei_currentPrice, 'unexpected wei_currentPrice after setting issuer values');
    });

    it(`cashflow - issuance - should not be able to change issuer price value for bond once set`, async () => {
        if (cashflowData.args.cashflowType != CONST.cashflowType.BOND) this.skip();
        const wei_currentPrice = web3.utils.toWei("0.03", "ether");
        const qty_saleAllocation = ISSUANCE_QTY;
        try {
            await stm.setIssuerValues(wei_currentPrice, qty_saleAllocation, { from: ISSUER });
        } catch (ex) {  
            assert(ex.reason == 'Bad cashflow request: cannot change price for bond once set', `unexpected: ${ex.reason}`);
            return;
        }
    });

    it(`cashflow - issuance - should be able to handle zero-value payable tx`, async () => {
        const SUB_1 = ++global.TaddrNdx;
        await issuanceHelper.subscribe(stm, ISSUER, accounts[SUB_1], "0.0");
    });

    it(`cashflow - issuance - should not handle payable tx when contract is read only`, async () => {
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            await issuanceHelper.subscribe(stm, 
                ISSUER,
                accounts[++global.TaddrNdx], 
                web3.utils.fromWei(cashflowData.wei_currentPrice.toString(), 'ether'));
            await stm.setReadOnly(false, { from: accounts[0] });
        } catch (ex) {  
            await stm.setReadOnly(false, { from: accounts[0] });
            assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance - should not be able to subscribe more than the monobatch size`, async () => {
        try {
            const wei_maxSubscriptionValue = Big(cashflowData.wei_currentPrice).times(Big(ISSUANCE_QTY))
            await issuanceHelper.subscribe(stm, ISSUER, accounts[++global.TaddrNdx], 
                web3.utils.fromWei(
                    wei_maxSubscriptionValue
                    .plus(Big(cashflowData.wei_currentPrice)) // round up one token qty
                .toFixed(), 'ether'));
        } catch (ex) {  
            assert(ex.reason == 'Bad cashflow request: insufficient quantity for sale', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance - should be able to set valid issuer values (sale qty = 20% of monobatch)`, async () => {
        const wei_currentPrice = web3.utils.toWei("0.02", "ether");
        const qty_saleAllocation = Math.ceil(ISSUANCE_QTY * 0.2);
        await stm.setIssuerValues(wei_currentPrice, qty_saleAllocation, { from: ISSUER });
        cashflowData = await stm.getCashflowData();
        assert(cashflowData.qty_saleAllocation == qty_saleAllocation, 'unexpected qty_saleAllocation after setting issuer values');
        assert(cashflowData.wei_currentPrice == wei_currentPrice, 'unexpected wei_currentPrice after setting issuer values');
    });

    it(`cashflow - issuance - should not be able to subscribe more than the available sale qty`, async () => {
        try {
            const wei_maxSubscriptionValue = Big(cashflowData.wei_currentPrice).times(Big(cashflowData.qty_saleAllocation))
            await issuanceHelper.subscribe(stm, ISSUER, accounts[++global.TaddrNdx], 
                web3.utils.fromWei(
                    wei_maxSubscriptionValue
                    .plus(Big(cashflowData.wei_currentPrice)) // round up one token qty
                .toFixed(), 'ether'));
        } catch (ex) {  
            assert(ex.reason == 'Bad cashflow request: insufficient quantity for sale', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance - should be able to subscribe up to the available sale qty`, async () => {
        const SUB_1 = ++global.TaddrNdx;
        const wei_maxSubscriptionValue = Big(cashflowData.wei_currentPrice).times(Big(cashflowData.qty_saleAllocation))
        //console.log('cashflowData.qty_saleAllocation', cashflowData.qty_saleAllocation.toString());
        const bought = await issuanceHelper.subscribe(stm, ISSUER, accounts[SUB_1], web3.utils.fromWei(wei_maxSubscriptionValue.toFixed(), 'ether'));
        //console.log('bought', bought);
    });

    it(`cashflow - issuance - should not allow issuer to set invalid issuer values (sale qty < already sold qty)`, async () => {
        try {
            cashflowData = await stm.getCashflowData();
            //console.log('cashflowData.qty_issuanceSold', cashflowData.qty_issuanceSold.toString());
            await stm.setIssuerValues(web3.utils.toWei("0.02", "ether"), Big(cashflowData.qty_issuanceSold).minus(1).toFixed(), { from: ISSUER });
        } catch (ex) {  
            assert(ex.reason == 'Bad cashflow request: qty_saleAllocation too small', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
    
    // TODO: equity -- test change of price...

    // it(`cashflow - issuance - can multi-subscribe up to max issuance`, async () => {
    //     const SUB_1 = ++global.TaddrNdx;
    //     await subscribe(ISSUER, accounts[SUB_1], "2.5");
    //     await subscribe(ISSUER, accounts[SUB_1], "2.0");
    //     await subscribe(ISSUER, accounts[SUB_1], "1.9");
    //     const SUB_2 = ++global.TaddrNdx;
    //     await subscribe(ISSUER, accounts[SUB_2], "20.5");
    //     await subscribe(ISSUER, accounts[SUB_2], "20.0");
    //     await subscribe(ISSUER, accounts[SUB_2], "10.9");
    //     const SUB_3 = ++global.TaddrNdx;
    //     await subscribe(ISSUER, accounts[SUB_3], "200.5");
    //     await subscribe(ISSUER, accounts[SUB_3], "200.0");
    //     await subscribe(ISSUER, accounts[SUB_3], "100.9");
    // });

    // // todo: move to helper
    // async function subscribe(issuer, subscriber, amount) {

    // }

});