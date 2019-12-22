require('dotenv').config();
const MNEMONIC = require('./dev_mnemonic.js').MNEMONIC;

const shell = require('shelljs');
const PORT = 8545;
const TOTAL_ACCOUNTS = 888;
const { NETWORK_ID } = process.env;

// ropsten limit: 8m
// mainnet limit: ~10m
// ganache default limit: 6m
const command = `ganache-cli --port ${PORT} --accounts ${TOTAL_ACCOUNTS} --networkId ${NETWORK_ID} --mnemonic "${MNEMONIC}" --gasLimit 7800000`;

shell.echo(`Run: ${command}`);

if (shell.exec(command).code !== 0) {
  shell.echo('Error: ganache-cli failed');
  shell.exit(1);
}


