const ac = artifacts.require('AcMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');
const helper = require('./transferHelper.js');
const BN = require('bn.js');

contract('AcMaster', accounts => {
    var acm;

    beforeEach(async () => {
        acm = await ac.deployed();

        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx += 2;
        //console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${acm.address} (owner: ${accounts[0]}) - getEeuBatchCount: ${(await acm.getEeuBatchCount.call()).toString()}`);
    });

    // EEU FEES
    it('trading fees - apply VCS carbon fee on a trade (fee on A)', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await acm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,        accounts[global.accountNdx + 1],         { from: accounts[0] });

        // set fee structure VCS: 1 KG carbon fixed
        const carbonKgFixedFee = 1;
        assert(await acm.fee_eeuType_Fixed(CONST.eeuType.VCS) == 0, 'unexpected VCS fixed KG fee before setting VCS fee structure');
        const setCarbonFeeTx = await acm.setFee_EeuType_Fixed(CONST.eeuType.VCS, carbonKgFixedFee);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeEeuTypeFixed', ev => ev.eeuTypeId == CONST.eeuType.VCS && ev.new_fee_kgTx_Fixed == carbonKgFixedFee);
        assert(await acm.fee_eeuType_Fixed(CONST.eeuType.VCS) == carbonKgFixedFee, 'unexpected VCS fixed KG fee after setting VCS fee structure');
        assert(await acm.fee_eeuType_Fixed(CONST.eeuType.UNFCCC) == 0, 'unexpected UNFCCC fixed KG fee after setting VCS fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 750,                              eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // test contract owner has received expected carbon VCS fee
        const contractOwnerVcsKgBefore = data.ledgerContractOwner_before.eeus.filter(p => p.eeuTypeId == CONST.eeuType.VCS).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.ledgerContractOwner_after.eeus.filter(p => p.eeuTypeId == CONST.eeuType.VCS).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore) + Number(carbonKgFixedFee), 'unexpected contract owner (fee receiver) VCS EEU tonnage after transfer');
    });

    it('trading fees - apply UNFCCC carbon fee on a trade (fee on B)', async () => {
        await acm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,        accounts[global.accountNdx + 0],         { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure UNFCCC: 1 KG carbon fixed, VCS: no fee
        const unfccFixedFee = 2;
        const setUnfccFeeTx = await acm.setFee_EeuType_Fixed(CONST.eeuType.UNFCCC, unfccFixedFee);
        const setVcsFeeTx = await acm.setFee_EeuType_Fixed(CONST.eeuType.VCS, 0);
        truffleAssert.eventEmitted(setUnfccFeeTx, 'SetFeeEeuTypeFixed', ev => ev.eeuTypeId == CONST.eeuType.UNFCCC && ev.new_fee_kgTx_Fixed == unfccFixedFee);
        assert(await acm.fee_eeuType_Fixed(CONST.eeuType.UNFCCC) == unfccFixedFee, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');
        assert(await acm.fee_eeuType_Fixed(CONST.eeuType.VCS) == 0, 'unexpected VCS fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                eeuTypeId_A: 0,
                    kg_B: 750,                              eeuTypeId_B: CONST.eeuType.UNFCCC,
            ccy_amount_A: CONST.oneEth_wei,                 ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerUnfcccKgBefore = data.ledgerContractOwner_before.eeus.filter(p => p.eeuTypeId == CONST.eeuType.UNFCCC).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerUnfcccKgAfter  =  data.ledgerContractOwner_after.eeus.filter(p => p.eeuTypeId == CONST.eeuType.UNFCCC).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerUnfcccKgAfter == Number(contractOwnerUnfcccKgBefore) + Number(unfccFixedFee), 'unexpected contract owner (fee receiver) UNFCCC EEU tonnage after transfer');

        // test contract owner has unchanged VCS balance (i.e. no VCS fees received)
        const contractOwnerVcsKgBefore = data.ledgerContractOwner_before.eeus.filter(p => p.eeuTypeId == CONST.eeuType.VCS).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.ledgerContractOwner_after.eeus.filter(p => p.eeuTypeId == CONST.eeuType.VCS).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore), 'unexpected contract owner (fee receiver) VCS EEU tonnage after transfer');
    });

    it('trading fees - apply large (>1 batch EEU size) carbon fee on a trade on a newly added EEU type', async () => {
        await acm.addEeuType('TEST_EEU_TYPE');
        const types = (await acm.getEeuTypes()).eeuTypes;
        const newTypeId = types.filter(p => p.name == 'TEST_EEU_TYPE')[0].id;

        await acm.mintEeuBatch(newTypeId, 1000, 1,                            accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await acm.mintEeuBatch(newTypeId, 1000, 1,                            accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await acm.mintEeuBatch(newTypeId, 1000, 1,                            accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await acm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,        accounts[global.accountNdx + 1],         { from: accounts[0] });

        // set fee structure new EEU type: 1500 KG carbon fixed (1.5 EEUs, 2 batches)
        const newEeuTypeFixedFee = 1500;
        const setFeeTx = await acm.setFee_EeuType_Fixed(newTypeId, newEeuTypeFixedFee);
        truffleAssert.eventEmitted(setFeeTx, 'SetFeeEeuTypeFixed', ev => ev.eeuTypeId == newTypeId && ev.new_fee_kgTx_Fixed == newEeuTypeFixedFee);
        assert(await acm.fee_eeuType_Fixed(newTypeId) == newEeuTypeFixedFee, 'unexpected new EEU type fixed KG fee after setting fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],     ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 1,                                eeuTypeId_A: newTypeId,
                    kg_B: 0,                                eeuTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: CONST.oneEth_wei,                 ccyTypeId_B: CONST.ccyType.ETH,
               applyFees: true,
        });

        // test contract owner has received expected new EEU type carbon fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.eeus.filter(p => p.eeuTypeId == newTypeId).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.eeus.filter(p => p.eeuTypeId == newTypeId).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(newEeuTypeFixedFee), 'unexpected contract owner (fee receiver) new EEU type tonnage after transfer');
    });

    // CCY FEES
    it('trading fees - apply ETH ccy fee on a max. trade (fee on A)', async () => {
        await acm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,        accounts[global.accountNdx + 0],         { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure ETH: 1000 Wei fixed
        const ethFeeFixed_Wei = 1000;
        assert(await acm.fee_ccyType_Fixed(CONST.ccyType.ETH) == 0, 'unexpected ETH fixed Wei fee before setting ETH fee structure');
        const setCarbonFeeTx = await acm.setFee_CcyType_Fixed(CONST.ccyType.ETH, ethFeeFixed_Wei);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.new_fee_ccyTx_Fixed == ethFeeFixed_Wei);
        assert(await acm.fee_ccyType_Fixed(CONST.ccyType.ETH) == ethFeeFixed_Wei, 'unexpected ETH fixed Wei fee after setting ETH fee structure');
        assert(await acm.fee_ccyType_Fixed(CONST.ccyType.USD) == 0, 'unexpected USD fixed cents fee after setting ETH fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                       ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                                     eeuTypeId_A: 0,
                    kg_B: 750,                                                   eeuTypeId_B: CONST.eeuType.VCS,
            ccy_amount_A: new BN(CONST.oneEth_wei).sub(new BN(ethFeeFixed_Wei)), ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                     ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.typeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.typeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(ethFeeFixed_Wei), 'unexpected contract owner (fee receiver) ETH balance after transfer');
    });

    it('trading fees - apply USD ccy fee on a max. trade (fee on B)', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await acm.fund(CONST.ccyType.USD,            CONST.millionUsd_cents,  accounts[global.accountNdx + 1],         { from: accounts[0] });

        // set fee structure USD: 1000 $ in cents
        const usdFeeFixed_cents = CONST.thousandUsd_cents;
        const setCarbonFeeTx = await acm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.new_fee_ccyTx_Fixed == usdFeeFixed_cents);
        assert(await acm.fee_ccyType_Fixed(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                               ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 750,                                                           eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                                             eeuTypeId_B: 0,
            ccy_amount_A: 0,                                                             ccyTypeId_A: 0,
            ccy_amount_B: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)), ccyTypeId_B: CONST.ccyType.USD,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.typeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.typeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(usdFeeFixed_cents), 'unexpected contract owner (fee receiver) USD balance after transfer');
    });

    it('trading fees - apply ccy fee on a max. trade on a newly added ccy', async () => {
        await acm.addCcyType('TEST_CCY_TYPE', 'TEST_UNIT');
        const types = (await acm.getCcyTypes()).ccyTypes;
        const newCcyTypeId = types.filter(p => p.name == 'TEST_CCY_TYPE')[0].id;

        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], [], [], { from: accounts[0] });
        await acm.fund(newCcyTypeId,                 1000,                    accounts[global.accountNdx + 1],         { from: accounts[0] });

        // set fee structure new ccy: 100 units
        const newCcyFeeFixed_units = 100;
        const setCarbonFeeTx = await acm.setFee_CcyType_Fixed(newCcyTypeId, newCcyFeeFixed_units);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == newCcyTypeId && ev.new_fee_ccyTx_Fixed == newCcyFeeFixed_units);
        assert(await acm.fee_ccyType_Fixed(newCcyTypeId) == newCcyFeeFixed_units, 'unexpected new currency fixed fee after setting fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 750,                                            eeuTypeId_A: CONST.eeuType.VCS,
                    kg_B: 0,                                              eeuTypeId_B: 0,
            ccy_amount_A: 0,                                              ccyTypeId_A: 0,
            ccy_amount_B: new BN(1000).sub(new BN(newCcyFeeFixed_units)), ccyTypeId_B: newCcyTypeId,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.typeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.typeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(newCcyFeeFixed_units), 'unexpected contract owner (fee receiver) new ccy balance after transfer');
    });

    // EEU + CCY FEES
    it('trading fees - apply ETH ccy & VCS EEU fee on a max. trade (fees on both sides)', async () => {
        await acm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,        accounts[global.accountNdx + 0],         { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure ETH: 1000 Wei fixed
        const ethFeeFixed_Wei = 1000;
        const setEthFeeTx = await acm.setFee_CcyType_Fixed(CONST.ccyType.ETH, ethFeeFixed_Wei);
        truffleAssert.eventEmitted(setEthFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == CONST.ccyType.ETH && ev.new_fee_ccyTx_Fixed == ethFeeFixed_Wei);
        assert(await acm.fee_ccyType_Fixed(CONST.ccyType.ETH) == ethFeeFixed_Wei, 'unexpected ETH fixed Wei fee after setting ETH fee structure');

        // set fee structure VCS: 10 KG fixed
        const vcsKgFeeFixed = 10;
        assert(await acm.fee_eeuType_Fixed(CONST.eeuType.VCS) == 0, 'unexpected VCS fixed KG fee before setting VCS fee structure');
        const setCarbonFeeTx = await acm.setFee_EeuType_Fixed(CONST.eeuType.VCS, vcsKgFeeFixed);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeEeuTypeFixed', ev => ev.eeuTypeId == CONST.eeuType.VCS && ev.new_fee_kgTx_Fixed == vcsKgFeeFixed);
        assert(await acm.fee_eeuType_Fixed(CONST.eeuType.VCS) == vcsKgFeeFixed, 'unexpected VCS fixed KG fee after setting VCS fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                       ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                                     eeuTypeId_A: 0,
                    kg_B: new BN(CONST.tonCarbon).sub(new BN(vcsKgFeeFixed)),    eeuTypeId_B: CONST.eeuType.VCS,
            ccy_amount_A: new BN(CONST.oneEth_wei).sub(new BN(ethFeeFixed_Wei)), ccyTypeId_A: CONST.ccyType.ETH,
            ccy_amount_B: 0,                                                     ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected ETH fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.typeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.typeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(ethFeeFixed_Wei), 'unexpected contract owner (fee receiver) ETH balance after transfer');
        
        // test contract owner has received expected carbon VCS fee
        const contractOwnerVcsKgBefore = data.ledgerContractOwner_before.eeus.filter(p => p.eeuTypeId == CONST.eeuType.VCS).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.ledgerContractOwner_after.eeus.filter(p => p.eeuTypeId == CONST.eeuType.VCS).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore) + Number(vcsKgFeeFixed), 'unexpected contract owner (fee receiver) VCS EEU tonnage after transfer');
    });

    it('trading fees - apply USD ccy & UNFCCC EEU fee on a max. trade (fees on both sides)', async () => {
        await acm.fund(CONST.ccyType.USD,            CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure USD: 100 cents
        const usdFeeFixed_cents = CONST.oneUsd_cents;
        const setUsdFeeTx = await acm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.new_fee_ccyTx_Fixed == usdFeeFixed_cents);
        assert(await acm.fee_ccyType_Fixed(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 42 KG fixed
        const unfcccKgFeeFixed = 42;
        const setCarbonFeeTx = await acm.setFee_EeuType_Fixed(CONST.eeuType.UNFCCC, unfcccKgFeeFixed);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeEeuTypeFixed', ev => ev.eeuTypeId == CONST.eeuType.UNFCCC && ev.new_fee_kgTx_Fixed == unfcccKgFeeFixed);
        assert(await acm.fee_eeuType_Fixed(CONST.eeuType.UNFCCC) == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                               ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                                             eeuTypeId_A: 0,
                    kg_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         eeuTypeId_B: CONST.eeuType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)), ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                             ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected USD fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.typeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.typeId == CONST.ccyType.USD).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(usdFeeFixed_cents), 'unexpected contract owner (fee receiver) USD balance after transfer');
        
        // test contract owner has received expected carbon UNFCCC fee
        const contractOwnerVcsKgBefore = data.ledgerContractOwner_before.eeus.filter(p => p.eeuTypeId == CONST.eeuType.UNFCCC).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.ledgerContractOwner_after.eeus.filter(p => p.eeuTypeId == CONST.eeuType.UNFCCC).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore) + Number(unfcccKgFeeFixed), 'unexpected contract owner (fee receiver) UNFCCC EEU tonnage after transfer');    
    });

    it('trading fees - apply newly added ccy & newly added EEU type fee on a max. trade (fees on both sides)', async () => {
        await acm.addCcyType('TEST_CCY_TYPE_2', 'TEST_UNIT');
        const ccyTypes = (await acm.getCcyTypes()).ccyTypes;
        const newCcyTypeId = ccyTypes.filter(p => p.name == 'TEST_CCY_TYPE_2')[0].id;

        await acm.addEeuType('TEST_EEU_TYPE_2');
        const eeuTypes = (await acm.getEeuTypes()).eeuTypes;
        const newEeuTypeId = eeuTypes.filter(p => p.name == 'TEST_EEU_TYPE_2')[0].id;

        await acm.fund(newCcyTypeId,                 1000,                    accounts[global.accountNdx + 0],         { from: accounts[0] });
        await acm.mintEeuBatch(newEeuTypeId,         CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure new ccy
        const ccyFeeFixed_units = 10;
        const setCcyFeeTx = await acm.setFee_CcyType_Fixed(newCcyTypeId, ccyFeeFixed_units);
        truffleAssert.eventEmitted(setCcyFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == newCcyTypeId && ev.new_fee_ccyTx_Fixed == ccyFeeFixed_units);
        assert(await acm.fee_ccyType_Fixed(newCcyTypeId) == ccyFeeFixed_units, 'unexpected new ccy fixed fee after setting ccy fee structure');

        // set fee structure new EEU type: 1 KG
        const newEeuTypeKgFeeFixed = 1;
        const setCarbonFeeTx = await acm.setFee_EeuType_Fixed(newEeuTypeId, newEeuTypeKgFeeFixed);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeEeuTypeFixed', ev => ev.eeuTypeId == newEeuTypeId && ev.new_fee_kgTx_Fixed == newEeuTypeKgFeeFixed);
        assert(await acm.fee_eeuType_Fixed(newEeuTypeId) == newEeuTypeKgFeeFixed, 'unexpected new eeu type fixed KG fee after setting eeu fee structure');

        // transfer, with fee structure applied
        const data = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                               ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                                             eeuTypeId_A: 0,
                    kg_B: new BN(CONST.tonCarbon).sub(new BN(newEeuTypeKgFeeFixed)),     eeuTypeId_B: newEeuTypeId,
            ccy_amount_A: new BN(1000).sub(new BN(ccyFeeFixed_units)),                   ccyTypeId_A: newCcyTypeId,
            ccy_amount_B: 0,                                                             ccyTypeId_B: 0,
               applyFees: true,
        });

        // test contract owner has received expected ccy fee
        const contractOwnerFeeBalanceBefore = data.ledgerContractOwner_before.ccys.filter(p => p.typeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerFeeBalanceAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.typeId == newCcyTypeId).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerFeeBalanceAfter == Number(contractOwnerFeeBalanceBefore) + Number(ccyFeeFixed_units), 'unexpected contract owner (fee receiver) newly added ccy balance after transfer');
        
        // test contract owner has received expected carbon fee
        const contractOwnerEeuKgBefore = data.ledgerContractOwner_before.eeus.filter(p => p.eeuTypeId == newEeuTypeId).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerEeuKgAfter  =  data.ledgerContractOwner_after.eeus.filter(p => p.eeuTypeId == newEeuTypeId).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerEeuKgAfter == Number(contractOwnerEeuKgBefore) + Number(newEeuTypeKgFeeFixed), 'unexpected contract owner (fee receiver) newly added EEU type tonnage after transfer');    
    });

    it('trading fees - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fees on both sides)', async () => {
        await acm.fund(CONST.ccyType.USD,            CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure USD: 100 cents
        const usdFeeFixed_cents = CONST.oneUsd_cents;
        const setUsdFeeTx = await acm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.new_fee_ccyTx_Fixed == usdFeeFixed_cents);
        assert(await acm.fee_ccyType_Fixed(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 10 KG fixed
        const unfcccKgFeeFixed = 10;
        const setCarbonFeeTx = await acm.setFee_EeuType_Fixed(CONST.eeuType.UNFCCC, unfcccKgFeeFixed);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeEeuTypeFixed', ev => ev.eeuTypeId == CONST.eeuType.UNFCCC && ev.new_fee_kgTx_Fixed == unfcccKgFeeFixed);
        assert(await acm.fee_eeuType_Fixed(CONST.eeuType.UNFCCC) == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const tradeTx = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                               ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                                             eeuTypeId_A: 0,
                    kg_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         eeuTypeId_B: CONST.eeuType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)), ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                             ccyTypeId_B: 0,
               applyFees: true,
        });

        console.log(`\t>>> gasUsed - 1.0 vEEU trade eeu/ccy (A <-> B) w/ fees on both: ${tradeTx.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on ccy)', async () => {
        await acm.fund(CONST.ccyType.USD,            CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure USD: 100 cents
        const usdFeeFixed_cents = CONST.oneUsd_cents;
        const setUsdFeeTx = await acm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.new_fee_ccyTx_Fixed == usdFeeFixed_cents);
        assert(await acm.fee_ccyType_Fixed(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 0 KG fixed
        const unfcccKgFeeFixed = 0;
        const setCarbonFeeTx = await acm.setFee_EeuType_Fixed(CONST.eeuType.UNFCCC, unfcccKgFeeFixed);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeEeuTypeFixed', ev => ev.eeuTypeId == CONST.eeuType.UNFCCC && ev.new_fee_kgTx_Fixed == unfcccKgFeeFixed);
        assert(await acm.fee_eeuType_Fixed(CONST.eeuType.UNFCCC) == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const tradeTx = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                               ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                                             eeuTypeId_A: 0,
                    kg_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         eeuTypeId_B: CONST.eeuType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)), ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                             ccyTypeId_B: 0,
               applyFees: true,
        });

        console.log(`\t>>> gasUsed - 1.0 vEEU trade eeu/ccy (A <-> B) w/ fees on ccy: ${tradeTx.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees - should have reasonable gas cost for two-sided transfer (eeu/ccy) (fee on eeu)', async () => {
        await acm.fund(CONST.ccyType.USD,            CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure USD: 0 cents
        const usdFeeFixed_cents = CONST.oneUsd_cents;
        const setUsdFeeTx = await acm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.new_fee_ccyTx_Fixed == usdFeeFixed_cents);
        assert(await acm.fee_ccyType_Fixed(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 10 KG fixed
        const unfcccKgFeeFixed = 10;
        const setCarbonFeeTx = await acm.setFee_EeuType_Fixed(CONST.eeuType.UNFCCC, unfcccKgFeeFixed);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeEeuTypeFixed', ev => ev.eeuTypeId == CONST.eeuType.UNFCCC && ev.new_fee_kgTx_Fixed == unfcccKgFeeFixed);
        assert(await acm.fee_eeuType_Fixed(CONST.eeuType.UNFCCC) == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const tradeTx = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                               ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                                             eeuTypeId_A: 0,
                    kg_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         eeuTypeId_B: CONST.eeuType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)), ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                             ccyTypeId_B: 0,
               applyFees: true,
        });

        console.log(`\t>>> gasUsed - 1.0 vEEU trade eeu/ccy (A <-> B) w/ fees on eeu: ${tradeTx.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('trading fees - should have reasonable gas cost for two-sided transfer (eeu/ccy) (base gas cost: no fees)', async () => {
        await acm.fund(CONST.ccyType.USD,            CONST.millionUsd_cents,  accounts[global.accountNdx + 0],         { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], [], [], { from: accounts[0] });

        // set fee structure USD: 0 cents
        const usdFeeFixed_cents = CONST.oneUsd_cents;
        const setUsdFeeTx = await acm.setFee_CcyType_Fixed(CONST.ccyType.USD, usdFeeFixed_cents);
        truffleAssert.eventEmitted(setUsdFeeTx, 'SetFeeCcyTypeFixed', ev => ev.ccyTypeId == CONST.ccyType.USD && ev.new_fee_ccyTx_Fixed == usdFeeFixed_cents);
        assert(await acm.fee_ccyType_Fixed(CONST.ccyType.USD) == usdFeeFixed_cents, 'unexpected USD fixed cents fee after setting USD fee structure');

        // set fee structure UNFCCC: 0 KG fixed
        const unfcccKgFeeFixed = 0;
        const setCarbonFeeTx = await acm.setFee_EeuType_Fixed(CONST.eeuType.UNFCCC, unfcccKgFeeFixed);
        truffleAssert.eventEmitted(setCarbonFeeTx, 'SetFeeEeuTypeFixed', ev => ev.eeuTypeId == CONST.eeuType.UNFCCC && ev.new_fee_kgTx_Fixed == unfcccKgFeeFixed);
        assert(await acm.fee_eeuType_Fixed(CONST.eeuType.UNFCCC) == unfcccKgFeeFixed, 'unexpected UNFCCC fixed KG fee after setting UNFCCC fee structure');

        // transfer, with fee structure applied
        const tradeTx = await helper.transferLedger({ acm, accounts, 
                ledger_A: accounts[global.accountNdx + 0],                               ledger_B: accounts[global.accountNdx + 1],
                    kg_A: 0,                                                             eeuTypeId_A: 0,
                    kg_B: new BN(CONST.tonCarbon).sub(new BN(unfcccKgFeeFixed)),         eeuTypeId_B: CONST.eeuType.UNFCCC,
            ccy_amount_A: new BN(CONST.millionUsd_cents).sub(new BN(usdFeeFixed_cents)), ccyTypeId_A: CONST.ccyType.USD,
            ccy_amount_B: 0,                                                             ccyTypeId_B: 0,
               applyFees: true,
        });

        console.log(`\t>>> gasUsed - 1.0 vEEU trade eeu/ccy (A <-> B) w/ no fees: ${tradeTx.transferTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * tradeTx.transferTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    // positive: validate fee events (not done by helper)
    // negative: only owner can set fee structure...
    // negative: not enough carbon/ccy to cover fee...

    //
    // PRI 1
    // TODO: % fees not yet implemented... (1.5$ per 1000 tons) >> fee structure (override?) to ledger level...
    // TODO: fee to originator on each trade (i.e. data on batch...)
    //
});