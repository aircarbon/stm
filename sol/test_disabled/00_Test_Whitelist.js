// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StErc20.sol => Erc20Lib.sol
const st = artifacts.require('StMaster');
const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;
    const WHITELIST_COUNT = 20;
    const WHITELIST_RESERVED_COUNT = 10; // the contract reserves the first ten addresses for internal/test/exchange use
    const ALLOCATABLE_COUNT = WHITELIST_COUNT - WHITELIST_RESERVED_COUNT;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
    });

    // -- ORDERED TESTS --

    it(`whitelist - should be able to add whitelist addresses`, async () => {
        // whitelist (exchange-controlled accounts) all accounts up to graylist test start
        var totalCostUsd = 0;
        await stm.whitelistMany(accounts.slice(0,WHITELIST_COUNT));
        global.TaddrNdx += WHITELIST_COUNT;
        //console.log('TOTAL COST USD $: ', totalCostUsd.toFixed(2)); // 50 = $10 one by one

        const whitelist = await stm.getWhitelist();
        // console.log(`*** WHITELIST ***\n`, whitelist);
    });

    // whitelist & retrieve-next: owner-only & read-only 
    it(`whitelist - should not allow non-owner to add a whitelist address`, async () => {
        try { await stm.whitelistMany([accounts[WHITELIST_COUNT]], { from: accounts[10] }); } catch (ex) {
            assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`); return;
        }
        assert.fail('expected contract exception');
    });
    // it(`whitelist - retrieve next - should not allow non-owner to increment next whitelist address`, async () => {
    //     try { await stm.incWhitelistNext({ from: accounts[10] }); } catch (ex) {
    //         assert(ex.reason == 'Restricted', `unexpected: ${ex.reason}`); return;
    //     }
    //     assert.fail('expected contract exception');
    // }); 
    // it(`whitelist - retrieve next - should not allow increment of next whitelist address when contract is read only`, async () => {
    //     try { 
    //         await stm.setReadOnly(true, { from: accounts[0] });
    //         await stm.incWhitelistNext();
    //     } catch (ex) {
    //         await stm.setReadOnly(false, { from: accounts[0] });
    //         assert(ex.reason == 'Read-only', `unexpected: ${ex.reason}`);
    //         return;
    //     }
    //     await stm.setReadOnly(false, { from: accounts[0] });
    //     assert.fail('expected contract exception');
    // }); 

    // retrieve-next: not sealed
    // it(`whitelist - retrieve next - should not be able to retrieve (1) next whitelist address if contract is not sealed`, async () => {
    //     try { await stm.getWhitelistNext.call(); } catch (ex) {
    //         assert(ex.toString().includes('Contract is not sealed'), `unexpected: ${ex.toString()}`); return;
    //     }
    //     assert.fail('expected contract exception');
    // }); 
    // it(`whitelist - retrieve next - should not be able to increment (2) next whitelist address if contract is not sealed`, async () => {
    //     try { await stm.incWhitelistNext(); } catch (ex) {
    //         assert(ex.reason == 'Contract is not sealed', `unexpected: ${ex.reason}`); return;
    //     }
    //     assert.fail('expected contract exception');
    // });

    // whitelist: already added
    it(`whitelist - should not be able to add already whitelisted address`, async () => {
        try { await stm.whitelistMany([accounts[0]]); } catch (ex) {
            assert(ex.reason == 'Already whitelisted', `unexpected: ${ex.reason}`); return;
        }
        assert.fail('expected contract exception');
    });

    // retrieve-next pointer at correct initial value
    // it(`whitelist - retrieve next - should reserve the first n whitelist address(es)`, async () => {
    //     const wlNdx = await stm.getWhitelistNextNdx();
    //     console.log(`wlNdx: ${wlNdx}`);
    //     assert(wlNdx == 10, 'Unexpected whitelist next index');
    // });

    // seal
    it(`whitelist - should be able to seal the whitelist`, async () => {
        const sealTx = await stm.sealContract();
        //console.log('*** WHITELIST SEALED *** tx=', sealTx.tx);
    });

    // retrieve-next up to max
    // it(`whitelist - retrieve next - should be able to retrieve up to maximum whitelisted address`, async () => {
    //     for (var i=0 ; i < ALLOCATABLE_COUNT ; i++) {
    //         const wl = await stm.getWhitelistNext();
    //         await stm.incWhitelistNext();
    //         //console.log(`wl: ${wl} - accounts[i]: ${accounts[i]}`);
    //         assert(wl.toLowerCase() == accounts[i + WHITELIST_RESERVED_COUNT].toLowerCase(), 'Unexpected whitelist address from contract');
    //     }
    // });
    // it(`whitelist - retrieve next - should not be able to retrieve (1) beyond maximum whitelisted address`, async () => {
    //     try { await stm.getWhitelistNext(); } catch (ex) {
    //         assert(ex.toString().includes('Insufficient whitelist entries'), `unexpected: ${ex.toString()}`); return;
    //     }
    //     assert.fail('expected contract exception');
    // });
    // it(`whitelist - retrieve next - should not be able to increment (2) beyond maximum whitelisted address`, async () => {
    //     try { await stm.incWhitelistNext(); } catch (ex) {
    //         assert(ex.reason == 'Insufficient whitelist entries', `unexpected: ${ex.reason}`); return;
    //     }
    //     assert.fail('expected contract exception');
    // });

    // whitelist: disallow after sealing
    it(`whitelist - should not be able to add to whitelist after sealing`, async () => {
        try { await stm.whitelistMany([accounts[WHITELIST_COUNT]]); } catch (ex) {
            assert(ex.reason == 'Contract is sealed', `unexpected: ${ex.reason}`); return;
        }
        assert.fail('expected contract exception');
    });
});