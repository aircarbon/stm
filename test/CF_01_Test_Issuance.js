const Big = require('big.js');

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
        await subscribe(ISSUER, accounts[SUB_1], "0.0");
    });

    it(`cashflow - issuance - should not handle payable tx when contract is read only`, async () => {
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            await subscribe(
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
            await subscribe(ISSUER, accounts[++global.TaddrNdx], 
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
            await subscribe(ISSUER, accounts[++global.TaddrNdx], 
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
        const bought = await subscribe(ISSUER, accounts[SUB_1], web3.utils.fromWei(wei_maxSubscriptionValue.toFixed(), 'ether'));
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

    // todo: move to helper
    async function subscribe(issuer, subscriber, amount) {
        const issuer_balBefore = await web3.eth.getBalance(issuer);
        const issuer_ledgerBefore = await stm.getLedgerEntry(issuer);

        // const whitelist = await stm.getWhitelist();
        // console.log('whitelist', whitelist);
        // console.log('readOnly', await stm.readOnly());

        // subscribe
        const sub_balBefore = await web3.eth.getBalance(subscriber);
        const sub_ledgerBefore = await stm.getLedgerEntry(subscriber);

        const wei_subAmountSent = web3.utils.toWei(amount, "ether");
        const subscriptionTx = await stm.send(wei_subAmountSent, { from: subscriber });

        const sub_balAfter = await web3.eth.getBalance(subscriber);
        const contract_balAfter = await web3.eth.getBalance(stm.address);
        const issuer_balAfter = await web3.eth.getBalance(issuer);
        const sub_ledgerAfter = await stm.getLedgerEntry(subscriber);
        const issuer_ledgerAfter = await stm.getLedgerEntry(issuer);
        //truffleAssert.prettyPrintEmittedEvents(subscriptionTx);

        // expect subscriber gets change
        const wei_expectedChange = Big(wei_subAmountSent).mod(Big(cashflowData.wei_currentPrice));
        const count_expectedTokens = Big(wei_subAmountSent).minus(wei_expectedChange).div(Big(cashflowData.wei_currentPrice));
        const { weiCost: wei_Cost } = 
            await CONST.logGas(web3, subscriptionTx,
`Subscribe Ξ${web3.utils.fromWei(wei_subAmountSent, 'ether').toString().padStart(5)} => \
#${count_expectedTokens} token(s)`);

        // console.log('    sub_balBefore', sub_balBefore.toString());
        // console.log(' wei_subAmountSent', wei_subAmountSent);
        // console.log('          wei_Cost', wei_Cost);
        // console.log('     sub_balAfter', sub_balAfter.toString());
        assert(Big(sub_balAfter.toString()).eq(
            Big(sub_balBefore.toString())
            .minus(Big(wei_subAmountSent.toString()))
            .minus(Big(wei_Cost.toString()))
            .plus(Big(wei_expectedChange.toString()))
        ), 'unexpected subscriber balance after');

        // expect event
        // console.log('count_expectedTokens', count_expectedTokens.toString());
        // console.log('  wei_expectedChange', wei_expectedChange.toString());
        truffleAssert.eventEmitted(subscriptionTx, 'IssuanceSubscribed', 
            ev => ev.subscriber == subscriber && ev.issuer == issuer &&
                  Big(ev.weiSent.toString()).eq(Big(wei_subAmountSent.toString())) &&
                  Big(ev.weiChange.toString()).eq(wei_expectedChange) &&
                  Big(ev.tokensSubscribed).eq(count_expectedTokens)
        );

        // expect issuer has paid
        // console.log('  issuer_balBefore', issuer_balBefore.toString());
        // console.log(' wei_subAmountSent', wei_subAmountSent);
        // console.log('   issuer_balAfter', issuer_balAfter.toString());
        assert(Big(issuer_balAfter.toString()).eq(
            Big(issuer_balBefore.toString())
            .plus(Big(wei_subAmountSent))
            .minus(Big(wei_expectedChange.toString()))
        ), 'unexpected issuer balance after');

        // expect tokens are moved
        // console.log('  sub_ledgerBefore.tokens_sumQty', sub_ledgerBefore.tokens_sumQty);
        // console.log('   sub_ledgerAfter.tokens_sumQty', sub_ledgerAfter.tokens_sumQty);
        // console.log('issuer_ledgerBefore.tokens_sumQty', issuer_ledgerBefore.tokens_sumQty);
        // console.log(' issuer_ledgerAfter.tokens_sumQty', issuer_ledgerAfter.tokens_sumQty);
        if (wei_subAmountSent > 0) {
            assert(Big(issuer_ledgerAfter.tokens_sumQty).lt(Big(issuer_ledgerBefore.tokens_sumQty)), 'unexpected issuer token balance after');
            assert(Big(sub_ledgerAfter.tokens_sumQty).gt(Big(sub_ledgerBefore.tokens_sumQty)), 'unexpected subscriber token balance after');
            assert(Big(sub_ledgerBefore.tokens_sumQty).plus(issuer_ledgerBefore.tokens_sumQty).eq(
                Big(sub_ledgerAfter.tokens_sumQty).plus(Big(issuer_ledgerAfter.tokens_sumQty))
            ), 'unexpected total sum tokens after');
        }
        return count_expectedTokens.toString();
    }

});