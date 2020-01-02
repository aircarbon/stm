require("dotenv").config();
const CONST = require('./const.js');

//const { Core, Ledger } = require("../core/dist");
//const { db } = require("../common/dist");

//const NETWORK_ID = Number(process.env.NETWORK_ID || 888);
//const CONTRACT_NAME = process.env.CONTRACT_NAME || CONST.contractProps.CASHFLOW.contractName;
//const CONTRACT_VERSION = process.env.CONTRACT_VERSION || CONST.contractProps.CASHFLOW.contractVer;
process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

(async function() {
  var x;
  x = await CONST.getAccountAndKey(0);
  OWNER = x.addr; OWNER_privKey = x.privKey;

  const contractSealed = await CONST.web3_call('getContractSeal', []);
  console.log('contractSealed: ', contractSealed);
  if (!contractSealed) {
    const WHITELIST_COUNT = 10;
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

  // const record = await db.GetDeployment(
  //   NETWORK_ID,
  //   CONTRACT_NAME,
  //   CONTRACT_VERSION
  // );
  // const { recordset } = record;
  // const [contract] = recordset || [];
  // const abi = JSON.parse(contract.abi);
  // const address = contract.addr;
  // const core = new Core(NETWORK_ID);
  // const ledger = new Ledger(core.web3, {
  //   abi,
  //   address,
  //   rootAccount: Core.rootAccount
  // });
  // const accounts = await core.accounts;
  // const LIMIT = 10;
  // let counter = 0;
  // for await (const account of accounts) {
  //   console.log(`>> adding ${account} to whitelist...`);
  //   try {
  //     await ledger.whitelistAddress(account);
  //   } catch (error) {
  //     console.warn(`WARN: failed to add to whitelist ${account}`); //, { error });
  //   }
  //   counter += 1;
  //   if (counter > LIMIT) {
  //     break;
  //   }
  // }
  // console.warn(">> sealing contract...");
  // await ledger.sealContract();

  process.exit();
})();
