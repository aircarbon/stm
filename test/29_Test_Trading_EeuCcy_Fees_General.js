const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');
const helper = require('../test/transferHelper.js');
const BN = require('bn.js');
const Big = require('big.js');
const Web3 = require('web3');
const web3 = new Web3();

contract("StMaster", accounts => {
    var stm;

    beforeEach(async () => {
        stm = await st.deployed();
        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${stm.address} (owner: ${accounts[0]}) - getSecTokenBatchCount: ${(await stm.getSecTokenBatchCount.call()).toString()}`);
    });

    // NO FEES IF FEE RECEIVER = FEE SENDER

    it('trading fees (general) - global carbon fee should not be applied when fee sender is fee receiver (fee on A)', async () => {
        const A = accounts[0]; // exchange account
        const B = accounts[global.accountNdx + 1];

        // mint
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      A, CONST.nullFees, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      A, CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        B,                         { from: accounts[0] });

        // set global fee
        const globalFee = { fee_fixed: 0, fee_percBips: 100, fee_min: 0, fee_max: 0 };
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: 0, fee_percBips: 100, fee_min: 0, fee_max: 0 } );
        await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr,   CONST.nullFees );

        // transfer
        const transferAmountKg = new BN(1500);
        const expectedFeeKg = 0; // no fees expected: fee-sender == fee-receiver
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: transferAmountKg,               tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // contract owner has (A) paid no fees
        const owner_balBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).minus(Big(transferAmountKg)).plus(Big(expectedFeeKg))), 'unexpected fee receiver carbon balance after transfer');
        
        // receiver has received expected quantity
        const receiver_balBefore = data.ledgerB_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const receiver_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(receiver_balAfter).eq(Big(receiver_balBefore).plus(Big(transferAmountKg))), 'unexpected receiver currency carbon after transfer');
    });
});