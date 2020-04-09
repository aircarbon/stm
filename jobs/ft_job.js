require('dotenv').config();

const _ = require('lodash');
const chalk = require('chalk');

const { db } = require('../../common/dist');
const CONST = require('../const.js');

//
// FUTURES POSITIONS SETTLEMENT/MAINTENANCE
//

//process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

//
// >> RUN FROM ./ERC20 << (not from ./jobs - config will fail if so)
//
//         Dev: ("export WEB3_NETWORK_ID=888 && node ./ft.js")
//  Ropsten AC: ("export WEB3_NETWORK_ID=3 && node ./ft.js")
//
(async () => {
    //
    // needs param: TEST_MODE
    //   when set, it (1) creates FT types (throws if not virgin state) and (2) iterates over ftm() with TEST time series data for each FT
    //   (todo: when not set, it runs exactly one ftm() pass per FT [todo later - will need a reference data source])
    //

    const ftm = require('./ft_settler').FT_Maintain;
    var ctx;

    // startup
    console.log(`$$$ ${chalk.blue.bgWhite("FT_JOB")} $$$`, chalk.dim(process.argv.join(',')));
    if (!(await CONST.web3_call('name', []))) throw('Failed to validated contract by name. Aborting.');
    if ((await CONST.web3_call('getContractType', [])) != CONST.contractType.COMMODITY) throw('Failed to validated contract type. Aborting.');

    // setup context
    if (process.argv.length != 3) throw('Bad parameters');
    const MODE = process.argv[2].toUpperCase();
    if (MODE.startsWith("TEST")) {
        ctx = await initTestMode(MODE);
    }
    else { ctx = { refs: [-1,] }; throw('Live mode - TODO'); } // TODO: live mode: fetch single reference price here
    
    // get all FT types
    const tts = await CONST.web3_call('getSecTokenTypes', []);
    if (!tts) throw('Failed to get token types');
    
    const fts = tts.filter(p => p.settlementType == CONST.settlementType.FUTURE);
    if (!fts || fts.length == 0) { throw('No FUTURE token types'); }
    console.log(`Processing for ${fts.length} FT tok-types...`);
    //console.dir(fts);
    
    await ftm();
    process.exit();
})();

// inits & returns a test sequence - v1: single FT product
// todo - extend to different types of futures (concurrent positions)
// todo - extend to spot buys/sells (concurrent positions)
// todo - extend to deposits & withdraws
async function initTestMode(testMode) {
    console.log('initTestMode...');

    // seal & WL
    if (!await CONST.web3_call('getContractSeal', [])) {
        const O = await CONST.getAccountAndKey(0);
        const wl = [];
        for (let whiteNdx = 0; whiteNdx < 10; whiteNdx++) {
            wl.push((await CONST.getAccountAndKey(whiteNdx)).addr);
        }
        await CONST.web3_tx('whitelistMany', [ wl ], O.addr, O.privKey);
        await CONST.web3_tx('sealContract', [], O.addr, O.privKey);
    }

    const fts = (await CONST.web3_call('getSecTokenTypes', [])).filter(p => p.settlementType == CONST.settlementType.FUTURE);
    if (fts.length > 0) throw('Test mode requires an empty contract');

    if (testMode == "TEST_1") {
        return {
            refs: [ 1.0, 1.1, 1.2, 1.3, 1,4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0 ], // reference prices
              P1: [ +1,  +0,  +0,  +0,  +0,  +0,  +0,  +0,  +0,  +0,  +0  ]  // participant buy/sell (counterparty P2 is implied)
        }
    }
    else throw('Unknown testmode');
}
