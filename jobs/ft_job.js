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

    CONST.consoleOutput(false);

    const TakePay = require('./ft_settler').TakePay;
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
    const test_shortPosIds = [];
    for (let T=0 ; T < MAX_T; T++) { // for time T
        console.log('-');
        console.log(chalk.inverse(` >> T=${T} << `));
        // PHASE (1) - process TAKE/PAY (all futures, all positions)
        for (let ft of ctx) {
            console.group();

            const MP = ft.data.refs[T]; // mark price
            console.log(chalk.dim(`ftId=${ft.ftId}, MP=${MP}...`));
            
            // test - process actions
            await processTestContext(ft, T, test_shortPosIds);
            
            // main - process take/pay for all positions on this future
            await TakePay(ft.ftId, MP, test_shortPosIds);

            console.groupEnd();
        }

        // PHASE (2) - process POS_COMBINE (all futures, all positions)
        //  (TX's contingent: we decide if we need combine)
        //...

        // TODO: --> want a second FT to test account-level liquidation...

        // PHASE (3) - PROCESS LIQUIDATE (all futures, all positions)
        //  by account-level liquidation trigger (i.e. net/total physical bal < reserved bal)
        //  (TX's contingent: we decide if we need to liquidate)
        //...
    }

    process.exit();
})();

async function processTestContext(ft, T, test_shortPosIds) {
    const O = await CONST.getAccountAndKey(0);
    const TEST_PARTICIPANTS = ft.data.TEST_PARTICIPANTS;

    // process ctx deposits
    for (let p of TEST_PARTICIPANTS) {
        const ccy_deposit = p.ccy_deposits[T];
        if (ccy_deposit.a) {
            console.log(chalk.blue.dim(`TEST_PARTICIPANT: ID=${p.id}, account=${p.account}`) + chalk.blue(` ** DEPOSIT ** `), ccy_deposit);
            await CONST.web3_tx('fund', [ CONST.ccyType.USD, ccy_deposit.a, p.account ], O.addr, O.privKey);
        }
    }
    
    // process ctx withdraws
    for (let p of TEST_PARTICIPANTS) {
        const ccy_withdraw = p.ccy_withdraws[T];
        if (ccy_withdraw.a) {
            console.log(chalk.blue.dim(`TEST_PARTICIPANT: ID=${p.id}, account=${p.account}`) + chalk.blue(` ** WITHDRAW ** `), ccy_withdraw);
            await CONST.web3_tx('withdraw', [ CONST.ccyType.USD, ccy_withdraw.a, p.account ], O.addr, O.privKey);
        }
    }

    // todo: ...extend for minting, burning & spot trades

    // process ctx new futures positions
    for (let p of TEST_PARTICIPANTS) {
        const ft_long = p.ft_longs[T];
        if (ft_long.q) {
            console.log(chalk.blue.dim(`TEST_PARTICIPANT: ID=${p.id}, account=${p.account}`) + chalk.blue(` ** OPEN FUTURES POSITION ** `), ft_long);
            const shortAccount = TEST_PARTICIPANTS.find(p => p.id == ft_long.cid).account;
            //const a_before = await CONST.web3_call('getLedgerEntry', [ p.account ]);
            //const b_before = await CONST.web3_call('getLedgerEntry', [ shortAccount ]);
            //console.log('a_before.ccys', a_before.ccys[0]);
            //console.log('b_before.ccys', b_before.ccys[0]);

            // todo - grab shortFtId (restrict to that for test mode...)
            const { txHash, receipt, evs } = await CONST.web3_tx('openFtPos', [{
                tokTypeId: ft.ftId, ledger_A: p.account, ledger_B: shortAccount, qty_A: ft_long.q, qty_B: ft_long.q * -1, price: ft_long.p
            }], O.addr, O.privKey);
            //console.log('ev... shortStId:', evs.find(p => p.event == 'FutureOpenInterest').returnValues.shortStId); // ## stack too deep for shortStId
            const shortStId = Number(await CONST.web3_call('getSecToken_countMinted', [])) - 1;
            test_shortPosIds.push(shortStId);
            //console.log(chalk.blue.dim(`TEST_PARTICIPANT: ID=${p.id}, account=${p.account}`) + chalk.blue(` (TEST POSID [SHORT] = ${shortStId}) `), shortStId);

            //const a_after = await CONST.web3_call('getLedgerEntry', [ p.account ]);
            //const b_after = await CONST.web3_call('getLedgerEntry', [ shortAccount ]);
            //console.log('a_after.ccys', a_after.ccys[0]);
            //console.log('a_after.ccys', a_after.ccys[0]);
        }
    }
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
             feePerContract: 300, // $3.00
             initMarginBips: 1000, // 10%
              varMarginBips: 1000, // 10%
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
               [ 100,               101,               102,               103,               104,               105,               106,                107,                108 ], 

TEST_PARTICIPANTS: [ // test participants
{ 
           id: 1, account: freshAccounts[i++],
 ccy_deposits: [ {a:+20300},        {},                {},                {},                {},                {},                {},                 {},                 {} ], 
ccy_withdraws: [ {a:+0000},         {},                {},                {},                {},                {},                {},                 {},                 {} ], 
     ft_longs: [ {q:1,cid:2,p:100}, {},                {},                {},                {},                {},                {},                 {},                 {} ],
  //ft_shorts: [ {},                {},                {},                {},                {},                {},                {},                 {},                 {} ],
},
{ 
           id: 2, account: freshAccounts[i++],
 ccy_deposits: [ {a:+20300},        {},                {},                {},                {},                {},                {},                 {},                 {} ],
ccy_withdraws: [ {a:+0000},         {},                {},                {},                {},                {},                {},                 {},                 {} ], 
     ft_longs: [ {},                {},                {},                {},                {},                {},                {},                 {},                 {} ],
}
]
    
        }
    }];
    }
    else throw('Unknown testmode');
}
