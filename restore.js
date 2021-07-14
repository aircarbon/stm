const argv = require('yargs-parser')(process.argv.slice(2));

/**
 * Usage: `truffle exec restore.js -a=0x [--network <name>] [--compile]`,
 * @link https://github.com/trufflesuite/truffle/issues/889#issuecomment-522581580
 */
module.exports = async (callback) => {
  let name = argv?.a || '0x0000000000000000000000000000000000000000!';
  callback(`Restore ${name}`);
};
