require("dotenv").config();
const CONST = require('./const.js');

process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

(async function() {
  var x;
  x = await CONST.getAccountAndKey(0);
  OWNER = x.addr; OWNER_privKey = x.privKey;

  const contractSealed = await CONST.web3_call('getContractSeal', []);
  console.log('contractSealed: ', contractSealed);
  if (!contractSealed) {
    const WHITELIST_COUNT = 20;
    console.group('WHITELISTING...');
    for (var i=0 ; i < WHITELIST_COUNT ; i++) { // note - we include account[0] owner account in the whitelist
      x = await CONST.getAccountAndKey(i);
      const whitelistTx = await CONST.web3_tx('whitelist', [ x.addr ], OWNER, OWNER_privKey);
    }
    console.groupEnd();

    console.group('SEALING...');
    const sealTx = await CONST.web3_tx('sealContract', [], OWNER, OWNER_privKey);
    console.groupEnd();
  }

  process.exit();
})();
