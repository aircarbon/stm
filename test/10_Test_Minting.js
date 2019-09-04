const ac = artifacts.require('AcMaster');
const truffleAssert = require('truffle-assertions');
const CONST = require('../const.js');

contract('AcMaster', accounts => {
    var acm;//, global.accountNdx = 1;

    beforeEach(async () => {
        acm = await ac.deployed();
        //console.log('acm.address', acm.address);
        //const ver = await acm.version();
        //assert.equal(ver, "0.0.3", "test version");
        //const eeuCount = await acm.getEeuMintedCount.call();
        //console.log('eeuCount', eeuCount);
        
        if (!global.accountNdx) global.accountNdx = 0;
        global.accountNdx++;
        console.log(`global.global.accountNdx: ${global.accountNdx} - contract @ ${acm.address} (owner: ${accounts[0]}) - getEeuBatchCount: ${(await acm.getEeuBatchCount.call()).toString()}`);
    });

    it('minting - should allow owner to mint a single-vEEU batch', async () => {
        await mintBatch({ eeuType: CONST.eeuType.UNFCCC, qtyKG: CONST.ktCarbon * 100, qtyEeus: 1, receiver: accounts[global.accountNdx], }, { from: accounts[0] });
    });

    // it('minting - should allow owner to mint a multi-vEEU (2) batch', async () => {
    //     await mintBatch({ eeuType: CONST.eeuType.UNFCCC, qtyKG: CONST.ktCarbon * 100, qtyEeus: 2, receiver: accounts[global.accountNdx], },{ from: accounts[0] });
    // });

    it('minting - should allow owner to mint a minimum-sized token (one ton)', async () => {
        await mintBatch({ eeuType: CONST.eeuType.UNFCCC, qtyKG: CONST.tonCarbon * 1, qtyEeus: 1, receiver: accounts[global.accountNdx], }, { from: accounts[0] });
    });

    it('minting - should allow owner to mint a megatoken (10 gigatons)', async () => {
        await mintBatch({ eeuType: CONST.eeuType.UNFCCC, qtyKG: CONST.gtCarbon * 10, qtyEeus: 1, receiver: accounts[global.accountNdx], }, { from: accounts[0] });
    });

    it('minting - should allow owner to mint different vEEU-types', async () => {
        await mintBatch({ eeuType: CONST.eeuType.UNFCCC, qtyKG: CONST.ktCarbon * 100, qtyEeus: 1, receiver: accounts[global.accountNdx], }, { from: accounts[0] });
        await mintBatch({ eeuType: CONST.eeuType.VCS, qtyKG: CONST.ktCarbon * 100, qtyEeus: 1, receiver: accounts[global.accountNdx], }, { from: accounts[0] });
    });

    it('minting - should allow minting of multiple batches to the same receiver', async () => {
        const batchIds = [];
        var totalMintedKG = 0;
        var totalMintedEeus = 0;
        for (var i = 0; i < 3; i++) {
            const qtyKG = (i + 1) * 2 * CONST.tonCarbon;
            const qtyEeus = 1;
            const batchId = await mintBatch({ eeuType: CONST.eeuType.UNFCCC, qtyKG, qtyEeus, receiver: accounts[global.accountNdx] }, { from: accounts[0] });
            totalMintedKG += qtyKG;
            totalMintedEeus += qtyEeus;
            batchIds.push(batchId);
        }

        var totalBatchQtyKG = 0;
        for (i = 0; i < batchIds.length; i++) {
            const batchId = batchIds[i];
            const batch = await acm.getEeuBatch(batchId);
            totalBatchQtyKG += Number(batch.mintedKG);
        }
        assert(totalBatchQtyKG == totalMintedKG, 'invalid total kg in minted batches');

        const ledgerEntryAfter = await acm.getLedgerEntry(accounts[global.accountNdx]);
        assert(ledgerEntryAfter.eeus.length == totalMintedEeus, 'invalid eeu qty in ledger entry');
    });

    it('minting - should have reasonable gas cost for minting of multi-vEEU batches', async () => {
        mintTx = await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, accounts[global.accountNdx], { from: accounts[0], });
        console.log(`gasUsed - Mint  1 vEEU: ${mintTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * mintTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * mintTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);

        // mintTx = await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 5, accounts[global.accountNdx], { from: accounts[0], });
        // console.log(`gasUsed - Mint  5 vEEU: ${mintTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * mintTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * mintTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);

        // var mintTx = await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 10, accounts[global.accountNdx], { from: accounts[0] });
        // console.log(`gasUsed - Mint 10 vEEU: ${mintTx.receipt.gasUsed} @${CONST.gasPriceEth} ETH/gas = ${(CONST.gasPriceEth * mintTx.receipt.gasUsed).toFixed(4)} (USD ${(CONST.gasPriceEth * mintTx.receipt.gasUsed * CONST.ethUsd).toFixed(4)}) ETH TX COST`);
    });

    it('minting - should not allow non-owner to mint vEEU batches', async () => {
        try {
            await acm.mintEeuBatch(CONST.eeuType.UNFCCC, CONST.tonCarbon, 1, accounts[global.accountNdx], { from: accounts[1], });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('minting - should not allow non-existent vEEU-type to be minted', async () => {
        try {
            await acm.mintEeuBatch(999, CONST.tonCarbon, 1, accounts[global.accountNdx], { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('minting - should not allow multi-vEEU minting', async () => {
        try {
            await mintBatch({ eeuType: CONST.eeuType.UNFCCC, qtyKG: CONST.tonCarbon, qtyEeus: 2, receiver: accounts[global.accountNdx], }, { from: accounts[0] } );
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });    

    // it('minting - should not allow non-integer KG carbon in an vEEU', async () => {
    //     try {
    //         await mintBatch({ eeuType: CONST.eeuType.UNFCCC, qtyKG: CONST.tonCarbon, qtyEeus: 3, receiver: accounts[global.accountNdx], }, { from: accounts[0] } );
    //     } catch (ex) { return; }
    //     assert.fail('expected restriction exception');
    // });

    it('minting - should not allow too small a tonnage', async () => {
        try {
            await mintBatch( { eeuType: CONST.eeuType.UNFCCC, qtyKG: 999, qtyEeus: 1, receiver: accounts[global.accountNdx] }, { from: accounts[0] } );
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('minting - should not allow invalid tonnage', async () => {
        try {
            await mintBatch( { eeuType: CONST.eeuType.UNFCCC, qtyKG: -1, qtyEeus: 1, receiver: accounts[global.accountNdx] }, { from: accounts[0] } );
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('minting - should not allow invalid vEEU quantities (1)', async () => {
        try {
            await mintBatch({ eeuType: CONST.eeuType.UNFCCC, qtyKG: CONST.tonCarbon, qtyEeus: 0, receiver: accounts[global.accountNdx], }, { from: accounts[0] });
        } catch (ex) { return; }
        assert.fail('expected restriction exception');
    });

    it('minting - should not allow invalid vEEU quantities (2)', async () => {
        try {
            await mintBatch({ eeuType: CONST.eeuType.UNFCCC, qtyKG: CONST.tonCarbon, qtyEeus: -1, receiver: accounts[global.accountNdx], }, { from: accounts[0] });
        } catch (ex) {
            return;
        }
        assert.fail('expected restriction exception');
    });

    async function mintBatch({ eeuType, qtyKG, qtyEeus, receiver }) {
        var batchId = -1;

        const ledgerEntryBefore = await acm.getLedgerEntry(receiver);
        const ledgerOwnersBefore = await acm.getLedgerOwners();

        // mint new vEEU match
        const maxBatchIdBefore = (await acm.getEeuBatchCount.call()).toNumber();
        const mintTx = await acm.mintEeuBatch(eeuType, qtyKG, qtyEeus, receiver, { from: accounts[0] });

        // validat batch ID
        const maxBatchIdAfter = (await acm.getEeuBatchCount.call()).toNumber();
        assert(maxBatchIdAfter == maxBatchIdBefore + 1, 'unexpected batch id after minting');

        // validate batch minted event
        truffleAssert.eventEmitted(mintTx, 'MintedEeuBatch', ev => {
            batchId = Number(ev.batchId);
            return ev.batchId == maxBatchIdAfter
                && ev.eeuTypeId == eeuType
                && ev.batchOwner == receiver
                && ev.qtyKG == qtyKG
                && ev.qtyEeus == qtyEeus
                ;
        });
        const batch = await acm.getEeuBatch(batchId);
        assert(batch.mintedKG == qtyKG, 'invalid batch minted kg');
        assert(batch.eeuTypeId == eeuType, 'invalid batch eeu-type');

        // validate vEEU(s) minted events
        const curMaxEeuId = (await acm.getEeuMintedCount.call()).toNumber();
        for (var eeuCount = 1; eeuCount < 1 + qtyEeus; eeuCount++) {
            truffleAssert.eventEmitted(mintTx, 'MintedEeu', ev => {
                //console.log(`event: MintedEeu ev.id=${ev.id} curMaxEeuId=${curMaxEeuId}`);
                return ev.eeuId > curMaxEeuId - qtyEeus && ev.eeuId <= curMaxEeuId
                    && ev.batchId == batchId
                    && ev.eeuTypeId == eeuType
                    && ev.ledgerOwner == receiver
                    && ev.mintedKG == qtyKG / qtyEeus
                    ;
            });
        }

        // validate ledger owner list
        const ledgerOwnersAfter = await acm.getLedgerOwners();
        assert(ledgerOwnersAfter.some(p => p == receiver), 'invalid ledger owners list data');

        // validate the ledger entry
        const ledgerEntryAfter = await acm.getLedgerEntry(receiver);
        assert(ledgerEntryAfter.exists == true, 'missing ledger entry for receiver');
        assert(ledgerEntryAfter.eeus.length == ledgerEntryBefore.eeus.length + qtyEeus, 'invalid eeu qty in ledger entry');
        assert(ledgerEntryAfter.eeus.map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0) ==
               ledgerEntryBefore.eeus.map(p => p.eeuKG).reduce((a,b) => Number(a) + Number(b), 0) + qtyKG,
               'invalid kg in ledger entry eeus');
        assert(Number(ledgerEntryAfter.eeu_sumKG) == Number(ledgerEntryBefore.eeu_sumKG) + qtyKG, 'invalid kg sum ledger entry');

        // validate EEUs minted
        for (var ndx = ledgerEntryBefore.eeus.length; ndx < ledgerEntryAfter.eeus.length; ndx++) {
            const eeuId = ledgerEntryAfter.eeus[ndx].eeuId;
            const eeu = await acm.getEeu(eeuId);
            assert(eeu.exists == true, 'missing vEEU after minting');
            assert(eeu.batchId == batchId, 'unexpected vEEU batch after minting');
            assert(eeu.mintedTimestamp != 0, 'missing mint timestamp on vEEU after minting');
            assert(eeu.mintedKG == qtyKG / qtyEeus, 'unexpected vEEU minted KG value after minting');
            assert(eeu.KG == qtyKG / qtyEeus, 'unexpected vEEU remaining (unburned) KG value after minting');
        }

        return batchId;
    }
});
