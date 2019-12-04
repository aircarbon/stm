const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;

    const vcs_ExampleKvps = [
        { k: 'VCS_PROJECT_ID',            v: '959' }, // int
        { k: 'VCS_PROJECT_URL',           v: 'https://www.vcsprojectdatabase.org/#/project_details/959' }, // url
        { k: 'VCS_ISSUANCE_URL',          v: 'https://www.vcsprojectdatabase.org/index-no-tabs.html#/vcu_details_report/165504' }, // url
        { k: 'VCS_ISSUANCE_SERIAL_RANGE', v: '7144-374222312-374242311-VCU-007-MER-UY-14-959-01012012-31122012-0' } // freetext
    ];
    const unfccc_ExampleKvps = [
        { k: 'UNFCCC_PROJECT_ID',            v: '0008' }, // int
        { k: 'UNFCCC_PROJECT_URL',           v: 'https://cdm.unfccc.int/Projects/DB/DNV-CUK1095236970.6/view' }, // url
        { k: 'UNFCCC_ISSUANCE_URL',          v: 'https://cdm.unfccc.int/Projects/DB/DNV-CUK1095236970.6/CP/S7AT4T5YDHX1RNDGO6ZOZO6SDNY485/iProcess/RWTUV1346049921.05/view' }, // url
        { k: 'UNFCCC_ISSUANCE_SERIAL_START', v: 'BR-5-85316059-1-1-0-8' }, // freetext
        { k: 'UNFCCC_ISSUANCE_SERIAL_END',   v: 'BR-5-85448545-1-1-0-8' } // freetext
    ];

    beforeEach(async () => {
        stm = await st.deployed();
        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${stm.address} (owner: ${accounts[0]}) - getSecTokenBatchCount: ${(await stm.getSecTokenBatchCount.call()).toString()}`);
    });

    it('minting metadata - should allow metadata no KVP minting', async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx],
             metaKeys: [],
           metaValues: []
        }, { from: accounts[0] } );
    });

    it('minting metadata - should allow metadata single KVP minting', async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx],
             metaKeys: ['testKey_A'],
           metaValues: ['testValue_A']
        }, { from: accounts[0] } );
    });

    it('minting metadata - should allow metadata 10 KVP minting, small strings', async () => {
        const metaKeys = [];
        const metaValues = [];
        for (var i = 0 ; i < 10 ; i++) {
            metaKeys.push(`${i}`);
            metaValues.push(`${i}`);
        }
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx],
             metaKeys, metaValues
        }, { from: accounts[0] } );
    });

    it('minting metadata - should allow metadata 10 KVP minting, large strings', async () => {
        const metaKeys = [];
        const metaValues = [];
        for (var i = 0 ; i < 10 ; i++) {
            metaKeys.push(`testKey_LargeProjectKeytring000000000000000000_${i}`);
            metaValues.push(`testKey_LargerProjectValueString0000000000000000000000000000000000000000000000000000000000000000000000000001111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111_${i}`);
        }
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx],
             metaKeys, metaValues
        }, { from: accounts[0] } );
    });

    it('minting metadata - should allow multiple metadata KVP minting, with null value', async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx],
             metaKeys: ['testKey_A', 'testKey_B'],
           metaValues: ['', 'b']
        }, { from: accounts[0] } );
    });

    it('minting metadata - should allow multiple metadata KVP minting, with null key', async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx],
             metaKeys: ['', 'testKey_B'],
           metaValues: ['a', 'b']
        }, { from: accounts[0] } );
    });

    it('minting metadata - should allow multiple metadata KVP minting, with mismatched key/value lengths (implied null values)', async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx],
             metaKeys: ['testKey_A', 'testKey_B', 'testKey_C'],
           metaValues: ['a', 'b']
        }, { from: accounts[0] } );
    });

    it('minting metadata - should allow metadata KVP minting for example VCS VCUs', async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.VCS, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx],
             metaKeys: vcs_ExampleKvps.map(p => p.k),
           metaValues: vcs_ExampleKvps.map(p => p.v),
        }, { from: accounts[0] } );
    });

    it('minting metadata - should allow metadata KVP minting for example UNFCCC CERs', async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx],
             metaKeys: unfccc_ExampleKvps.map(p => p.k),
           metaValues: unfccc_ExampleKvps.map(p => p.v),
        }, { from: accounts[0] } );
    });

    // ###
    // issues doing validation in the contact: string[] dynamic (ABIEncoderV2) string [] params' .length property returns 0 (?!)
    // will need to do this validation in the API...
    // it('minting - should not allow minting with empty metadata KVP lists', async () => {
    //     try {
    //         await mintBatchWithMetadata( { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx], 
    //             metaKeys: [],
    //           metaValues: [],
    //         }, { from: accounts[0] } );
    //     } catch (ex) { return; }
    //     assert.fail('expected restriction exception');
    // });
    
    // it('minting - should not allow minting with zero-length metadata keys or values', async () => {
    //     try {
    //         await mintBatchWithMetadata( { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx], 
    //             metaKeys: [''],
    //           metaValues: ['testValue'],
    //         }, { from: accounts[0] } );
    //     } catch (ex) { return; }
    //     assert.fail('expected restriction exception');
    // });

    // it('minting - should not allow minting with mismatched metadata KVP list lengths', async () => {
    //     try {
    //         await mintBatchWithMetadata( { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx], 
    //             metaKeys: ['testKey'],
    //           metaValues: [],
    //         }, { from: accounts[0] } );
    //     } catch (ex) { return; }
    //     assert.fail('expected restriction exception');
    // });

    // it('minting - should not allow minting batches with excessive KVP metadata', async () => {
    //     const metaKeys = [], metaValues = [];
    //     for (var i=0 ; i < 43 ; i++) {
    //         metaKeys.push(`testKey_${i}`);
    //         metaValues.push(`testValue_${i}`);
    //     }
    //     try {
    //         await mintBatchWithMetadata( { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx], 
    //             metaKeys, metaValues
    //         }, { from: accounts[0] } );
    //     } catch (ex) { return; }
    //     assert.fail('expected restriction exception');
    // });

    it('post-minting metadata - should allow adding of a new KVP after minting', async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx],
             metaKeys: unfccc_ExampleKvps.map(p => p.k),
           metaValues: unfccc_ExampleKvps.map(p => p.v),
        }, { from: accounts[0] } );

        const batchBefore = await stm.getSecTokenBatch(batchId);

        const testKey = 'TEST_NEW_KEY', testValue = 'TEST_NEW_VALUE';
        const addKvpTx = await stm.addMetaSecTokenBatch(batchId, testKey, testValue);
        truffleAssert.eventEmitted(addKvpTx, 'AddedBatchMetadata', ev => ev.batchId == batchId && ev.key == testKey && ev.value == testValue);
        const batchAfter = await stm.getSecTokenBatch(batchId);

        //console.log('batchBefore', batchBefore);
        //console.log('batchAfter', batchAfter);
        assert(batchAfter.metaKeys.length == batchBefore.metaKeys.length + 1, 'unexpected meta keys length after adding batch metadata');
        assert(batchAfter.metaValues.length == batchBefore.metaValues.length + 1, 'unexpected meta values length after adding batch metadata');
        assert(batchAfter.metaKeys.includes(testKey), 'missing meta key after adding batch metadata');
        assert(batchAfter.metaValues.includes(testValue), 'missing meta key after adding batch metadata');
    });

    it('post-minting metadata - should not allow non-owner to add a new KVP after minting', async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx],
             metaKeys: unfccc_ExampleKvps.map(p => p.k),
           metaValues: unfccc_ExampleKvps.map(p => p.v),
        }, { from: accounts[0] } );

        try {
            const testKey = 'TEST_NEW_KEY', testValue = 'TEST_NEW_VALUE';
            const addKvpTx = await stm.addMetaSecTokenBatch(batchId, 'testKey', testValue, {from: accounts[1] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('post-minting metadata - should not allow adding of a existing KVP after minting', async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.accountNdx],
             metaKeys: unfccc_ExampleKvps.map(p => p.k),
           metaValues: unfccc_ExampleKvps.map(p => p.v),
        }, { from: accounts[0] } );

        const batchBefore = await stm.getSecTokenBatch(batchId);

        const testKey = unfccc_ExampleKvps[0].k, testValue = unfccc_ExampleKvps[0].v;
        try {
            await stm.addMetaSecTokenBatch(batchId, testKey, testValue);
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    async function mintBatchWithMetadata({ tokenType, qtyUnit, qtySecTokens, receiver, metaKeys, metaValues }) {
        const mintTx = await stm.mintSecTokenBatch(tokenType, qtyUnit, qtySecTokens, receiver, CONST.nullFees, metaKeys, metaValues, { from: accounts[0] });
        //console.log(`\t>>> gasUsed - Mint 1 vEEU w/ ${metaKeys.length} metadata keys: ${mintTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * mintTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * mintTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);

        const batchId = (await stm.getSecTokenBatchCount.call()).toNumber();
        const batch = await stm.getSecTokenBatch(batchId);
        
        const batchKeys = batch.metaKeys;
        const batchValues = batch.metaValues;
        
        // console.dir(metaKeys);
        // console.dir(metaValues);
        // console.dir(batchKeys);
        // console.dir(batchValues);

        assert(batchKeys.length == metaKeys.length, 'batch/supplied meta keys length mismatch');
        assert(batchValues.length == metaValues.length, 'batch/supplied meta values length mismatch');
        for (var i=0 ; i < batchKeys.length ; i++) {
            assert(batchKeys[i] == metaKeys[i], `batch/supplied meta key mismatch at position ${i}`);
        }
        for (var i=0 ; i < batchValues.length ; i++) {
            assert(batchValues[i] == metaValues[i], `batch/supplied meta value mismatch at position ${i}`);
        }
        return batchId;
    }
});
