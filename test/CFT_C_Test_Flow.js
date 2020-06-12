const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');

const CONST = require('../const.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        console.log('before, stm.name=', (await stm.name()));

        if (await stm.getContractType() != CONST.contractType.CASHFLOW_CONTROLLER) this.skip();
        await stm.sealContract();
        await setupHelper.setDefaults({ stm, accounts });
        if (!global.TaddrNdx) global.TaddrNdx = 0;
    });

    beforeEach(async () => {
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    // ORDERED

    it(`cashflow controller - should be able to query controller's indirect types (default deployer: 2 indirect types)`, async () => {
        const types = (await stm.getSecTokenTypes()).tokenTypes;
        //console.log('types', types.map(p => { return `${p.cashflowBaseAddr} [${p.name}]` }));
        assert(types.length == 2);
    });

    it(`cashflow controller - allow an initial unibatch mint on indirect passed-through cashflow base (type 1)`, async () => {
        const M = accounts[global.TaddrNdx];
        const { batchId, mintTx } = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: M,
               metaKeys: [ 'key1', 'key2' ],
             metaValues: [ 'val1', 'val2' ],
        }, { from: accounts[0] } );
    });

    it(`cashflow controller - should not allow a subsequent batch mint for the same indirect base (type 1)`, async () => {
        const M = accounts[global.TaddrNdx];
        try {
            const { batchId, mintTx } = await mintBatchWithMetadata( 
                { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 100, qtySecTokens: 1, receiver: M,
                   metaKeys: [ 'key3', 'key4' ],
                 metaValues: [ 'val4', 'val4' ],
            }, { from: accounts[0] } );
        } catch (ex) { 
            assert(ex.reason == 'Bad cashflow request', `unexpected: ${ex.reason}`);
            return;
        }
    });

    it(`cashflow controller - should allow an initial unibatch mint on different indirect passed-through cashflow base (type 2)`, async () => {
        const M = accounts[global.TaddrNdx];
        const { batchId, mintTx } = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T2, qtyUnit: 1000, qtySecTokens: 1, receiver: M,
               metaKeys: [ 'key5', 'key6' ],
             metaValues: [ 'val5', 'val6' ],
        }, { from: accounts[0] } );
        //console.log('mintTx', mintTx);
        //console.log('batchId', batchId);
    });
    // TODO: getLedgerEntry()

    // TODO: getLedgerHashcode() -> controller needs to delegate to base for ST data...!
    // TODO: mint for second type
    // TODO: transferOrTrade()

    // it(`cashflow controller - controller's ledger entry contains indirect token values`, async () => {
    //     const le = await stm.getLedgerEntry(accounts[0]); //...
    //     console.log('le', le);

    async function mintBatchWithMetadata({ tokenType, qtyUnit, qtySecTokens, receiver, metaKeys, metaValues }) {
        const mintTx = await stm.mintSecTokenBatch(tokenType, qtyUnit, qtySecTokens, receiver, CONST.nullFees, 0, metaKeys, metaValues, { from: accounts[0] });
        //truffleAssert.prettyPrintEmittedEvents(mintTx);

        const batchId = (await stm.getSecTokenBatchCount.call()).toNumber();
        //console.log('batchId', batchId);
        
        const batch = await stm.getSecTokenBatch(batchId);
        //console.log('batch', batch);
        
        const batchKeys = batch.metaKeys;
        const batchValues = batch.metaValues;
        //console.dir(batchKeys);
        //console.dir(batchValues);

        assert(batchKeys.length == metaKeys.length, 'batch/supplied meta keys length mismatch');
        assert(batchValues.length == metaValues.length, 'batch/supplied meta values length mismatch');
        for (var i=0 ; i < batchKeys.length ; i++) {
            assert(batchKeys[i] == metaKeys[i], `batch/supplied meta key mismatch at position ${i}`);
        }
        for (var i=0 ; i < batchValues.length ; i++) {
            assert(batchValues[i] == metaValues[i], `batch/supplied meta value mismatch at position ${i}`);
        }
        return { batchId, mintTx };
    }

});