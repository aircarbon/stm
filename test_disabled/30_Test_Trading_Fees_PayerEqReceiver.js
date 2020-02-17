const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');
const transferHelper = require('../test/transferHelper.js');
const BN = require('bn.js');
const Big = require('big.js');
const Web3 = require('web3');
const web3 = new Web3();

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() == CONST.contractType.CASHFLOW) this.skip();

        if (!global.TaddrNdx) global.TaddrNdx = 0;
        await stm.whitelist(accounts[0]);
        
        for (let i=1 ; i < 60 ; i++) { // whitelist enough accounts for the tests
            await stm.whitelist(accounts[global.TaddrNdx + i]);
        }
        await stm.sealContract();
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`TaddrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // STs: NO FEES IF FEE RECEIVER = FEE SENDER (contract owner or batch originator)

    it(`fees (fee payer=receiver) - global/ledger/originator token fees should not be applied when fee sender is fee receiver (fee on A, contract owner & batch originator)`, async () => {
        const A = accounts[0]; // sender is contract owner, exchange fee receiver, and batch originator fee receiver
        const B = accounts[global.TaddrNdx + 1];
        const allFees = { ccy_mirrorFee: false, ccy_perThousand: 0, fee_fixed: 0, fee_percBips: 100, fee_min: 0, fee_max: 0 };

        // mint
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE,    CONST.kt1Carbon, 1,      A, allFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE,    CONST.kt1Carbon, 1,      A, allFees, 0, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                      CONST.oneEth_wei,        B,                     { from: accounts[0] });

        // set global fee & ledger fee
        await stm.setFee_TokType(CONST.tokenType.NATURE, A,              allFees);
        await stm.setFee_TokType(CONST.tokenType.NATURE, CONST.nullAddr, allFees);
        await stm.setFee_CcyType(CONST.ccyType.ETH,      A,              CONST.nullFees);
        await stm.setFee_CcyType(CONST.ccyType.ETH,      CONST.nullAddr, CONST.nullFees);

        // transfer
        const transferAmountTokQty = new BN(1500);
        const expectedFeeTokQty = 0; // no fees expected: fee-sender == fee-receiver
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: transferAmountTokQty,           tokenTypeId_A: CONST.tokenType.NATURE,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // contract owner (A) has paid no fees
        const owner_balBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).minus(Big(transferAmountTokQty)).plus(Big(expectedFeeTokQty))), 'unexpected fee receiver token balance after transfer');
        
        // receiver (B) has received expected quantity
        const receiver_balBefore = data.ledgerB_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const receiver_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(receiver_balAfter).eq(Big(receiver_balBefore).plus(Big(transferAmountTokQty))), 'unexpected receiver carbon after transfer');
    });

    it(`fees (fee payer=receiver) - global/ledger/originator token fees should not be applied when fee sender is fee receiver (fee on B, contract owner & batch originator)`, async () => {
        const A = accounts[global.TaddrNdx + 0];
        const B = accounts[0]; // sender is contract owner, exchange fee receiver, and batch originator fee receiver
        const allFees = { ccy_mirrorFee: false, ccy_perThousand: 0, fee_fixed: 0, fee_percBips: 100, fee_min: 0, fee_max: 0 };

        // mint
        await stm.fund(CONST.ccyType.ETH,                      CONST.oneEth_wei,        A,                     { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE,    CONST.kt1Carbon, 1,      B, allFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE,    CONST.kt1Carbon, 1,      B, allFees, 0, [], [], { from: accounts[0] });

        // set global fee & ledger fee
        await stm.setFee_TokType(CONST.tokenType.NATURE, B,              allFees );
        await stm.setFee_TokType(CONST.tokenType.NATURE, CONST.nullAddr, allFees );
        await stm.setFee_CcyType(CONST.ccyType.ETH,      B,              CONST.nullFees );
        await stm.setFee_CcyType(CONST.ccyType.ETH,      CONST.nullAddr, CONST.nullFees );

        // transfer
        const transferAmountTokQty = new BN(1500);
        const expectedFeeTokQty = 0; // no fees expected: fee-sender == fee-receiver
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: 0,                              tokenTypeId_A: 0,
                   qty_B: transferAmountTokQty,           tokenTypeId_B: CONST.tokenType.NATURE,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });

        // contract owner (B) has paid no fees
        const owner_balBefore = data.owner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).minus(Big(transferAmountTokQty)).plus(Big(expectedFeeTokQty))), 'unexpected fee receiver token balance after transfer');
        
        // receiver (A) has received expected quantity
        const receiver_balBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const receiver_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(receiver_balAfter).eq(Big(receiver_balBefore).plus(Big(transferAmountTokQty))), 'unexpected receiver carbon after transfer');
    });

    it(`fees (fee payer=receiver) - originator token fee should not be applied (global should be) when fee sender is fee receiver (fee on A, batch originator)`, async () => {
        const A = accounts[global.TaddrNdx + 0]; // sender is batch originator 
        const B = accounts[global.TaddrNdx + 1];
        const origFees = { ccy_mirrorFee: false, ccy_perThousand: 0, fee_fixed: 0, fee_percBips: 100, fee_min: 0, fee_max: 2 };

        // mint
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE,    CONST.kt1Carbon, 1,      A, origFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE,    CONST.kt1Carbon, 1,      A, origFees, 0, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                      CONST.oneEth_wei,        B,                      { from: accounts[0] });

        // set global fee - originator fee x2
        const globalFee = { ccy_mirrorFee: false, ccy_perThousand: 0,
               fee_fixed: origFees.fee_fixed * 2,
            fee_percBips: origFees.fee_percBips * 2,
                 fee_min: origFees.fee_min * 2,
                 fee_max: origFees.fee_max * 2,
        }
        await stm.setFee_TokType(CONST.tokenType.NATURE, CONST.nullAddr, globalFee);
        await stm.setFee_TokType(CONST.tokenType.NATURE, A,              CONST.nullFees);

        // transfer
        const transferAmountTokQty = new BN(1500);
        const expectedFeeTokQty = // fees expected: exchange global fee only
            Math.min(Math.floor(Number(transferAmountTokQty.toString()) * (globalFee.fee_percBips/10000)) + globalFee.fee_fixed, globalFee.fee_max);

        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: transferAmountTokQty,           tokenTypeId_A: CONST.tokenType.NATURE,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // token sender (A) has has not paid originator fees to self, and has only paid exchange fee
        const sender_balBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const sender_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(sender_balAfter).eq(Big(sender_balBefore).minus(Big(transferAmountTokQty)).minus(Big(expectedFeeTokQty))), 'unexpected token fee payer balance after transfer');
        
        // receiver (B) has received expected quantity
        const receiver_balBefore = data.ledgerB_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const receiver_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(receiver_balAfter).eq(Big(receiver_balBefore).plus(Big(transferAmountTokQty))), 'unexpected receiver token balance after transfer');
    });

    it(`fees (fee payer=receiver) - originator token fee should not be applied (ledger should be) when fee sender is fee receiver (fee on B, batch originator)`, async () => {
        const A = accounts[global.TaddrNdx + 0]; 
        const B = accounts[global.TaddrNdx + 1]; // sender is batch originator 
        const origFees = { ccy_mirrorFee: false, ccy_perThousand: 0, fee_fixed: 0, fee_percBips: 100, fee_min: 0, fee_max: 2 };

        // mint
        await stm.fund(CONST.ccyType.ETH,                      CONST.oneEth_wei,        A,                      { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE,    CONST.kt1Carbon, 1,      B, origFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE,    CONST.kt1Carbon, 1,      B, origFees, 0, [], [], { from: accounts[0] });

        // set ledger fee - originator fee x2
        const ledgerFee = { ccy_mirrorFee: false, ccy_perThousand: 0,
               fee_fixed: origFees.fee_fixed * 2,
            fee_percBips: origFees.fee_percBips * 2,
                 fee_min: origFees.fee_min * 2,
                 fee_max: origFees.fee_max * 2,
        }
        await stm.setFee_TokType(CONST.tokenType.NATURE, B,              ledgerFee);
        await stm.setFee_TokType(CONST.tokenType.NATURE, CONST.nullAddr, CONST.nullFees);

        // transfer
        const transferAmountTokQty = new BN(1500);
        const expectedFeeTokQty = // fees expected: exchange ledger fee only
            Math.min(Math.floor(Number(transferAmountTokQty.toString()) * (ledgerFee.fee_percBips/10000)) + ledgerFee.fee_fixed, ledgerFee.fee_max);

        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: 0,                              tokenTypeId_A: 0,
                   qty_B: transferAmountTokQty,           tokenTypeId_B: CONST.tokenType.NATURE,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });

        // token sender (B) has has not paid originator fees to self, and has only paid exchange fee
        const sender_balBefore = data.ledgerB_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const sender_balAfter  =  data.ledgerB_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(sender_balAfter).eq(Big(sender_balBefore).minus(Big(transferAmountTokQty)).minus(Big(expectedFeeTokQty))), 'unexpected token fee payer balance after transfer');
        
        // receiver (A) has received expected quantity
        const receiver_balBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const receiver_balAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.NATURE).map(p => p.currentQty).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(receiver_balAfter).eq(Big(receiver_balBefore).plus(Big(transferAmountTokQty))), 'unexpected receiver token balance after transfer');
    });

    // CCY FEES: NO FEES IF FEE RECEIVER = FEE SENDER (only ever the case for contract owner)

    it(`fees (fee payer=receiver) - global/ledger currency fee should not be applied when fee sender is fee receiver (fee on A, contract owner)`, async () => {
        const A = accounts[0]; // sender is contract owner, exchange fee receiver
        const B = accounts[global.TaddrNdx + 1];
        const allFees = { ccy_mirrorFee: false, ccy_perThousand: 0, fee_fixed: 0, fee_percBips: 100, fee_min: 0, fee_max: 0 };

        // mint
        await stm.fund(CONST.ccyType.ETH,                      CONST.oneEth_wei,        A,                            { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE,    CONST.kt1Carbon, 1,      B, CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE,    CONST.kt1Carbon, 1,      B, CONST.nullFees, 0, [], [], { from: accounts[0] });

        // set global fee & ledger fee
        await stm.setFee_CcyType(CONST.ccyType.ETH,      A,              allFees);
        await stm.setFee_CcyType(CONST.ccyType.ETH,      CONST.nullAddr, allFees);
        await stm.setFee_TokType(CONST.tokenType.NATURE, A,              CONST.nullFees);
        await stm.setFee_TokType(CONST.tokenType.NATURE, CONST.nullAddr, CONST.nullFees);

        // transfer
        const transferAmountEth = CONST.tenthEth_wei;
        const expectedFeeEth = 0; // no fees expected: fee-sender == fee-receiver
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: 0,                              tokenTypeId_A: 0,
                   qty_B: new BN(1500),                   tokenTypeId_B: CONST.tokenType.NATURE,
            ccy_amount_A: transferAmountEth,                ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });

        // contract owner has paid no fees
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).minus(Big(transferAmountEth)).plus(Big(expectedFeeEth))), 'unexpected fee receiver currency balance after transfer');
        
        // receiver has received expected quantity
        const receiver_balBefore = data.ledgerB_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const receiver_balAfter  =  data.ledgerB_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(receiver_balAfter).eq(Big(receiver_balBefore).plus(Big(transferAmountEth))), 'unexpected receiver currency after transfer');
    });

    it(`fees (fee payer=receiver) - global/ledger currency fee should not be applied when fee sender is fee receiver (fee on B, contract owner)`, async () => {
        const A = accounts[global.TaddrNdx + 1];
        const B = accounts[0]; // sender is contract owner (exchange fee receiver)
        const allFees = { ccy_mirrorFee: false, ccy_perThousand: 0, fee_fixed: 0, fee_percBips: 100, fee_min: 0, fee_max: 0 };

        // mint
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE,    CONST.kt1Carbon, 1,      A, CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.NATURE,    CONST.kt1Carbon, 1,      A, CONST.nullFees, 0, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                      CONST.oneEth_wei,        B,                            { from: accounts[0] });

        // set global fee & ledger fee
        await stm.setFee_CcyType(CONST.ccyType.ETH,      B,              allFees);
        await stm.setFee_CcyType(CONST.ccyType.ETH,      CONST.nullAddr, allFees);
        await stm.setFee_TokType(CONST.tokenType.NATURE, B,              CONST.nullFees);
        await stm.setFee_TokType(CONST.tokenType.NATURE, CONST.nullAddr, CONST.nullFees);

        // transfer
        const transferAmountEth = CONST.tenthEth_wei;
        const expectedFeeEth = 0; // no fees expected: fee-sender == fee-receiver
        const data = await transferHelper.transferLedger({ stm, accounts, 
                ledger_A: A,                                   ledger_B: B,
                   qty_A: new BN(1500),                   tokenTypeId_A: CONST.tokenType.NATURE,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: transferAmountEth,                ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // contract owner has paid no fees
        const owner_balBefore = data.owner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const owner_balAfter  =  data.owner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(owner_balAfter).eq(Big(owner_balBefore).minus(Big(transferAmountEth)).plus(Big(expectedFeeEth))), 'unexpected fee receiver currency balance after transfer');
        
        // receiver has received expected quantity
        const receiver_balBefore = data.ledgerA_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        const receiver_balAfter  =  data.ledgerA_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Big(a).plus(Big(b)), Big(0));
        assert(Big(receiver_balAfter).eq(Big(receiver_balBefore).plus(Big(transferAmountEth))), 'unexpected receiver currency after transfer');
    });
});