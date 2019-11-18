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
        //console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${stm.address} (owner: ${accounts[0]}) - getSecTokenBatchCount: ${(await stm.getSecTokenBatchCount.call()).toString()}`);
    });

    // EEU FEES
    it('trading fees (percentage) - apply VCS carbon fee 100 BP on a trade (fee on A)', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 1],         { from: accounts[0] });

        // set fee structure VCS: 1%
        const feeBips = 100; // 100 bp = 1%
        const setFeeTx = await stm.setFee_SecTokenType_Perc(CONST.tokenType.VCS, feeBips);
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeSecTokenTypePerc', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_token_PercBips == feeBips);
        assert(await stm.fee_tokenType_PercBips(CONST.tokenType.VCS) == feeBips, 'unexpected VCS percentage fee after setting VCS fee structure');
        assert(await stm.fee_tokenType_PercBips(CONST.tokenType.UNFCCC) == 0, 'unexpected UNFCCC percentage fee after setting VCS fee structure');

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

    it('trading fees (percentage) - apply UNFCCC carbon fee 1 BP (min) on a trade 1000 tons (min lot size) (fee on B)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.mtCarbon, 1,       accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure UNFCCC: 0.01% (1 bip - minimum % fee)
        const feeBips = 1;
        const setFeeTx = await stm.setFee_SecTokenType_Perc(CONST.tokenType.UNFCCC, feeBips);
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeSecTokenTypePerc', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_token_PercBips == feeBips);
        assert(await stm.fee_tokenType_PercBips(CONST.tokenType.UNFCCC) == feeBips, 'unexpected UNFCCC percentage fee after setting UNFCCC fee structure');

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

    it('trading fees (percentage) - apply large (>1 batch EEU size) carbon fee 5000 BP on a trade on a newly added EEU type', async () => {
        await stm.addSecTokenType('TEST_EEU_TYPE');
        const types = (await stm.getSecTokenTypes()).tokenTypes;
        const newTypeId = types.filter(p => p.name == 'TEST_EEU_TYPE')[0].id;

        await stm.mintSecTokenBatch(newTypeId, 1000, 1,                            accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(newTypeId, 1000, 1,                            accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await stm.mintSecTokenBatch(newTypeId, 1000, 1,                            accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,        accounts[global.accountNdx + 1],         { from: accounts[0] });

        // set fee structure new EEU type: 50% = 5000 BP(1.5 EEUs, 2 batches)
        const feeBips = 5000;
        const setFeeTx = await stm.setFee_SecTokenType_Perc(newTypeId, feeBips);
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeSecTokenTypePerc', ev => ev.tokenTypeId == newTypeId && ev.fee_token_PercBips == feeBips);
        assert(await stm.fee_tokenType_PercBips(newTypeId) == feeBips, 'unexpected new eeu type percentage fee after setting fee structure');

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

        // test contract owner has received expected new EEU type carbon fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == newTypeId).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == newTypeId).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(expectedFeeKg), 'unexpected contract owner (fee receiver) new EEU type tonnage after transfer');
    });

    // CCY FEES
    it('trading fees (percentage) - apply ETH ccy fee 100 BP on a trade (fee on A)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure ETH: 1%
        const ethFeePercBips = 100; // 100 bp = 1%
        assert(await stm.fee_ccyType_PercBips(CONST.ccyType.ETH) == 0, 'unexpected ETH percentage fee before setting ETH fee structure');
        const setCarbonFeeTx = await stm.setFee_CcyType_PercBips(CONST.ccyType.ETH, ethFeePercBips);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeCcyTypePerc', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_PercBips == ethFeePercBips);
        assert(await stm.fee_ccyType_PercBips(CONST.ccyType.ETH) == ethFeePercBips, 'unexpected ETH percentage fee after setting ETH fee structure');
        assert(await stm.fee_ccyType_PercBips(CONST.ccyType.USD) == 0, 'unexpected USD percentage fee after setting ETH fee structure');

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
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log('contractOwnerFeeBalanceBefore', contractOwnerFeeBalanceBefore.toString());
        //console.log('contractOwnerFeeBalanceAfter', contractOwnerFeeBalanceAfter.toString());
        //console.log('expectedFeeCcy', expectedFeeCcy.toString());
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) ETH balance after transfer');
    });

    it('trading fees (percentage) - apply USD ccy fee 1 BP on a trade (fee on B)', async () => {
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 1],         { from: accounts[0] });

        // set fee structure USD: 0.01% 
        const usdFeePercBips = 1; // 1 bp = 0.01%
        const setFeeTx = await stm.setFee_CcyType_PercBips(CONST.ccyType.USD, usdFeePercBips);
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyTypePerc', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_PercBips == usdFeePercBips);
        assert(await stm.fee_ccyType_PercBips(CONST.ccyType.USD) == usdFeePercBips, 'unexpected USD percentage fee after setting USD fee structure');

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
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) USD balance after transfer');
    });

    it('trading fees (percentage) - apply ccy fee 50 BP on a trade on a newly added ccy', async () => {
        await stm.addCcyType('TEST_CCY_TYPE', 'TEST_UNIT');
        const types = (await stm.getCcyTypes()).ccyTypes;
        const newCcyTypeId = types.filter(p => p.name == 'TEST_CCY_TYPE')[0].id;

        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await stm.fund(newCcyTypeId,                        1000,                    accounts[global.accountNdx + 1],         { from: accounts[0] });

        // set fee structure on new ccy: 0.5% 
        const feeBips = 50; // 50 bp = 0.5%
        const setFeeTx = await stm.setFee_CcyType_PercBips(newCcyTypeId, feeBips);
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeCcyTypePerc', ev => ev.ccyTypeId == newCcyTypeId && ev.fee_ccy_PercBips == feeBips);
        assert(await stm.fee_ccyType_PercBips(newCcyTypeId) == feeBips, 'unexpected new ccy percentage fee after setting fee structure');
        
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
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        //console.log('contractOwnerFeeBalanceBefore', contractOwnerFeeBalanceBefore.toString());
        //console.log('contractOwnerFeeBalanceAfter', contractOwnerFeeBalanceAfter.toString());
        //console.log('expectedFeeCcy', expectedFeeCcy.toString());
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(expectedFeeCcy), 'unexpected contract owner (fee receiver) new ccy balance after transfer');
    });

    // TODO: NEGATIVE RE. INSUFFICIENT FUNDS ...

    // TODO: EEU + CCY FEES ...
    /*it('trading fees (percentage) - apply ETH ccy & VCS EEU fee on a max. trade (fees on both sides)', async () => {
        await stm.fund(CONST.ccyType.ETH,                   CONST.oneEth_wei,        accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure ETH: 1000 Wei fixed
        const ethFeeFixed_Wei = 1000;
        const setEthFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.ETH, ethFeeFixed_Wei);
        truffleAssert.eventEmitted(setEthFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.fee_ccy_Fixed == ethFeeFixed_Wei);
        assert(await stm.fee_ccyType_Fixed(CONST.ccyType.ETH) == ethFeeFixed_Wei, 'unexpected ETH fixed Wei fee after setting ETH fee structure');

        // set fee structure VCS: 10 KG fixed
        const vcsKgFeeFixed = 10;
        assert(await stm.fee_tokenType_Fixed(CONST.tokenType.VCS) == 0, 'unexpected VCS fixed KG fee before setting VCS fee structure');
        const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.VCS, vcsKgFeeFixed);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeSecTokenTypeFixed', ev => ev.tokenTypeId == CONST.tokenType.VCS && ev.fee_tokenQty_Fixed == vcsKgFeeFixed);
        assert(await stm.fee_tokenType_Fixed(CONST.tokenType.VCS) == vcsKgFeeFixed, 'unexpected VCS fixed KG fee after setting VCS fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                            ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                     tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(vcsKgFeeFixed)),    tokenTypeId_B: CONST.tokenType.VCS,
            ccy_amount_A: new BN(CONST.oneEth_wei).sub(new BN(ethFeeFixed_Wei)),   ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                       ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(ethFeeFixed_Wei), 'unexpected contract owner (fee receiver) ETH balance after transfer');
        
        // test contract owner has received expected carbon VCS fee
        const contractOwnerVcsKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.VCS).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore) + Number(vcsKgFeeFixed), 'unexpected contract owner (fee receiver) VCS EEU tonnage after transfer');
    });

    it('trading fees (percentage) - apply USD ccy & UNFCCC EEU fee on a max. trade (fees on both sides)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure USD: 100 cents
        const usdFeeFixed_cents = CONST.oneUsd_cents;
        const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_Fixed == usdFeeFixed_cents);
        assert(await stm.fee_ccyType_Fixed(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 42 KG fixed
        const unfcccKgFeeFixed = 42;
        const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, unfcccKgFeeFixed);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeSecTokenTypeFixed', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfcccKgFeeFixed);
        assert(await stm.fee_tokenType_Fixed(CONST.tokenType.UNFCCC) == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected USD fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(usdFeeFixed_cents), 'unexpected contract owner (fee receiver) USD balance after transfer');
        
        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerVcsKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == CONST.tokenType.UNFCCC).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore) + Number(unfcccKgFeeFixed), 'unexpected contract owner (fee receiver) UNFCCC EEU tonnage after transfer');    
    });

    it('trading fees (percentage) - apply newly added ccy & newly added EEU type fee on a max. trade (fees on both sides)', async () => {
        await stm.addCcyType('TEST_CCY_TYPE_2', 'TEST_UNIT');
        const ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        const newCcyTypeId = ccyTypes.filter(p => p.name == 'TEST_CCY_TYPE_2')[0].id;

        await stm.addSecTokenType('TEST_EEU_TYPE_2');
        const tokenTypes = (await stm.getSecTokenTypes()).tokenTypes;
        const newSecTokenTypeId = tokenTypes.filter(p => p.name == 'TEST_EEU_TYPE_2')[0].id;

        await stm.fund(newCcyTypeId,                           1000,                    accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(newSecTokenTypeId,         CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure new ccy
        const ccyFeeFixed_units = 10;
        const setCcyFeeTx = await stm.setFee_CcyType_Fixed(newCcyTypeId, ccyFeeFixed_units);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == newCcyTypeId && ev.fee_ccy_Fixed == ccyFeeFixed_units);
        assert(await stm.fee_ccyType_Fixed(newCcyTypeId) == ccyFeeFixed_units, 'unexpected new ccy fixed fee after setting ccy fee structure');

        // set fee structure new EEU type: 1 KG
        const newSecTokenTypeKgFeeFixed = 1;
        const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(newSecTokenTypeId, newSecTokenTypeKgFeeFixed);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeSecTokenTypeFixed', ev => ev.tokenTypeId == newSecTokenTypeId && ev.fee_tokenQty_Fixed == newSecTokenTypeKgFeeFixed);
        assert(await stm.fee_tokenType_Fixed(newSecTokenTypeId) == newSecTokenTypeKgFeeFixed, 'unexpected new eeu type fixed KG fee after setting eeu fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                                         ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                                  tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(newSecTokenTypeKgFeeFixed)),     tokenTypeId_B: newSecTokenTypeId,
            ccy_amount_A: new BN(1000).sub(new BN(ccyFeeFixed_units)),                          ccyTypeId_A: newCcyTypeId,
            ccy_amount_B: 0,                                                                    ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected ccy fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.ccyTypeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(ccyFeeFixed_units), 'unexpected contract owner (fee receiver) newly added ccy balance after transfer');
        
        // test contract owner has received expected carbon fee
        const contractOwnerSecTokenKgBefore = data.ledgerContractOwner_before.tokens.filter(p => p.tokenTypeId == newSecTokenTypeId).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerSecTokenKgAfter  =  data.ledgerContractOwner_after.tokens.filter(p => p.tokenTypeId == newSecTokenTypeId).map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerSecTokenKgAfter == Number(contractOwnerSecTokenKgBefore) + Number(newSecTokenTypeKgFeeFixed), 'unexpected contract owner (fee receiver) newly added EEU type tonnage after transfer');    
    });

    it('trading fees (percentage) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fees on both sides)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure USD: 100 cents
        const usdFeeFixed_cents = CONST.oneUsd_cents;
        const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_Fixed == usdFeeFixed_cents);
        assert(await stm.fee_ccyType_Fixed(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 10 KG fixed
        const unfcccKgFeeFixed = 10;
        const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, unfcccKgFeeFixed);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeSecTokenTypeFixed', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfcccKgFeeFixed);
        assert(await stm.fee_tokenType_Fixed(CONST.tokenType.UNFCCC) == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const tradeTx = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        console.log(`\t>>> gasUsed - 1.0 vEEU trade eeu/ccy (A <-> B) w/ fees on both: ${tradeTx.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees (percentage) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on ccy)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure USD: 100 cents
        const usdFeeFixed_cents = CONST.oneUsd_cents;
        const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_Fixed == usdFeeFixed_cents);
        assert(await stm.fee_ccyType_Fixed(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 0 KG fixed
        const unfcccKgFeeFixed = 0;
        const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, unfcccKgFeeFixed);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeSecTokenTypeFixed', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfcccKgFeeFixed);
        assert(await stm.fee_tokenType_Fixed(CONST.tokenType.UNFCCC) == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const tradeTx = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        console.log(`\t>>> gasUsed - 1.0 vEEU trade eeu/ccy (A <-> B) w/ fees on ccy: ${tradeTx.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees (percentage) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on eeu)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure USD: 0 cents
        const usdFeeFixed_cents = CONST.oneUsd_cents;
        const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_Fixed == usdFeeFixed_cents);
        assert(await stm.fee_ccyType_Fixed(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 10 KG fixed
        const unfcccKgFeeFixed = 10;
        const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, unfcccKgFeeFixed);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeSecTokenTypeFixed', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfcccKgFeeFixed);
        assert(await stm.fee_tokenType_Fixed(CONST.tokenType.UNFCCC) == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const tradeTx = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        console.log(`\t>>> gasUsed - 1.0 vEEU trade eeu/ccy (A <-> B) w/ fees on eeu: ${tradeTx.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees (percentage) - should have reasonable gas cost for two-sided transfer (eeu/ccy) (base gas cost: no fees)', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure USD: 0 cents
        const usdFeeFixed_cents = CONST.oneUsd_cents;
        const setUsdFeeTx = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.fee_ccy_Fixed == usdFeeFixed_cents);
        assert(await stm.fee_ccyType_Fixed(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 0 KG fixed
        const unfcccKgFeeFixed = 0;
        const setCarbonFeeTx = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, unfcccKgFeeFixed);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeSecTokenTypeFixed', ev => ev.tokenTypeId == CONST.tokenType.UNFCCC && ev.fee_tokenQty_Fixed == unfcccKgFeeFixed);
        assert(await stm.fee_tokenType_Fixed(CONST.tokenType.UNFCCC) == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const tradeTx = await helper.transferLedger({ stm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                   qty_A: 0,                                                             tokenTypeId_A: 0,
                   qty_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         tokenTypeId_B: CONST.tokenType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)),   ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
               applyFees: true,
        });

        console.log(`\t>>> gasUsed - 1.0 vEEU trade eeu/ccy (A <-> B) w/ no fees: ${tradeTx.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees (percentage) - should not allow non-owner to set global fee structure (fixed - ccy)', async () => {
        try {
            const tx1 = await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, 10, { from: accounts[1] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('trading fees (percentage) - should not allow non-owner to set global fee structure (fixed - carbon)', async () => {
        try {
            const tx1 = await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, 10, { from: accounts[1] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('trading fees (percentage) - should not allow a transfer with insufficient ccy to cover fees', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, 1);
        await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, 0);

        try {
            await helper.transferLedger({ stm, accounts, 
                    ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                       qty_A: 0,                                                             tokenTypeId_A: 0,
                       qty_B: new BN(CONST.tonCarbon),                                       tokenTypeId_B: CONST.tokenType.UNFCCC,
                ccy_amount_A: new BN(CONST.millionUsd_cents),                                  ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
                   applyFees: true,
            });
        }
        catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('trading fees (percentage) - should not allow a transfer with insufficient carbon to cover fees', async () => {
        await stm.fund(CONST.ccyType.USD,                   CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        await stm.setFee_CcyType_Fixed(CONST.ccyType.USD, 0);
        await stm.setFee_SecTokenType_Fixed(CONST.tokenType.UNFCCC, 1);

        try {
            await helper.transferLedger({ stm, accounts, 
                    ledger_A: accounts[global.accountNdx + 0],                                    ledger_B: accounts[global.accountNdx + 1],
                       qty_A: 0,                                                             tokenTypeId_A: 0,
                       qty_B: new BN(CONST.tonCarbon),                                       tokenTypeId_B: CONST.tokenType.UNFCCC,
                ccy_amount_A: new BN(CONST.millionUsd_cents),                                  ccyTypeId_A: CONST.ccyType.USD,
                ccy_amount_B: 0,                                                               ccyTypeId_B: 0,
                   applyFees: true,
            });
        }
        catch (ex) { return; }
        assert.fail('expected restriction exception');
    });*/

    // negative: not enough carbon/ccy to cover fee...

    //
    // PRI 1
    // TODO: % fees not yet implemented... (1.5$ per 1000 tons) >> fee structure (override?) to ledger level...
    // TODO: fee to originator on each trade (i.e. data on batch...)
    //
});