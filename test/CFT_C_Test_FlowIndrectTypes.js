const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');
const chalk = require('chalk');

const CONST = require('../const.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;

    before(async function () {
        stm = await st.deployed();
        //console.log('before, stm.name=', (await stm.name()));

        //console.log('stm.getContractType()', await stm.getContractType());
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

    //
    // ORDERED
    //

    // indirect types & minting
    it(`cashflow controller - should be able to query controller's indirect types (default deployer: 2 indirect types)`, async () => {
        const types = (await stm.getSecTokenTypes()).tokenTypes;
        //console.log('types', types.map(p => { return `${p.cashflowBaseAddr} [${p.name}]` }));
        assert(types.length == 2);
    });
    it(`cashflow controller - allow an initial unibatch mint on an indirect passed-through cashflow base (type 1)`, async () => {
        const M = accounts[0];
        const { batchId, mintTx } = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: M, metaKeys: [ 'key1', 'key2' ],  metaValues: [ 'val1', 'val2' ],
        }, );
        truffleAssert.prettyPrintEmittedEvents(mintTx);

        // //const maxId = await stm.getSecToken_MaxId(); // ### this is a COUNT for the controller, not a max id
        // const maxId = new BN('6277101735386680763835789423207666416102355444464034512897'); // 0x0000000000000001000000000000000000000000000000000000000000000001
        // //console.log('maxId', maxId.toString(16, 64));
        // const st = await stm.getSecToken(maxId);
        // console.log('st', st);

        // // truffleAssert.prettyPrintEmittedEvents(mintTx);
        // // truffleAssert.eventEmitted(mintTx, 'dbg2', ev => {
        // //     const bn = new BN(ev.postIdShifted);
        // //     console.log(chalk.bgBlue.white(`dbg2 - postIdShifted: / 0x${bn.toString(16, 64)}`));
        // //     console.log('bn16', bn.toString(16, 64));
        // //     console.log('bn02', bn.toString(2));
        // //     return true;
        // // });
    });
    it(`cashflow controller - should not allow a subsequent batch mint for the same indirect base (type 1)`, async () => {
        const M = accounts[0];
        try {
            const { batchId, mintTx } = await mintBatchWithMetadata( 
                { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 100, qtySecTokens: 1, receiver: M,
                   metaKeys: [ 'key3', 'key4' ],
                 metaValues: [ 'val4', 'val4' ],
            }, { from: accounts[0] } );
        } catch (ex) { assert(ex.reason == 'Bad cashflow request', `unexpected: ${ex.reason}`); return; }
    });
    it(`cashflow controller - should allow an initial unibatch mint on a different indirect passed-through cashflow base (type 2)`, async () => {
        const M = accounts[0];
        const { batchId, mintTx } = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T2, qtyUnit: 2000, qtySecTokens: 1, receiver: M, metaKeys: [ 'key5', 'key6' ], metaValues: [ 'val5', 'val6' ],
        }, );
        truffleAssert.prettyPrintEmittedEvents(mintTx);
        // truffleAssert.eventEmitted(mintTx, 'MintedSecToken', ev => {
        // });
    });

    // query ledger
    it(`cashflow controller - should be able to delegate-fetch a single token with mapped batch ID & mapped token rtype ID from base (type 2)`, async () => {
        //const maxId = await stm.getSecToken_MaxId(); // (## token IDs in controller are fragmented, i.e. getSecToken_MaxId is a COUNT in the controller, not a MAX id)
        const maxId = new BN('12554203470773361527671578846415332832204710888928069025793'); // 0x0000000000000002000000000000000000000000000000000000000000000001
        //console.log('maxId', maxId.toString(16, 64));
        const st = await stm.getSecToken(maxId);
        //console.log('st', st);
        assert(st.tokTypeId == 2, 'unexpected (unmapped?) tok-type id on token from controller');
        assert(st.batchId == 2, 'unexpected (unmapped?) batch id on token from controller');
    });

    // it(`cashflow controller - should be able to get a split ledger entry across all indirect token types`, async () => {
    //     const le_cftc = await stm.getLedgerEntry(accounts[0]); // TODO: split/delegate getLedgerEntry() ...
    //     console.log('le_cftc', le_cftc);

    //     const types = (await stm.getSecTokenTypes()).tokenTypes;
    //     console.log('types', types.map(p => { return `${p.cashflowBaseAddr} [${p.name}]` }));
    //     for (var type of types) {
    //         const le_base = await CONST.web3_call('getLedgerEntry', [accounts[0]], /*nameOverride*/undefined, /*addrOverride*/type.cashflowBaseAddr);
    //         console.log('le_base.tokens', le_base.tokens);
    //     }
    // });

    // TODO: getSecToken() [delegation to base...]

    // TODO: getLedgerHashcode() -> controller needs to delegate to base for ST data...!
    
    // TODO: transferOrTrade()

    async function mintBatchWithMetadata({ tokenType, qtyUnit, qtySecTokens, receiver, metaKeys, metaValues }) {
        const mintTx = await stm.mintSecTokenBatch(
            tokenType, qtyUnit, qtySecTokens, receiver, CONST.nullFees, 0, metaKeys, metaValues,
            //0,
        { from: accounts[0] });
        //truffleAssert.prettyPrintEmittedEvents(mintTx);

        const batchId = (await stm.getSecTokenBatch_MaxId.call()).toNumber();
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