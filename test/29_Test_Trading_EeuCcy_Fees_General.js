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

    it('trading fees (general) - global/ledger/batch carbon fee should not be applied when fee sender is fee receiver (fee on A)', async () => {
        const A = accounts[0]; // sender is exchange account, exchange fee receiver, and batch originator fee receiver
        const B = accounts[global.accountNdx + 1];
        const allFees = { fee_fixed: 0, fee_percBips: 100, fee_min: 0, fee_max: 0 };

        // mint
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      A, allFees, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      A, allFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        B,                  { from: accounts[0] });

        // set global fee & ledger fee
        await stm.setFee_TokType(CONST.tokenType.VCS, A,              allFees );
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, allFees );
        await stm.setFee_CcyType(CONST.ccyType.ETH,   A,              CONST.nullFees );
        await stm.setFee_CcyType(CONST.ccyType.ETH,   CONST.nullAddr, CONST.nullFees );

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
        assert(Big(receiver_balAfter).eq(Big(receiver_balBefore).plus(Big(transferAmountKg))), 'unexpected receiver carbon after transfer');
    });

    it('trading fees (general) - global/ledger/batch carbon fee should not be applied when fee sender is fee receiver (fee on B)', async () => {
        const A = accounts[global.accountNdx + 0];
        const B = accounts[0]; // sender is exchange account, exchange fee receiver, and batch originator fee receiver
        const allFees = { fee_fixed: 0, fee_percBips: 100, fee_min: 0, fee_max: 0 };

        // mint
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        A,                  { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      B, allFees, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      B, allFees, [], [], { from: accounts[0] });

        // set global fee & ledger fee
        await stm.setFee_TokType(CONST.tokenType.VCS, B,              allFees );
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, allFees );
        await stm.setFee_CcyType(CONST.ccyType.ETH,   B,              CONST.nullFees );
        await stm.setFee_CcyType(CONST.ccyType.ETH,   CONST.nullAddr, CONST.nullFees );

        // transfer
        const transferAmountKg = new BN(1500);
        const expectedFeeKg = 0; // no fees expected: fee-sender == fee-receiver
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: 0,                              tokenTypeId_A: 0,
                   qty_B: transferAmountKg,               tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });

        // contract owner has (A) paid no fees
        const owner_balBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).minus(Big(transferAmountKg)).plus(Big(expectedFeeKg))), 'unexpected fee receiver carbon balance after transfer');
        
        // receiver has received expected quantity
        const receiver_balBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const receiver_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(receiver_balAfter).eq(Big(receiver_balBefore).plus(Big(transferAmountKg))), 'unexpected receiver carbon after transfer');
    });

    it('trading fees (general) - global/ledger currency fee should not be applied when fee sender is fee receiver (fee on A)', async () => {
        const A = accounts[0]; // sender is exchange account, exchange fee receiver
        const B = accounts[global.accountNdx + 1];
        const allFees = { fee_fixed: 0, fee_percBips: 100, fee_min: 0, fee_max: 0 };

        // mint
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        A,                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      B, CONST.nullFees, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      B, CONST.nullFees, [], [], { from: accounts[0] });

        // set global fee & ledger fee
        await stm.setFee_CcyType(CONST.ccyType.ETH,   A,              allFees);
        await stm.setFee_CcyType(CONST.ccyType.ETH,   CONST.nullAddr, allFees);
        await stm.setFee_TokType(CONST.tokenType.VCS, A,              CONST.nullFees);
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, CONST.nullFees);

        // transfer
        const transferAmountEth = CONST.tenthEth_wei;
        const expectedFeeEth = 0; // no fees expected: fee-sender == fee-receiver
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: 0,                              tokenTypeId_A: 0,
                   qty_B: new BN(1500),                   tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: transferAmountEth,                ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });

        // contract owner has paid no fees
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).minus(Big(transferAmountEth)).plus(Big(expectedFeeEth))), 'unexpected fee receiver currency balance after transfer');
        
        // receiver has received expected quantity
        const receiver_balBefore = data.ledgerB_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const receiver_balAfter  =  data.ledgerB_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(receiver_balAfter).eq(Big(receiver_balBefore).plus(Big(transferAmountEth))), 'unexpected receiver currency after transfer');
    });

    it('trading fees (general) - global/ledger currency fee should not be applied when fee sender is fee receiver (fee on B)', async () => {
        const A = accounts[global.accountNdx + 1];
        const B = accounts[0]; // sender is exchange account, exchange fee receiver
        const allFees = { fee_fixed: 0, fee_percBips: 100, fee_min: 0, fee_max: 0 };

        // mint
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      A, CONST.nullFees, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      A, CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        B,                         { from: accounts[0] });

        // set global fee & ledger fee
        await stm.setFee_CcyType(CONST.ccyType.ETH,   B,              allFees);
        await stm.setFee_CcyType(CONST.ccyType.ETH,   CONST.nullAddr, allFees);
        await stm.setFee_TokType(CONST.tokenType.VCS, B,              CONST.nullFees);
        await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, CONST.nullFees);

        // transfer
        const transferAmountEth = CONST.tenthEth_wei;
        const expectedFeeEth = 0; // no fees expected: fee-sender == fee-receiver
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: new BN(1500),                   tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: transferAmountEth,                ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // contract owner has paid no fees
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).minus(Big(transferAmountEth)).plus(Big(expectedFeeEth))), 'unexpected fee receiver currency balance after transfer');
        
        // receiver has received expected quantity
        const receiver_balBefore = data.ledgerA_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const receiver_balAfter  =  data.ledgerA_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(receiver_balAfter).eq(Big(receiver_balBefore).plus(Big(transferAmountEth))), 'unexpected receiver currency after transfer');
    });
});