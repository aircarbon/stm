require("dotenv").config();

const acmJSON = require("./build/contracts/StMaster.json");
const { Core, Ledger } = require("../core/dist");

const NETWORK_ID = Number(process.env.NETWORK_ID || 888);
const ADDRESS = String(
  process.env.ROOT_ACCOUNT || "0xf57B0adC78461888BF32d5FB92784CF3FC8f9956"
);

const core = new Core(NETWORK_ID);
const ledger = new Ledger(core.web3, {
  address: ADDRESS,
  abi: acmJSON.abi,
  rootAccount: Core.rootAccount
});

(async function() {
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
    if (counter > LIMIT) break;
  }

  console.warn("seal contract");
  await ledger.sealContract();
  process.exit();
})();
