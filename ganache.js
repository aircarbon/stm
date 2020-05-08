require('dotenv').config();
const MNEMONIC = require('./DEV_MNEMONIC.js').MNEMONIC;

const shell = require('shelljs');
const PORT = 8545;
const TOTAL_ACCOUNTS = 1024;
const { NETWORK_ID } = process.env;

// ropsten limit: 8m
// mainnet limit: ~10m
// ganache default limit: 6m
const command =
`ganache-cli --port ${PORT} \
--accounts ${TOTAL_ACCOUNTS} \
--networkId ${NETWORK_ID} \
--mnemonic "${MNEMONIC}" \
--gasLimit 7984363 \
--defaultBalanceEther 1000000000`
;
//--allowUnlimitedContractSize` // https://ethereum.stackexchange.com/questions/63426/running-out-of-gas-during-a-deploy-due-to-a-large-number-of-require-statements

shell.echo(`Run: ${command}`);

if (shell.exec(command).code !== 0) {
  shell.echo('Error: ganache-cli failed');
  shell.exit(1);
}


