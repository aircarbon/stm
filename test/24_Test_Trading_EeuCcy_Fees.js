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
        console.log(`global.global.accountNdx: ${global.accountNdx} - contract @ ${acm.address} (owner: ${accounts[0]}) - getEeuBatchCount: ${(await acm.getEeuBatchCount.call()).toString()}`);
    });

    // TODO: validate fee events (not done by helper)

    // EEU FEES
    it('trading fees - apply VCS carbon fee on a trade (fee on A)', async () => {
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,        accounts[global.accountNdx + 1], { from: accounts[0] });

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
        await acm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,        accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], { from: accounts[0] });

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

        await acm.mintEeuBatch(newTypeId, 1000, 1,                            accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(newTypeId, 1000, 1,                            accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(newTypeId, 1000, 1,                            accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,        accounts[global.accountNdx + 1], { from: accounts[0] });

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
        const contractOwnerUnfcccKgBefore = data.ledgerContractOwner_before.eeus.filter(p => p.eeuTypeId == newTypeId).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerUnfcccKgAfter  =  data.ledgerContractOwner_after.eeus.filter(p => p.eeuTypeId == newTypeId).map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerUnfcccKgAfter == Number(contractOwnerUnfcccKgBefore) + Number(newEeuTypeFixedFee), 'unexpected contract owner (fee receiver) new EEU type tonnage after transfer');
    });

    // CCY FEES
    it('trading fees - apply ETH ccy fee on a max. trade (fee on A)', async () => {
        await acm.fund(CONST.ccyType.ETH,            CONST.oneEth_wei,        accounts[global.accountNdx + 0], { from: accounts[0] });
        await acm.mintEeuBatch(CONST.eeuType.VCS,    CONST.tonCarbon, 1,      accounts[global.accountNdx + 1], { from: accounts[0] });

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
        //console.log('data.ledgerContractOwner_before.ccys', data.ledgerContractOwner_before.ccys);
        //console.log('data.ledgerContractOwner_after.ccys', data.ledgerContractOwner_after.ccys);
        const contractOwnerVcsKgBefore = data.ledgerContractOwner_before.ccys.filter(p => p.typeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        const contractOwnerVcsKgAfter  =  data.ledgerContractOwner_after.ccys.filter(p => p.typeId == CONST.ccyType.ETH).map(p => p.balance).reduce((a,b) => Number(a) + Number(b), 0);
        assert(contractOwnerVcsKgAfter == Number(contractOwnerVcsKgBefore) + Number(ethFeeFixed_Wei), 'unexpected contract owner (fee receiver) ETH balance after transfer');
    });
    //...

    // todo: trade ccy + carbon fees (both sides) x3 

    // negative: only owner can set fee structure...
    // negative: not enough carbon/ccy to cover fee...

    it('trading eeu - should have reasonable gas cost for two-sided transfer with fees...', async () => {
        //...
    });

});