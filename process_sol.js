const envFile = require('path').resolve(__dirname, "./.env." + (process.env.INSTANCE_ID !== undefined ? (process.env.INSTANCE_ID) : ''));
require('dotenv').config( { path: envFile });

const chalk = require('chalk');
const path = require('path'), fs = require('fs'), readline = require('readline');

//
// Pre-processes Solidity source files
//      e.g. `node process_sol`                                  => recurse all .sol files and process
//      e.g. `node process_sol StTransferable.sol`               => find & process StTransferable.sol
//      e.g. `node process_sol StTransferable.sol StPayable.sol` => find & process StTransferable.sol, StPayable.sol
//
(async function () {
    console.log(`${chalk.blue.bgWhite("PROCESS_SOL")}`, chalk.dim(process.argv.join(',')));
    const processFileNames = process.argv.slice(2);
    switch (process.env.CONTRACT_TYPE) {
        case 'COMMODITY':
        case 'CASHFLOW_CONTROLLER': console.log(`${chalk.blue.bgWhite('PS')} ` + chalk.inverse(`Processing Solidity files for CONTRACT_TYPE=Commodity`)); break;
        default: console.log(`${chalk.blue.bgWhite('PS')} ` + chalk.red.bold.inverse(`Unknown or unsupported CONTRACT_TYPE (${process.env.CONTRACT_TYPE})`)); process.exit(1);
    }
    if (processFileNames.length > 0) console.log(`${chalk.blue.bgWhite('PS')} ` + chalk.inverse('processFileNames: '), processFileNames.join(','));
    
    await recursePath('./', '.sol', async (filePath) => {
        const fileName = path.parse(filePath).base;
        if (!(processFileNames.length === 0 || processFileNames.includes(fileName))) return;

        console.log(`${chalk.blue.bgWhite('PS')} ` + chalk.inverse(`${filePath}...`));
        console.group();
        const readStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity
        });
        for await (const line of rl) {
            //console.log(`${chalk.blue.bgWhite('PS')} [${fileName}] ${line}`);
        }
        console.groupEnd();
    });
    console.log(`${chalk.blue.bgWhite('PS')} done processing .sol files`);

    process.exit();
})();

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

