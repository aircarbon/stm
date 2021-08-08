// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StMintable.sol => LedgerLib.sol, SpotFeeLib.sol
const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;

    // 0.96e
    const corsia_ExampleKvps = [
        // e.g. UN_CER = old unfccc
        { k: 'REGISTRY_TYPE',         v: 'UN_CER' },
        { k: 'PROJECT_ID',            v: '0008' }, // int
        { k: 'URL_PROJECT',           v: 'https://cdm.unfccc.int/Projects/DB/DNV-CUK1095236970.6/view' }, // url
        { k: 'URL_ISSUANCE',          v: 'https://cdm.unfccc.int/Projects/DB/DNV-CUK1095236970.6/CP/S7AT4T5YDHX1RNDGO6ZOZO6SDNY485/iProcess/RWTUV1346049921.05/view' }, // url
        { k: 'ISSUANCE_SERIAL_RANGE', v: 'BR-5-85316059-1-1-0-8 - BR-5-85448545-1-1-0-8' }, // freetext
        // e.g. VERRA_VCS = old vcs
        // { k: 'REGISTRY_TYPE',         v: 'VERRA_VCS' },
        // { k: 'PROJECT_ID',            v: '959' }, // int
        // { k: 'PROJECT_URL',           v: 'https://www.vcsprojectdatabase.org/#/project_details/959' }
        // { k: 'ISSUANCE_URL',          v: 'https://www.vcsprojectdatabase.org/index-no-tabs.html#/vcu_details_report/182909' },
        // { k: 'ISSUANCE_SERIAL_RANGE', v: '7144-374222312-374242311-VCU-007-MER-UY-14-959-01012012-31122012-0' }
    ];
    const nature_ExampleKvps = [
        { k: 'REGISTRY_TYPE',         v: '***' },
        { k: 'PROJECT_ID',            v: '...' },
        { k: 'URL_PROJECT',           v: '...' },
        { k: 'URL_ISSUANCE',          v: '...' },
        { k: 'ISSUANCE_SERIAL_RANGE', v: '...' }
    ];

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        await stm.sealContract();
        await setupHelper.setDefaults({ stm, accounts });
        if (!global.TaddrNdx) global.TaddrNdx = 0;
    });

    beforeEach(async () => {
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`minting metadata - mint/burn/chk`, async () => {
        console.log('hash0', await stm.getLedgerHashcode(1,0));

        const M = accounts[global.TaddrNdx];
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: M,
             metaKeys: [],
           metaValues: []
        });
        //console.log('getSecToken_totalMintedQty', await getSecToken_totalMintedQty())
        console.log('hash1', await stm.getLedgerHashcode(1,0));

        const burnTx = await stm.burnTokens(M, CONST.tokenType.TOK_T1, 1000, []);
        console.log('hash2', await stm.getLedgerHashcode(1,0));
    });

    it(`minting metadata - should allow metadata no KVP minting`, async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx],
             metaKeys: [],
           metaValues: []
        });
    });

    it(`minting metadata - should allow metadata single KVP minting`, async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx],
             metaKeys: ['testKey_A'],
           metaValues: ['testValue_A']
        });
    });

    it(`minting metadata - should allow metadata 10 KVP minting, small strings`, async () => {
        const metaKeys = [];
        const metaValues = [];
        for (var i = 0 ; i < 10 ; i++) {
            metaKeys.push(`${i}`);
            metaValues.push(`${i}`);
        }
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx],
             metaKeys, metaValues
        });
    });

    it(`minting metadata - should allow metadata 10 KVP minting, large strings`, async () => {
        const metaKeys = [];
        const metaValues = [];
        for (var i = 0 ; i < 10 ; i++) {
            metaKeys.push(`testKey_LargeProjectKeytring000000000000000000_${i}`);
            metaValues.push(`testKey_LargerProjectValueString0000000000000000000000000000000000000000000000000000000000000000000000000001111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111_${i}`);
        }
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx],
             metaKeys, metaValues
        });
    });

    it(`minting metadata - should allow multiple metadata KVP minting, with null value`, async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx],
             metaKeys: ['testKey_A', 'testKey_B'],
           metaValues: ['', 'b']
        });
    });

    it(`minting metadata - should allow multiple metadata KVP minting, with null key`, async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx],
             metaKeys: ['', 'testKey_B'],
           metaValues: ['a', 'b']
        });
    });

    it(`minting metadata - should allow multiple metadata KVP minting, with mismatched key/value lengths (implied null values)`, async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx],
             metaKeys: ['testKey_A', 'testKey_B', 'testKey_C'],
           metaValues: ['a', 'b']
        });
    });

    it(`minting metadata - should allow metadata KVP minting for example NATURE VCUs`, async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T2, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx],
             metaKeys: nature_ExampleKvps.map(p => p.k),
           metaValues: nature_ExampleKvps.map(p => p.v),
        });
    });

    it(`minting metadata - should allow metadata KVP minting for example CORSIA CERs`, async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx],
             metaKeys: corsia_ExampleKvps.map(p => p.k),
           metaValues: corsia_ExampleKvps.map(p => p.v),
        });
    });

    // ###
    // issues doing validation in the contact: string[] dynamic (ABIEncoderV2) string [] params' .length property returns 0 (?!)
    // will need to do this validation in the API...
    // it(`minting - should not allow minting with empty metadata KVP lists`, async () => {
    //     try {
    //         await mintBatchWithMetadata( { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx], 
    //             metaKeys: [],
    //           metaValues: [],
    //         });
    //     } catch (ex) { return; }
    //     assert.fail('expected contract exception');
    // });
    
    // it(`minting - should not allow minting with zero-length metadata keys or values`, async () => {
    //     try {
    //         await mintBatchWithMetadata( { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx], 
    //             metaKeys: [''],
    //           metaValues: ['testValue'],
    //         });
    //     } catch (ex) { return; }
    //     assert.fail('expected contract exception');
    // });

    // it(`minting - should not allow minting with mismatched metadata KVP list lengths`, async () => {
    //     try {
    //         await mintBatchWithMetadata( { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx], 
    //             metaKeys: ['testKey'],
    //           metaValues: [],
    //         });
    //     } catch (ex) { return; }
    //     assert.fail('expected contract exception');
    // });

    // it(`minting - should not allow minting batches with excessive KVP metadata`, async () => {
    //     const metaKeys = [], metaValues = [];
    //     for (var i=0 ; i < 43 ; i++) {
    //         metaKeys.push(`testKey_${i}`);
    //         metaValues.push(`testValue_${i}`);
    //     }
    //     try {
    //         await mintBatchWithMetadata( { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx], 
    //             metaKeys, metaValues
    //         });
    //     } catch (ex) { return; }
    //     assert.fail('expected contract exception');
    // });

    it(`post-minting metadata - should allow adding of a new KVP after minting`, async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx],
             metaKeys: corsia_ExampleKvps.map(p => p.k),
           metaValues: corsia_ExampleKvps.map(p => p.v),
        });

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

    it(`post-minting metadata - should not allow non-owner to add a new KVP after minting`, async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx],
             metaKeys: corsia_ExampleKvps.map(p => p.k),
           metaValues: corsia_ExampleKvps.map(p => p.v),
        });

        try {
            const testKey = 'TEST_NEW_KEY', testValue = 'TEST_NEW_VALUE';
            const addKvpTx = await stm.addMetaSecTokenBatch(batchId, 'testKey', testValue, {from: accounts[10] });
        } catch (ex) { 
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    it(`post-minting metadata - should not allow adding of a existing KVP after minting`, async () => {
        const batchId = await mintBatchWithMetadata( 
            { tokenType: CONST.tokenType.TOK_T1, qtyUnit: 1000, qtySecTokens: 1, receiver: accounts[global.TaddrNdx],
             metaKeys: corsia_ExampleKvps.map(p => p.k),
           metaValues: corsia_ExampleKvps.map(p => p.v),
        });

        const batchBefore = await stm.getSecTokenBatch(batchId);

        const testKey = corsia_ExampleKvps[0].k, testValue = corsia_ExampleKvps[0].v;
        try {
            await stm.addMetaSecTokenBatch(batchId, testKey, testValue);
        } catch (ex) {
            assert(ex.reason == 'Duplicate key', `unexpected: ${ex.reason}`);
            return;
        }
        assert.fail('expected contract exception');
    });

    async function mintBatchWithMetadata({ tokenType, qtyUnit, qtySecTokens, receiver, metaKeys, metaValues }) {
        const mintTx = await stm.mintSecTokenBatch(tokenType, qtyUnit, qtySecTokens, receiver, CONST.nullFees, 0, metaKeys, metaValues, { from: accounts[0] });

        const batchId = (await stm.getSecTokenBatch_MaxId.call()).toNumber();
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
