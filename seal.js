require("dotenv").config();

const { Core, Ledger } = require("../core/dist");
const { db } = require("../common/dist");

const NETWORK_ID = Number(process.env.NETWORK_ID || 888);
const CONTRACT_NAME = process.env.CONTRACT_NAME || "AirCarbon_CORSIA";
const CONTRACT_VERSION = process.env.CONTRACT_VERSION || "0.91";

(async function() {
  const record = await db.GetDeployment(
    NETWORK_ID,
    CONTRACT_NAME,
    CONTRACT_VERSION
  );
  const { recordset } = record;
  const [contract] = recordset || [];
  const abi = JSON.parse(contract.abi);
  const address = contract.addr;
  const core = new Core(NETWORK_ID);
  const ledger = new Ledger(core.web3, {
    abi,
    address,
    rootAccount: Core.rootAccount
  });
  const accounts = await core.accounts;
  const LIMIT = 10;
  let counter = 0;
  for await (const account of accounts) {
    console.warn(`add ${account} to whitelist`);
    try {
      await ledger.whitelistAddress(account);
    } catch (error) {
      console.warn("something went wrong", { error });
    }
    counter += 1;
    if (counter > LIMIT) {
      console.warn("seal contract");
      await ledger.sealContract();
      break;
    }
  }
  process.exit();
})();
