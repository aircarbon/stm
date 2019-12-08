const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');
const helper = require('../test/transferHelper.js');
const BN = require('bn.js');

contract("StMaster", accounts => {
    var stm;

    beforeEach(async () => {
        stm = await st.deployed();
        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${stm.address} (owner: ${accounts[0]}) - getSecTokenBatchCount: ${(await stm.getSecTokenBatchCount.call()).toString()}`);
    });

    // EEU FEES
    it('trading fees (percentage) - apply VCS token fee 100 BP on a trade (fee on A)', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 1],                         { from: accounts[0] });

        // set fee structure VCS: 1%
        const feeBips = 100; // 100 bp = 1%
        //const setFeeTx = await stm.setFee_SecTokenType_PercBips(CONST.tokenType.VCS, feeBips);
        const setFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: 0, fee_percBips: feeBips, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_PercBips == feeBips && ev.ledgerOwner == CONST.nullAddr);
        
        //assert(await stm.globalFee_tokType_Bps(CONST.tokenType.VCS) == feeBips, 'unexpected VCS percentage fee after setting VCS fee structure');
        //assert(await stm.globalFee_tokType_Bps(CONST.tokenType.UNFCCC) == 0, 'unexpected UNFCCC percentage fee after setting VCS fee structure');

        // transfer, with fee structure applied
        const transferAmountKg = new BN(100); // 100 kg
        const expectedFeeKg = Math.floor(Number(transferAmountKg.toString()) * (feeBips/10000));
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: transferAmountKg,               tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // test contract owner has received expected carbon VCS fee
        const contractOwner_VcsKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwner_VcsKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`accountNdx=${global.accountNdx} contractOwner_VcsKgBefore`, contractOwner_VcsKgBefore);
        //console.log(`accountNdx=${global.accountNdx} contractOwner_VcsKgAfter`, contractOwner_VcsKgAfter);
        assert(contractOwner_VcsKgAfter == Number(contractOwner_VcsKgBefore) + Number(expectedFeeKg), 'unexpected contract owner (fee receiver) VCS EEU tonnage after transfer');
        
        // fees are *additional* to the supplied transfer KGs...
        const ledgerA_VcsKgBefore = data.ledgerA_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const ledgerA_VcsKgAfter  =  data.ledgerA_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`accountNdx=${global.accountNdx} ledgerA_VcsKgBefore`, ledgerA_VcsKgBefore);
        //console.log(`accountNdx=${global.accountNdx} ledgerA_VcsKgAfter`, ledgerA_VcsKgAfter);
        assert(ledgerA_VcsKgAfter == Number(ledgerA_VcsKgBefore) - Number(expectedFeeKg) - Number(transferAmountKg), 'unexpected ledger A (fee payer) VCS EEU tonnage after transfer');
    });

    it('trading fees (percentage) - apply UNFCCC token fee 1 BP (min) on a trade 1000 tons (min lot size) (fee on B)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.mtCarbon, 1,       accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure UNFCCC: 0.01% (1 bip - minimum % fee)
        const feeBips = 1;
        //const setFeeTx = await stm.setFee_SecTokenType_PercBips(CONST.tokenType.UNFCCC, feeBips);
        const setFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: 0, fee_percBips: feeBips, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_token_PercBips == feeBips && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_tokType_Bps(CONST.tokenType.UNFCCC) == feeBips, 'unexpected UNFCCC percentage fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const transferAmountKg = new BN(CONST.ktCarbon); // 1000 tons: minimum lot size
        const expectedFeeKg = Math.floor(Number(transferAmountKg.toString()) * (feeBips/10000));
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                              tokenTypeId_A: 0,
                   qty_B: transferAmountKg,               tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerUnfcccKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerUnfcccKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerUnfcccKgAfter == Number(contractOwnerUnfcccKgBefore) + Number(expectedFeeKg), 'unexpected contract owner (fee receiver) UNFCCC EEU tonnage after transfer');

        // test contract owner has unchanged VCS balance (i.e. no VCS fees received)
        const contractOwnerVcsKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore), 'unexpected contract owner (fee receiver) VCS EEU tonnage after transfer');
    })

    it('trading fees (percentage) - apply large (>1 batch EEU size) token fee 5000 BP on a trade on a newly added EEU type', async () => {
        await stm.addSecTokenType('TEST_EEU_TYPE');
        const types = (await stm.getSecTokenTypes()).tokenTypes;
        const newTypeId = types.filter(p => p.name == 'TEST_EEU_TYPE')[0].id;

        await stm.mintSecTokenBatch(newTypeId, 1000, 1,                            accounts[global.accountNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(newTypeId, 1000, 1,                            accounts[global.accountNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(newTypeId, 1000, 1,                            accounts[global.accountNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,             accounts[global.accountNdx + 1],                         { from: accounts[0] });

        // set fee structure new EEU type: 50% = 5000 BP(1.5 EEUs, 2 batches)
        const feeBips = 5000;
        const setFeeTx = await stm.setFee_TokType(newTypeId, CONST.nullAddr, { fee_fixed: 0, fee_percBips: feeBips, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == newTypeId && ev.fee_token_PercBips == feeBips && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_tokType_Bps(newTypeId) == feeBips, 'unexpected new eeu type percentage fee after setting fee structure');

        // transfer, with fee structure applied
        const transferAmountKg = new BN(1500);
        const expectedFeeKg = Math.floor(Number(transferAmountKg.toString()) * (feeBips/10000));
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: transferAmountKg,               tokenTypeId_A: newTypeId,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // test contract owner has received expected new EEU type token fee
        const owner_balBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == newTypeId).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == newTypeId).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeKg), 'unexpected contract owner (fee receiver) new EEU type tonnage after transfer');
    });

    // CCY FEES
    it('trading fees (percentage) - apply ETH ccy fee 100 BP on a trade (fee on A)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure ETH: 1%
        const ethFeePercBips = 100; // 100 bp = 1%
        assert(await stm.globalFee_ccyType_Bps(CONST.ccyType.ETH) == 0, 'unexpected ETH percentage fee before setting ETH fee structure');
        //const setFeeTx = await stm.setFee_CcyType_PercBips(CONST.ccyType.ETH, ethFeePercBips);
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr, { fee_fixed: 0, fee_percBips: ethFeePercBips, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeePercBips && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Bps(CONST.ccyType.ETH) == ethFeePercBips, 'unexpected ETH percentage fee after setting ETH fee structure');
        assert(await stm.globalFee_ccyType_Bps(CONST.ccyType.USD) == 0, 'unexpected USD percentage fee after setting ETH fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(100); // Wei
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ethFeePercBips/10000));
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                          ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                   tokenTypeId_A: 0,
                   qty_B: 750,                                                 tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: transferAmountCcy,                                     ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                     ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log('owner_balBefore', owner_balBefore.toString());
        //console.log('owner_balAfter', owner_balAfter.toString());
        //console.log('expectedFeeCcy', expectedFeeCcy.toString());
        assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) ETH balance after transfer');
    });

    it('trading fees (percentage) - apply USD ccy fee 1 BP on a trade (fee on B)', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 1],                         { from: accounts[0] });

        // set fee structure USD: 0.01% 
        const usdFeePercBips = 1; // 1 bp = 0.01%
        //const setFeeTx = await stm.setFee_CcyType_PercBips(CONST.ccyType.USD, usdFeePercBips);
        const setFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { fee_fixed: 0, fee_percBips: usdFeePercBips, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_PercBips == usdFeePercBips && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Bps(CONST.ccyType.USD) == usdFeePercBips, 'unexpected USD percentage fee after setting USD fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(10000); // 100$ = 10,000 cents
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (usdFeePercBips/10000)); // 0.01% of 100$ = 1 cent
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 750,                                                           tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                                                             tokenTypeId_B: 0,
            ccy_amount_A: 0,                                                               ccyTypeId_A: 0,
            ccy_amount_B: transferAmountCcy,                                               ccyTypeId_B: CONST.ccyType.USD,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) USD balance after transfer');
    });

    it('trading fees (percentage) - apply ccy fee 50 BP on a trade on a newly added ccy', async () => {
        await stm.addCcyType('TEST_CCY_TYPE', 'TEST_UNIT');
        const types = (await stm.getCcyTypes()).ccyTypes;
        const newCcyTypeId = types.filter(p => p.name == 'TEST_CCY_TYPE')[0].id;

        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], CONST.nullFees, [], [], { from: accounts[0] });
        await stm.fund(newCcyTypeId,                        1000,                    accounts[global.accountNdx + 1],                         { from: accounts[0] });

        // set fee structure on new ccy: 0.5% 
        const feeBips = 50; // 50 bp = 0.5%
        const setFeeTx = await stm.setFee_CcyType(newCcyTypeId, CONST.nullAddr, { fee_fixed: 0, fee_percBips: feeBips, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == newCcyTypeId && ev.fee_ccy_PercBips == feeBips && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Bps(newCcyTypeId) == feeBips, 'unexpected new ccy percentage fee after setting fee structure');
        
        // transfer, with fee structure applied
        const transferAmountCcy = new BN(500); // 500 new ccy units
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (feeBips/10000)); // 0.5% of 500 = 2.5 ccy units
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                     ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 750,                                            tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                                ccyTypeId_A: 0,
            ccy_amount_B: transferAmountCcy,                                ccyTypeId_B: newCcyTypeId,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log('owner_balBefore', owner_balBefore.toString());
        //console.log('owner_balAfter', owner_balAfter.toString());
        //console.log('expectedFeeCcy', expectedFeeCcy.toString());
        assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) new ccy balance after transfer');
    });

    // EEU + CCY FEES
    it('trading fees (percentage) - apply ETH ccy & VCS EEU fee on a 0.5 EEU trade (fees on both sides)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure ETH: 100 bp (1%)
        const ccyFeeBips = 100;
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.ETH, CONST.nullAddr, { fee_fixed: 0, fee_percBips: ccyFeeBips, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ccyFeeBips && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Bps(CONST.ccyType.ETH) == ccyFeeBips, 'unexpected ETH basis points fee after setting ETH fee structure');

        // set fee structure VCS: 100 bp (1%)
        const carbonFeeBps = 100;
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.VCS, CONST.nullAddr, { fee_fixed: 0, fee_percBips: carbonFeeBps, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_PercBips == carbonFeeBps);
        assert(await stm.globalFee_tokType_Bps(CONST.tokenType.VCS) == carbonFeeBps, 'unexpected VCS basis points fee after setting VCS fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.tenthEth_wei);
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ccyFeeBips/10000));

        const transferAmountCarbon = new BN(500);
        const expectedFeeCarbon = Math.floor(Number(transferAmountCarbon.toString()) * (carbonFeeBps/10000));

        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                            ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                     tokenTypeId_A: 0,
                   qty_B: transferAmountCarbon,                                  tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: transferAmountCcy,                                       ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                       ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCcy=${expectedFeeCcy}, ccyFeeBips=${ccyFeeBips}, transferAmountCcy=${transferAmountCcy}`);
        assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) ETH balance after transfer');
        
        // test contract owner has received expected carbon VCS fee
        const contractOwnerVcsKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCarbon=${expectedFeeCarbon}, carbonFeeBps=${carbonFeeBps}, transferAmountCarbon=${transferAmountCarbon}`);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore) + Number(expectedFeeCarbon), 'unexpected contract owner (fee receiver) VCS EEU tonnage after transfer');
    });

    it('trading fees (percentage) - should have reasonable gas cost for two-sided USD ccy & UNFCCC EEU transfer (fees on both sides)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure USD: 100 bp (1%)
        const ccyFeeBips = 100;
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { fee_fixed: 0, fee_percBips: ccyFeeBips, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_PercBips == ccyFeeBips && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Bps(CONST.ccyType.USD) == ccyFeeBips, 'unexpected USD basis points fee after setting USD fee structure');

        // set fee structure UNFCCC: 100 bp (1%)
        const carbonFeeBps = 100;
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: 0, fee_percBips: carbonFeeBps, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_token_PercBips == carbonFeeBps);
        assert(await stm.globalFee_tokType_Bps(CONST.tokenType.UNFCCC) == carbonFeeBps, 'unexpected UNFCCC basis points fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.millionUsd_cents / 2);
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ccyFeeBips/10000));

        const transferAmountCarbon = new BN(CONST.tonCarbon / 2);
        const expectedFeeCarbon = Math.floor(Number(transferAmountCarbon.toString()) * (carbonFeeBps/10000));

        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                            ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                     tokenTypeId_A: 0,
                   qty_B: transferAmountCarbon,                                  tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: transferAmountCcy,                                       ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                       ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected USD fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCcy=${expectedFeeCcy}, ccyFeeBips=${ccyFeeBips}, transferAmountCcy=${transferAmountCcy}`);
        assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) USD balance after transfer');
        
        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerCarbonKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerCarbonKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCarbon=${expectedFeeCarbon}, carbonFeeBps=${carbonFeeBps}, transferAmountCarbon=${transferAmountCarbon}`);
        assert(contractOwnerCarbonKgAfter == Number(contractOwnerCarbonKgBefore) + Number(expectedFeeCarbon), 'unexpected contract owner (fee receiver) UNFCCC EEU tonnage after transfer');

        console.log(`\t>>> gasUsed - 0.5 vEEU trade eeu/ccy (A <-> B) w/ fees on both: ${data.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees (percentage) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on ccy)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure USD: 100 bp (1%)
        const ccyFeeBips = 100;
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { fee_fixed: 0, fee_percBips: ccyFeeBips, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_PercBips == ccyFeeBips && ev.ledgerOwner == CONST.nullAddr);
        assert(await stm.globalFee_ccyType_Bps(CONST.ccyType.USD) == ccyFeeBips, 'unexpected USD basis points fee after setting USD fee structure');

        // set fee structure UNFCCC: 0 bp (0%)
        const carbonFeeBps = 0;
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: 0, fee_percBips: carbonFeeBps, fee_min: 0, fee_max: 0 } );
        assert(await stm.globalFee_tokType_Bps(CONST.tokenType.UNFCCC) == carbonFeeBps, 'unexpected UNFCCC basis points fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.millionUsd_cents / 2);
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ccyFeeBips/10000));

        const transferAmountCarbon = new BN(CONST.tonCarbon / 2);
        const expectedFeeCarbon = Math.floor(Number(transferAmountCarbon.toString()) * (carbonFeeBps/10000));

        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                            ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                     tokenTypeId_A: 0,
                   qty_B: transferAmountCarbon,                                  tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: transferAmountCcy,                                       ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                       ccyTypeId_B: 0,
               applyFees: true,
        });
        //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

        // test contract owner has received expected USD fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCcy=${expectedFeeCcy}, ccyFeeBips=${ccyFeeBips}, transferAmountCcy=${transferAmountCcy}`);
        assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) USD balance after transfer');
        
        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerCarbonKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerCarbonKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCarbon=${expectedFeeCarbon}, carbonFeeBps=${carbonFeeBps}, transferAmountCarbon=${transferAmountCarbon}`);
        assert(contractOwnerCarbonKgAfter == Number(contractOwnerCarbonKgBefore) + Number(expectedFeeCarbon), 'unexpected contract owner (fee receiver) UNFCCC EEU tonnage after transfer');

        console.log(`\t>>> gasUsed - 0.5 vEEU trade eeu/ccy (A <-> B) w/ fees on ccy: ${data.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees (percentage) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on eeu)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set fee structure USD: 0%
        const ccyFeeBips = 0;
        const setCcyFeeTx = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { fee_fixed: 0, fee_percBips: ccyFeeBips, fee_min: 0, fee_max: 0 } );
        //truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyBps', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_PercBips == ccyFeeBips);
        assert(await stm.globalFee_ccyType_Bps(CONST.ccyType.USD) == ccyFeeBips, 'unexpected USD basis points fee after setting USD fee structure');

        // set fee structure UNFCCC: 10 bp (0.1%)
        const carbonFeeBps = 10;
        const setCarbonFeeTx = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: 0, fee_percBips: carbonFeeBps, fee_min: 0, fee_max: 0 } );
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeTokBps', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_token_PercBips == carbonFeeBps);
        assert(await stm.globalFee_tokType_Bps(CONST.tokenType.UNFCCC) == carbonFeeBps, 'unexpected UNFCCC basis points fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const transferAmountCcy = new BN(CONST.millionUsd_cents / 2);
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ccyFeeBips/10000));

        const transferAmountCarbon = new BN(CONST.tonCarbon / 2);
        const expectedFeeCarbon = Math.floor(Number(transferAmountCarbon.toString()) * (carbonFeeBps/10000));

        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                            ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                     tokenTypeId_A: 0,
                   qty_B: transferAmountCarbon,                                  tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: transferAmountCcy,                                       ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                       ccyTypeId_B: 0,
               applyFees: true,
        });
        //truffleAssert.prettyPrintEmittedEvents(data.transferTx);

        // test contract owner has received expected USD fee
        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCcy=${expectedFeeCcy}, ccyFeeBips=${ccyFeeBips}, transferAmountCcy=${transferAmountCcy}`);
        assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) USD balance after transfer');
        
        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerCarbonKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerCarbonKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCarbon=${expectedFeeCarbon}, carbonFeeBps=${carbonFeeBps}, transferAmountCarbon=${transferAmountCarbon}`);
        assert(contractOwnerCarbonKgAfter == Number(contractOwnerCarbonKgBefore) + Number(expectedFeeCarbon), 'unexpected contract owner (fee receiver) UNFCCC EEU tonnage after transfer');

        console.log(`\t>>> gasUsed - 0.5 vEEU trade eeu/ccy (A <-> B) w/ fees on eeu: ${data.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * data.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees (percentage) - should round fees to zero for minimal transfers (ccy & carbon)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        // set % fees to 1bp = 0.01%
        const ccyFeeBips = 1, carbonFeeBps = 1;
        await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr,      { fee_fixed: 0, fee_percBips: ccyFeeBips,   fee_min: 0, fee_max: 0 } );
        await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: 0, fee_percBips: carbonFeeBps, fee_min: 0, fee_max: 0 } );

        const transferAmountCcy = new BN(100); // 100 cents
        const expectedFeeCcy = Math.floor(Number(transferAmountCcy.toString()) * (ccyFeeBips/10000)); // fee on 100 cents @ 0.01% ~= 0 cents

        const transferAmountCarbon = new BN(100); // 1kg
        const expectedFeeCarbon = Math.floor(Number(transferAmountCarbon.toString()) * (carbonFeeBps/10000)); // fee on 100kg @ 0.01% ~= 0 kg

        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                  ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                           tokenTypeId_A: 0,
                   qty_B: transferAmountCarbon,                        tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: transferAmountCcy,                             ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                             ccyTypeId_B: 0,
               applyFees: true,
        });

        const owner_balBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const owner_balAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCcy=${expectedFeeCcy}, ccyFeeBips=${ccyFeeBips}, transferAmountCcy=${transferAmountCcy}`);
        assert(owner_balAfter == Number(owner_balBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) USD balance after transfer');
        
        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerCarbonKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerCarbonKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log(`expectedFeeCarbon=${expectedFeeCarbon}, carbonFeeBps=${carbonFeeBps}, transferAmountCarbon=${transferAmountCarbon}`);
        assert(contractOwnerCarbonKgAfter == Number(contractOwnerCarbonKgBefore) + Number(expectedFeeCarbon), 'unexpected contract owner (fee receiver) UNFCCC EEU tonnage after transfer');
    });
    
    it('trading fees (percentage) - should not allow non-owner to set global fee structure (ccy)', async () => {
        try {
            const tx1 = await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr, { fee_fixed: 0, fee_percBips: 1, fee_min: 0, fee_max: 0 }, { from: accounts[1] });
        } catch (ex) { 
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it('trading fees (percentage) - should not allow non-owner to set global fee structure (carbon)', async () => {
        try {
            const tx1 = await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: 0, fee_percBips: 1, fee_min: 0, fee_max: 0 }, { from: accounts[1] });
        } catch (ex) { 
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it('trading fees (percentage) - should not allow a transfer with insufficient ccy to cover fees', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr,      { fee_fixed: 0, fee_percBips: 1, fee_min: 0, fee_max: 0 } );
        await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );

        try {
            const data = await helper.transferLedger({ stm, accounts, 
                    ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                       qty_A: 0,                                                             tokenTypeId_A: 0,
                       qty_B: new BN(CONST.tonCarbon),                                       tokenTypeId_B: CONST.tokenType.UNFCCC,
                ccy_amount_A: new BN(CONST.millionUsd_cents),                                  ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
                   applyFees: true,
            });
            //truffleAssert.prettyPrintEmittedEvents(data.transferTx);
        }
        catch (ex) { 
            assert(ex.reason == 'Insufficient currency A', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it('trading fees (percentage) - should not allow a transfer with insufficient carbon to cover fees', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],                         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 1,       accounts[global.accountNdx + 1], CONST.nullFees, [], [], { from: accounts[0] });

        await stm.setFee_CcyType(CONST.ccyType.USD, CONST.nullAddr,      { fee_fixed: 0, fee_percBips: 0, fee_min: 0, fee_max: 0 } );
        await stm.setFee_TokType(CONST.tokenType.UNFCCC, CONST.nullAddr, { fee_fixed: 0, fee_percBips: 1, fee_min: 0, fee_max: 0 } );

        try {
            await helper.transferLedger({ stm, accounts, 
                    ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                       qty_A: 0,                                                             tokenTypeId_A: 0,
                       qty_B: new BN(CONST.ktCarbon),                                        tokenTypeId_B: CONST.tokenType.UNFCCC,
                ccy_amount_A: new BN(CONST.millionUsd_cents),                                  ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
                   applyFees: true,
            });
        }
        catch (ex) { 
            assert(ex.reason == 'Insufficient tokens B', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });
});