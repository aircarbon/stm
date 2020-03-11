require("dotenv").config();
const { getAccountAndKey, web3_call, web3_tx } = require('./const.js');

process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

(async function() {
  let x = await getAccountAndKey(0);
  OWNER = x.addr; OWNER_privKey = x.privKey;

  const contractSealed = await web3_call('getContractSeal', []);
  console.log('contractSealed: ', contractSealed);
  if (!contractSealed) {
    const WHITELIST_COUNT = 50;
    console.group('WHITELISTING...');
    for (let i=0 ; i < WHITELIST_COUNT ; i++) { // note - we include account[0] owner account in the whitelist
      x = await getAccountAndKey(i);
      await web3_tx('whitelist', [ x.addr ], OWNER, OWNER_privKey);
    }
    console.groupEnd();

    console.group('SEALING...');
    await web3_tx('sealContract', [], OWNER, OWNER_privKey);
    console.groupEnd();
  }

  process.exit();
})();
