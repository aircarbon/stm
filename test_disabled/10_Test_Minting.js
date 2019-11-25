const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;

    beforeEach(async () => {
        stm = await st.deployed();
        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`global.accountNdx: ${global.accountNdx} - contract @ ${stm.address} (owner: ${accounts[0]}) - getSecTokenBatchCount: ${(await stm.getSecTokenBatchCount.call()).toString()}`);
    });

    it('minting - should allow owner to mint a single-vEEU batch', async () => {
        await mintBatch({ tokenType: CONST.tokenType.UNFCCC, qtyUnit: CONST.ktCarbon * 100, qtySecTokens: 1, receiver: accounts[global.accountNdx], }, { from: accounts[0] });
    });

    //it('minting - should allow owner to mint a multi-vEEU (2) batch', async () => {
    //    await mintBatch({ tokenType: CONST.tokenType.UNFCCC, qtyUnit: CONST.ktCarbon * 100, qtySecTokens: 2, receiver: accounts[global.accountNdx], },{ from: accounts[0] });
    //});

    it('minting - should allow owner to mint a minimum-sized token (one ton)', async () => {
        await mintBatch({ tokenType: CONST.tokenType.UNFCCC, qtyUnit: CONST.tonCarbon * 1, qtySecTokens: 1, receiver: accounts[global.accountNdx], }, { from: accounts[0] });
    });

    it('minting - should allow owner to mint a megatoken (10 gigatons)', async () => {
        await mintBatch({ tokenType: CONST.tokenType.UNFCCC, qtyUnit: CONST.gtCarbon * 10, qtySecTokens: 1, receiver: accounts[global.accountNdx], }, { from: accounts[0] });
    });

    it('minting - should allow owner to mint different vEEU-types', async () => {
        await mintBatch({ tokenType: CONST.tokenType.UNFCCC, qtyUnit: CONST.ktCarbon * 100, qtySecTokens: 1, receiver: accounts[global.accountNdx], }, { from: accounts[0] });
        await mintBatch({ tokenType: CONST.tokenType.VCS, qtyUnit: CONST.ktCarbon * 100, qtySecTokens: 1, receiver: accounts[global.accountNdx], }, { from: accounts[0] });
    });

    it('minting - should allow minting of multiple batches to the same receiver', async () => {
        const batchIds = [];
        var totalMintedQty = 0;
        var totalMintedSecTokens = 0;
        for (var i = 0; i < 3; i++) {
            const qtyUnit = (i + 1) * 2 * CONST.tonCarbon;
            const qtySecTokens = 1;
            const batchId = await mintBatch({ tokenType: CONST.tokenType.UNFCCC, qtyUnit, qtySecTokens, receiver: accounts[global.accountNdx] }, { from: accounts[0] });
            totalMintedQty += qtyUnit;
            totalMintedSecTokens += qtySecTokens;
            batchIds.push(batchId);
        }

        var totalBatchQtyKG = 0;
        for (i = 0; i < batchIds.length; i++) {
            const batchId = batchIds[i];
            const batch = await stm.getSecTokenBatch(batchId);
            totalBatchQtyKG += Number(batch.mintedQty);
        }
        assert(totalBatchQtyKG == totalMintedQty, 'invalid total kg in minted batches');

        const ledgerEntryAfter = await stm.getLedgerEntry(accounts[global.accountNdx]);
        assert(ledgerEntryAfter.tokens.length == totalMintedSecTokens, 'invalid eeu qty in ledger entry');
    });

    it('minting - should have reasonable gas cost for minting of multi-vEEU batches', async () => {
        mintTx = await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], [], [], { from: accounts[0], });
        console.log(`\t>>> gasUsed - Mint  1 vEEU: ${mintTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * mintTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * mintTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);

        // mintTx = await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 5, accounts[global.accountNdx], { from: accounts[0], });
        // console.log(`\t>>> gasUsed - Mint  5 vEEU: ${mintTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * mintTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * mintTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);

        // var mintTx = await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.ktCarbon, 10, accounts[global.accountNdx], { from: accounts[0] });
        // console.log(`\t>>> gasUsed - Mint 10 vEEU: ${mintTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * mintTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * mintTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('minting - should not allow non-owner to mint vEEU batches', async () => {
        try {
            await stm.mintSecTokenBatch(CONST.tokenType.UNFCCC, CONST.tonCarbon, 1, accounts[global.accountNdx], [], [], { from: accounts[1], });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('minting - should not allow non-existent vEEU-type to be minted', async () => {
        try {
            await stm.mintSecTokenBatch(999, CONST.tonCarbon, 1, accounts[global.accountNdx], [], [], { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('minting - should not allow multi-vEEU minting', async () => {
        try {
            await mintBatch({ tokenType: CONST.tokenType.UNFCCC, qtyUnit: CONST.tonCarbon, qtySecTokens: 2, receiver: accounts[global.accountNdx], }, { from: accounts[0] } );
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });    

    // it('minting - should not allow non-integer KG carbon in an vEEU', async () => {
    //     try {
    //         await mintBatch({ tokenType: CONST.tokenType.UNFCCC, qtyUnit: CONST.tonCarbon, qtySecTokens: 3, receiver: accounts[global.accountNdx], }, { from: accounts[0] } );
    //     } catch (ex) { return; }
    //     assert.fail('expected restriction exception');
    // });

    it('minting - should not allow too small a tonnage', async () => {
        try {
            await mintBatch( { tokenType: CONST.tokenType.UNFCCC, qtyUnit: 0, qtySecTokens: 1, receiver: accounts[global.accountNdx] }, { from: accounts[0] } );
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('minting - should not allow invalid tonnage', async () => {
        try {
            await mintBatch( { tokenType: CONST.tokenType.UNFCCC, qtyUnit: -1, qtySecTokens: 1, receiver: accounts[global.accountNdx] }, { from: accounts[0] } );
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('minting - should not allow invalid vEEU quantities (1)', async () => {
        try {
            await mintBatch({ tokenType: CONST.tokenType.UNFCCC, qtyUnit: CONST.tonCarbon, qtySecTokens: 0, receiver: accounts[global.accountNdx], }, { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('minting - should not allow invalid vEEU quantities (2)', async () => {
        try {
            await mintBatch({ tokenType: CONST.tokenType.UNFCCC, qtyUnit: CONST.tonCarbon, qtySecTokens: -1, receiver: accounts[global.accountNdx], }, { from: accounts[0] });
        } catch (ex) {
            return;
        }
        assert.fail('expected restriction exception');
    });

    it('minting - should not allow minting when contract is read only', async () => {
        try {
            await stm.setReadOnly(true, { from: accounts[0] });
            await mintBatch({ tokenType: CONST.tokenType.UNFCCC, qtyUnit: CONST.tonCarbon, qtySecTokens: 1, receiver: accounts[global.accountNdx], }, { from: accounts[0] });
        } catch (ex) {
            await stm.setReadOnly(false, { from: accounts[0] });
            return;
        }
        await stm.setReadOnly(false, { from: accounts[0] });
        assert.fail('expected restriction exception');
    });

    async function mintBatch({ tokenType, qtyUnit, qtySecTokens, receiver }) {
        var batchId = -1;

        const ledgerEntryBefore = await stm.getLedgerEntry(receiver);
        const ledgerOwnersBefore = await stm.getLedgerOwners();

        // mint new vEEU match
        const maxBatchIdBefore = (await stm.getSecTokenBatchCount.call()).toNumber();
        const mintTx = await stm.mintSecTokenBatch(
            tokenType, 
            qtyUnit, 
            qtySecTokens, 
            receiver, 
            [], [],
        { from: accounts[0] });

        // validat batch ID
        const maxBatchIdAfter = (await stm.getSecTokenBatchCount.call()).toNumber();
        assert(maxBatchIdAfter == maxBatchIdBefore + 1, 'unexpected batch id after minting');

        // validate batch minted event
        truffleAssert.eventEmitted(mintTx, 'MintedSecTokenBatch', ev => {
            batchId = Number(ev.batchId);
            return ev.batchId == maxBatchIdAfter
                && ev.tokenTypeId == tokenType
                && ev.batchOwner == receiver
                && ev.mintQty == qtyUnit
                && ev.mintSecTokenCount == qtySecTokens
                ;
        });
        const batch = await stm.getSecTokenBatch(batchId);
        assert(batch.mintedQty == qtyUnit, 'invalid batch minted kg');
        assert(batch.tokenTypeId == tokenType, 'invalid batch eeu-type');

        // validate vEEU(s) minted events
        const curMaxSecTokenId = (await stm.getSecToken_countMinted.call()).toNumber();
        for (var eeuCount = 1; eeuCount < 1 + qtySecTokens; eeuCount++) {
            truffleAssert.eventEmitted(mintTx, 'MintedSecToken', ev => {
                //console.log(`event: MintedSecToken ev.id=${ev.id} curMaxSecTokenId=${curMaxSecTokenId}`);
                return ev.stId > curMaxSecTokenId - qtySecTokens && ev.stId <= curMaxSecTokenId
                    && ev.batchId == batchId
                    && ev.tokenTypeId == tokenType
                    && ev.ledgerOwner == receiver
                    && ev.mintedQty == qtyUnit / qtySecTokens
                    ;
            });
        }

        // validate ledger owner list
        const ledgerOwnersAfter = await stm.getLedgerOwners();
        assert(ledgerOwnersAfter.some(p => p == receiver), 'invalid ledger owners list data');

        // validate the ledger entry
        const ledgerEntryAfter = await stm.getLedgerEntry(receiver);
        assert(ledgerEntryAfter.exists == true, 'missing ledger entry for receiver');
        assert(ledgerEntryAfter.tokens.length == ledgerEntryBefore.tokens.length + qtySecTokens, 'invalid eeu qty in ledger entry');
        assert(ledgerEntryAfter.tokens.map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0) ==
               ledgerEntryBefore.tokens.map(p => p.currentQty).reduce((a,b) => Number(a) + Number(b), 0) + qtyUnit,
               'invalid kg in ledger entry eeus');
        assert(Number(ledgerEntryAfter.tokens_sumQty) == Number(ledgerEntryBefore.tokens_sumQty) + qtyUnit, 'invalid kg sum ledger entry');

        // validate EEUs minted
        for (var ndx = ledgerEntryBefore.tokens.length; ndx < ledgerEntryAfter.tokens.length; ndx++) {
            const stId = ledgerEntryAfter.tokens[ndx].stId;
            const eeu = await stm.getSecToken(stId);
            assert(eeu.exists == true, 'missing vEEU after minting');
            assert(eeu.batchId == batchId, 'unexpected vEEU batch after minting');
            assert(eeu.mintedTimestamp != 0, 'missing mint timestamp on vEEU after minting');
            assert(eeu.mintedQty == qtyUnit / qtySecTokens, 'unexpected vEEU minted KG value after minting');
            assert(eeu.currentQty == qtyUnit / qtySecTokens, 'unexpected vEEU remaining (unburned) KG value after minting');
        }

        return batchId;
    }
});
