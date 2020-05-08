require('dotenv').config();
const { getAccountAndKey, web3_call, web3_tx } = require('./const.js');

process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

//
// Initializes the contract with default values, whitelists and seals
//
(async function () {
    let x = await getAccountAndKey(0);
    OWNER = x.addr;
    OWNER_privKey = x.privKey;

    // initialize contract default values
    await require('./devSetupContract.js').setDefaults();

    // whitelist & seal contract
    const contractSealed = await web3_call('getContractSeal', []);
    console.log('contractSealed: ', contractSealed);
    if (!contractSealed) {
        const WHITELIST_COUNT = Number(process.env.WHITELIST_COUNT || 30);
        console.group('WHITELISTING...');
        const wl = await web3_call('getWhitelist', []);
        
        for (let i = 0; i < WHITELIST_COUNT; i++) {
            // note - we include account[0] owner account in the whitelist
            x = await getAccountAndKey(i);
            if (!wl.map(p => p.toLowerCase()).includes(x.addr.toLocaleLowerCase())) {
                await web3_tx('whitelistMany', [[x.addr]], OWNER, OWNER_privKey);
            }
            else {
                console.log(`skipping ${x.addr} (already in WL)...`);
            }
        }
        console.groupEnd();
        console.group('SEALING...');
        await web3_tx('sealContract', [], OWNER, OWNER_privKey);
        console.groupEnd();
    }

    process.exit();
})();
