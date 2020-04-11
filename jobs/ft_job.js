require('dotenv').config();

const _ = require('lodash');
const chalk = require('chalk');
const { DateTime } = require('luxon');

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

var ledgerOwners, accounts;
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
    else { throw('Live mode - TODO'); } // TODO: live mode: fetch single reference price here, for each future (no participant test data)
    
    // get all FT types (??)
    // const tts = await CONST.web3_call('getSecTokenTypes', []);
    // if (!tts) throw('Failed to get token types');
    // const fts = tts.tokenTypes.filter(p => p.settlementType == CONST.settlementType.FUTURE);
    // if (!fts || fts.length == 0) { throw('No FUTURE token types'); }
    // console.log(`Processing for ${fts.length} FT tok-types...`);

    // execute context
    const MAX_T = ctx[0].data.refs.length;
    for (let T=0 ; T < MAX_T; T++) {
        for (let ft of ctx) {
            const MP = ft.data.refs[T];
            console.log(chalk.inverse(`>> T=${T}, ftId=${ft.ftId}: MP=${MP}...`));
            
            await processTestContext(ft.data.TEST_PARTICIPANTS, T);
            
            // main - process
            await ftm(ft.ftId, MP);
        }
    }
    
    process.exit();
})();

async function processTestContext(TEST_PARTICIPANTS, T) {
    console.group();
    console.log(`(setup test actions for T=${T}...)`);

    // process ctx deposits
    for (let p of TEST_PARTICIPANTS) {
        const ccy_deposit = p.ccy_deposits[T];
        if (ccy_deposit.a) {
            console.log(chalk.yellow.dim(`TEST_PARTICIPANT: ID=${p.id}, account=${p.account}`) + chalk.yellow(` ** DEPOSIT ** `), ccy_deposit);
            //...
        }
    }

    // process ctx futures
    for (let p of TEST_PARTICIPANTS) {
        const ft_long = p.ft_longs[T];
        if (ft_long.q) {
            console.log(chalk.yellow.dim(`TEST_PARTICIPANT: ID=${p.id}, account=${p.account}`) + chalk.yellow(` ** OPEN FUTURE POSITION ** `), ft_long);
            // find/lookup counterparty...s
            //...
        }
    }

    // TODO: extend to withdraws
    // TODO: extend to spot buys/sells (concurrent positions)
    
    console.groupEnd();
}

// inits & returns a test sequence
// todo - extend/prove to different types of futures (concurrent positions)
async function initTestMode(testMode) {
    console.log('initTestMode...');
    const O = await CONST.getAccountAndKey(0);
    accounts = [];
    for (let x = 0; x < 100 ; x++) {
        const A = await CONST.getAccountAndKey(x);
        accounts.push(A.addr);
    }

    // init - WL & seal, and demand empty contract
    if (!await CONST.web3_call('getContractSeal', [])) {
        const wl = [];
        for (let whiteNdx = 0; whiteNdx < 15; whiteNdx++) {
            wl.push((await CONST.getAccountAndKey(whiteNdx)).addr);
        }
        
        await CONST.web3_tx('whitelistMany', [ wl ], O.addr, O.privKey);
        await CONST.web3_tx('sealContract', [], O.addr, O.privKey);
    }
    var fts = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.filter(p => p.settlementType == CONST.settlementType.FUTURE);
    //if (fts.length > 0) throw('Test mode requires an empty contract');

    // init - define FTs (todo: extend >1 type)
    const TEST_FT_1 = `FTJOB_USD_1`;
    if (!fts.find(p => p.name == TEST_FT_1)) {
        await CONST.web3_tx('addSecTokenType', [ TEST_FT_1, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
            expiryTimestamp: DateTime.local().plus({ days: 30 }).toMillis(),
            underlyerTypeId: CONST.tokenType.CORSIA,
                   refCcyId: CONST.ccyType.USD,
               contractSize: 1000,
        }], O.addr, O.privKey);
    } else console.log(`${TEST_FT_1} future already present; nop.`);
    fts = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.filter(p => p.settlementType == CONST.settlementType.FUTURE);

    // init - get entire ledger (for allocation of clean/unused accounts to test participants)
    ledgerOwners = await CONST.web3_call('getLedgerOwners', []);
    const freshAccounts = _.differenceWith(accounts, ledgerOwners, (a,b) => a.toLowerCase() == b.toLowerCase());
    if (freshAccounts.length == 0) throw ('Insufficient fresh test accounts: deploy the contract');
    // console.log('accounts', accounts);
    // console.log('ledgerOwners', ledgerOwners);
    //console.log(`${testMode} - freshAccounts`, freshAccounts);

    // init - define test data series, and test FTs
    var i=0;
    if (testMode == "TEST_1") { // single FT, single pos-pair
        return [ {
        ftId: fts.find(p => p.name == TEST_FT_1).id.toString(), data: {
            
refs: // FT - underlyer settlement prices
              [ 1.0,               1.1,               1.2,               1.3,               1.4,               1.5,               1.6,               1.7,                 1.8 ], 

TEST_PARTICIPANTS: [ // test participants
{ 
          id: 1, account: freshAccounts[i++],
ccy_deposits: [ {a:+1000},         {},                {},                {},                {},                {},                {},                 {},                 {} ], 
    ft_longs: [ {q:1,cid:2,p:1.0}, {},                {},                {},                {},                {},                {},                 {},                 {} ],
   ft_shorts: [ {},                {},                {},                {},                {},                {},                {},                 {},                 {} ],
},
{ 
          id: 2, account: freshAccounts[i++],
ccy_deposits: [ {a:+1000},         {},                {},                {},                {},                {},                {},                 {},                 {} ],
    ft_longs: [ {},                {},                {},                {},                {},                {},                {},                 {},                 {} ],
   ft_shorts: [ {q:1,cid:1,p:1.0}, {},                {},                {},                {},                {},                {},                 {},                 {} ],
}
]
    
        }
    }];
    }
    else throw('Unknown testmode');
}
