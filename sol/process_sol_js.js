// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

const CONST = require('./const.js');

const envFile = require('path').resolve(__dirname, "./.env." + (process.env.INSTANCE_ID !== undefined ? (process.env.INSTANCE_ID) : ''));
require('dotenv').config( { path: envFile });

const chalk = require('chalk');
const path = require('path'), fs = require('fs'), readline = require('readline');

//
// Pre-processes Solidity source files
//      e.g. `node process_sol_js`                                  => recurse all .sol files and process
//      e.g. `node process_sol_js StTransferable.sol`               => find & process StTransferable.sol
//      e.g. `node process_sol_js StTransferable.sol StPayable.sol` => find & process StTransferable.sol, StPayable.sol, etc.
//
var processFileNames;
const thisScriptFile = path.basename(__filename);

(async function () {
    console.log(`${chalk.blue.bgWhite("PROCESS_SOL_JS")}`, chalk.dim(process.argv.join(',')));
    processFileNames = process.argv.slice(2);
    switch (process.env.CONTRACT_TYPE) {
        case 'COMMODITY':
        case 'CASHFLOW_CONTROLLER':
        case 'CASHFLOW_BASE': console.log(`${chalk.blue.bgWhite('PSJS')} ` + `Processing .sol & .js files for ` + chalk.inverse(`CONTRACT_TYPE=${process.env.CONTRACT_TYPE}`)); break;
        default: console.log(`${chalk.blue.bgWhite('PSJS')} ` + chalk.red.bold.inverse(`Unknown or unsupported CONTRACT_TYPE (${process.env.CONTRACT_TYPE})`)); process.exit(1);
    }
    if (processFileNames.length > 0) console.log(`${chalk.blue.bgWhite('PSJS')} ` + chalk.inverse('processFileNames: '), processFileNames.join(','));

    
    // find .sol files
    await recursePath('./', '.sol', async (filePath) => await processFile(filePath));
    await recursePath('./', '.js', async (filePath) => await processFile(filePath));
    console.log(`${chalk.blue.bgWhite('PSJS')} done processing .sol & .js files`);

    process.exit();
})();

async function processFile(filePath) {
    const writeFilePath = filePath + '_OUT';
    
    // scan source file; skip if possible
    const readFileName = path.parse(filePath).base;
    if (filePath.includes("node_modules")) return;
    if (!(processFileNames.length === 0 || processFileNames.includes(readFileName))) return;
    if (readFileName.includes('_OUT')) return;
    if (readFileName === thisScriptFile) return;
    
    const readFileContent = fs.readFileSync(filePath);
    if (!readFileContent.includes(`//#if`)) { /*console.log(`${chalk.blue.bgWhite('PSJS')} ` + chalk.dim(`${filePasolth}; nop...`));*/ return; }
    
    const writeFileName = path.parse(writeFilePath).base;
    console.log(`${chalk.blue.bgWhite('PSJS')} ` + chalk.inverse(`${filePath}...`));
    console.group();

    // open read stream, nuke dest file
    const readStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({input: readStream, crlfDelay: Infinity });
    var writing = true;
    if (fs.existsSync(writeFilePath)) {
        fs.unlinkSync(writeFilePath);
    }

    // read source lines
    for await (var line of rl) {
        if (line.startsWith(`//#if `)) { // apply conditions
            const expr = line.substr(6);
            const evalResult = eval(expr);
            writing = evalResult;
            console.log(`${chalk.blue.bgWhite('PSJS')} R [${readFileName}] ${chalk.magenta(line)} ` + chalk.dim('writing'), writing);
            fs.appendFileSync(writeFilePath, `${line}\r\n`);
        }
        else { // conditionally write dest file
            if (line.startsWith(`//#endif`)) { // clear conditions
                writing = true;
                console.log(`${chalk.blue.bgWhite('PSJS')} R [${readFileName}] ${chalk.magenta(line)} ` + chalk.dim('writing'), writing);
            }

            if (writing) {
                if (line.startsWith('//# ')) line = line.substring(4);
                fs.appendFileSync(writeFilePath, `${line}\r\n`);
            }
            else {
                if (!line.startsWith('//# ')) line = `//# ${line}`;
                fs.appendFileSync(writeFilePath, `${line}\r\n`);
            }
        }
    }

    // replace source w/ dest file
    fs.copyFileSync(writeFilePath, filePath);
    fs.unlinkSync(writeFilePath);
    console.groupEnd();
}

async function recursePath(startPath, filter, callback) {
    if (!fs.existsSync(startPath)) {
        return;
    }

    var files = fs.readdirSync(startPath);
    for(var i = 0; i < files.length; i++) {
        var filename = path.join(startPath, files[i]);
        var stat = fs.lstatSync(filename);
        if (stat.isDirectory()) {
            await recursePath(filename, filter, callback);
        }
        else if (filename.indexOf(filter) >= 0 && !filename.startsWith('.')) {
            await callback(filename);
        };
    };
};

