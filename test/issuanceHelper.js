const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const BN = require('bn.js');
const Big = require('big.js');
const CONST = require('../const.js');

module.exports = {

    subscribe: async (stm, wei_priceForOne, issuer, subscriber, amount) => {

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
        const wei_expectedChange = Big(wei_subAmountSent).mod(Big(wei_priceForOne)); //cashflowData.wei_currentPrice));
        const count_expectedTokens = Big(wei_subAmountSent).minus(wei_expectedChange).div(Big(wei_priceForOne)); //cashflowData.wei_currentPrice));
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

};