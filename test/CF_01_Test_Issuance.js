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

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.CASHFLOW) this.skip();
        await stm.sealContract();
        if (!global.TaddrNdx) global.TaddrNdx = 0;

        const x = await CONST.getAccountAndKey(0);
        OWNER = x.addr; OWNER_privKey = x.privKey;

        ISSUER = accounts[++global.TaddrNdx];
        await stm.mintSecTokenBatch(1, 1000, 1, ISSUER, CONST.nullFees, [], [], { from: OWNER });
    });

    beforeEach(async () => {
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${OWNER})`);
    });

    it(`cashflow - issuance - should not be able to subscribe more than the issuance size`, async () => {
        try {
            await subscribe(ISSUER, accounts[++global.TaddrNdx], "1001");
        } catch (ex) {  
            assert(ex.reason == 'Insufficient remaining issuance', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`cashflow - issuance - can multi-subscribe up to max issuance`, async () => {
        // TODO: multi-loop, expect last fill fails (subscription full)
        // TODO: display/info -- (on cashflowdata struct): calc issuanceRemaining
        await subscribe(ISSUER, accounts[++global.TaddrNdx], "2.5");
    });

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
        const cashflowData = await stm.getCashflowData();
        const wei_expectedChange = Big(wei_subAmountSent).mod(Big(cashflowData.args.wei_issuancePrice));
        const count_expectedTokens = Big(wei_subAmountSent).minus(wei_expectedChange).div(Big(cashflowData.args.wei_issuancePrice));
        const { weiCost: wei_Cost } = await CONST.logGas(web3, subscriptionTx, 'Subscribe to issuance');
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
        assert(Big(issuer_ledgerAfter.tokens_sumQty).lt(Big(issuer_ledgerBefore.tokens_sumQty)), 'unexpected issuer token balance after');
        assert(Big(sub_ledgerAfter.tokens_sumQty).gt(Big(sub_ledgerBefore.tokens_sumQty)), 'unexpected subscriber token balance after');
        assert(Big(sub_ledgerBefore.tokens_sumQty).plus(issuer_ledgerBefore.tokens_sumQty).eq(
            Big(sub_ledgerAfter.tokens_sumQty).plus(Big(issuer_ledgerAfter.tokens_sumQty))
        ), 'unexpected total sum tokens after');
    }

});