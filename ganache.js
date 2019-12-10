require('dotenv').config();

const shell = require('shelljs');
const PORT = 8545;
const TOTAL_ACCOUNTS = 888;
const { NETWORK_ID } = process.env;
const MNEMONIC = 'educate school blast ability display bleak club soon curve car oil ostrich';

const command = `ganache-cli -p ${PORT} -a ${TOTAL_ACCOUNTS} --networkId ${NETWORK_ID} -m "${MNEMONIC}"`;

shell.echo(`Run: ${command}`);

if (shell.exec(command).code !== 0) {
  shell.echo('Error: ganache-cli failed');
  shell.exit(1);
}

module.exports = {
  MNEMONIC,
}
