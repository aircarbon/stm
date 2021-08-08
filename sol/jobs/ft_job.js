// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9
// PAUSED

const _ = require('lodash');
const chalk = require('chalk');
const { DateTime } = require('luxon');
const figlet = require('figlet')
const TCharts = require('tcharts.js'); // for tables

const  db  = require('../../orm/build');
const CONST = require('../const.js');
process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

//
// FUTURES POSITIONS SETTLEMENT/MAINTENANCE
//

//
// >> RUN FROM ./ERC20 << (not from ./jobs - config will fail if so)
//
//         Dev: ("export WEB3_NETWORK_ID=888 NETWORK_ID=888 INSTANCE_ID=local && node ./jobs/ft_job TEST_1")
//  Ropsten AC: ("export WEB3_NETWORK_ID=3 NETWORK_ID=3 INSTANCE_ID=DEV && node ./jobs/ft_job TEST_1")
//

var ledgerOwners, accounts;
(async () => {
    //
    // needs param: TEST_MODE
    //   when set, it (1) creates FT types (throws if not virgin state) and (2) iterates over ftm() with TEST time series data for each FT
    //   (todo: when not set, it runs exactly one ftm() pass per FT [todo later - will need a reference data source])
    //

    console.log(chalk.green.bold(figlet.textSync(`AirCarbon`, { horizontalLayout: 'fitted', kerning: 'default' })));
    console.log(chalk.green.bold.inverse(`${''.padStart(16)}${' FUTURES SETTLEMENT ENGINE '}${''.padEnd(16)}`));
    console.log();

    CONST.consoleOutput(false);
    const O = await CONST.getAccountAndKey(0);

    //const TakePay_v1 = require('./ft_settler_TP1').TakePay_v1;
    const TakePay_v2 = require('./ft_settler_TP2').TakePay_v2;
    const Combine = require('./ft_settler_Combine').Combine;
    var ctx;

    // startup
    console.log(`$$$ ${chalk.blue.bgWhite("FT_JOB")} $$$`, chalk.dim(process.argv.join(',')));
    if (!(await CONST.web3_call('name', []))) throw('Failed to validated contract by name. Aborting.');
    if ((await CONST.web3_call('getContractType', [])) != CONST.contractType.COMMODITY) throw('Failed to validated contract type. Aborting.');

    // setup context
    if (process.argv.length != 3) throw('Bad parameters');
    const MODE = process.argv[2].toUpperCase();
    if (MODE.startsWith("TEST")) {
        await require('../devSetupContract.js').setDefaults();
        ctx = await initTestMode(MODE);
    }
    else { throw('Live mode - TODO'); } // TODO: live mode: fetch single reference price here, for each future (no participant test data)

    // execute context
    const MAX_T = ctx[0].data.price.length;
    //const test_shortPosIds = [];
    for (let T=0 ; T < MAX_T; T++) { // for time T
        console.log('-');
        console.log(chalk.inverse(` >> T=${T} << `));

        // test - process actions
        for (let ft of ctx) {
            console.group();
            await processTestContext(ft, T);//, test_shortPosIds);
            console.groupEnd();
        }

        // TODO - TX: setReadOnly(true)... ?

        // PHASE (1) - process TAKE/PAY (all types, all positions) [v1]
        for (let ft of ctx) {
            console.group();
            const MP = ft.data.price[T]; // mark price
            console.log(chalk.dim(`ftId=${ft.ftId}, MP=${MP}...`));

            // dbg - show participant FT balances
            for (let p of ft.data.TEST_PARTICIPANTS) {
                const le = await CONST.web3_call('getLedgerEntry', [ p.account ]);
                console.log(chalk.blue.italic(`PID=${p.id}`) +
                    chalk.dim(` ${le.tokens.map(p2 => `{ #${p2.stId}/Q:${p2.mintedQty.toString().padStart(3)} }`).join(', ')}`
                )); //, le.tokens);
            }

            // main - process take/pay for all positions on this future
            //
            //
            await TakePay_v2(ft.ftId, MP, ft.data.TEST_PARTICIPANTS.map(p => p.account));
            console.groupEnd();
        }

        // PHASE (2) - COMBINE positions (all types, all positions)
        for (let ft of ctx) {
            console.group();
            await Combine(ft.ftId, ft.data.TEST_PARTICIPANTS.map(p => p.account));
            console.groupEnd();
        }

        // PHASE (3) - PROCESS LIQUIDATE (all futures, all positions)
        //  by account-level liquidation trigger (i.e. net/total physical bal < reserved bal)
        //  (TX's contingent: we decide if we need to liquidate)
        // TODO: --> want a second FT to test account-level liquidation...
        //...
    }

     // integrity check - compare context ledgers after vs. before & deltas
     console.log();
     for (let ft of ctx) {
        const data = [], nets = [];
        const ftData = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.find(p => p.id == ft.ftId);
        data.push(['Account', 'Before', 'After', 'Deposits', 'Withdraws', 'Net' ])
        for (let p of ft.data.TEST_PARTICIPANTS) {
            p.le_after = await CONST.web3_call('getLedgerEntry', [p.account]);
            const ccyBefore = Number(p.le_before.ccys.find(p => p.ccyTypeId.eq(ftData.ft.refCcyId)).balance);
            const ccyAfter = Number(p.le_after.ccys.find(p => p.ccyTypeId.eq(ftData.ft.refCcyId)).balance);
            const ccyDeposits = Number(p.ccy_deposits ? p.ccy_deposits.map(p => p.a).reduce((a,b)=>(a||0)+(b||0),0).toString() : 0);
            const ccyWithdraws = Number(p.ccy_withdraws ? p.ccy_withdraws.map(p => p.a).reduce((a,b)=>(a||0)+(b||0),0).toString() : 0);
            const net = ccyAfter - ccyBefore - ccyDeposits + ccyWithdraws;
            data.push([
                p.account,
                `$${ccyBefore.toString()}`,
                `$${ccyAfter.toString()}`,
                `$${ccyDeposits.toString()}`,
                `$${ccyWithdraws.toString()}`,
                `$${net.toString()}`
            ]);
            nets.push(net);
        }
        data.push(['-', '-', '-', '-', '-', `$${nets.reduce((a,b)=>a+b,0).toString()}`]);
        const table = new TCharts.Table(0.2);
        table.setData(data);
        console.log(table.string());
    }

    process.exit();
})();

async function processTestContext(ft, T) { //, test_shortPosIds) {
    const O = await CONST.getAccountAndKey(0);
    const TEST_PARTICIPANTS = ft.data.TEST_PARTICIPANTS;

    // process ctx deposits
    for (let p of TEST_PARTICIPANTS.filter(p => p.id > 0)) {
        const ccy_deposit = p.ccy_deposits[T];
        if (ccy_deposit.a) {
            console.log(chalk.blue.italic(`TEST_PARTICIPANT: PID=${p.id}, account=${p.account}`) + chalk.blue(` ** DEPOSIT ** `), ccy_deposit);
            await CONST.web3_tx('fundOrWithdraw', [ CONST.fundWithdrawType.FUND, CONST.ccyType.USD, ccy_deposit.a, p.account, 'TEST_FT' ], O.addr, O.privKey);
        }
    }

    // process ctx withdraws
    for (let p of TEST_PARTICIPANTS.filter(p => p.id > 0)) {
        const ccy_withdraw = p.ccy_withdraws[T];
        if (ccy_withdraw.a) {
            console.log(chalk.blue.italic(`TEST_PARTICIPANT: PID=${p.id}, account=${p.account}`) + chalk.blue(` ** WITHDRAW ** `), ccy_withdraw);
            await CONST.web3_tx('fundOrWithdraw', [ CONST.fundWithdrawType.WITHDRAW, CONST.ccyType.USD, ccy_withdraw.a, p.account, 'TEST_FT' ], O.addr, O.privKey);
        }
    }

    // todo: ...extend for minting, burning & spot trades

    // process ctx new futures positions
    for (let p of TEST_PARTICIPANTS.filter(p => p.id > 0)) {
        const ft_long = p.ft_longs[T];
        if (ft_long.q) {
            console.log(chalk.blue.italic(`TEST_PARTICIPANT: PID=${p.id}, account=${p.account}`) + chalk.blue(` ** OPEN FUTURES POSITION ** `), ft_long);
            const shortAccount = TEST_PARTICIPANTS.find(p => p.id == ft_long.cid).account;

            const { txHash, receipt, evs } = await CONST.web3_tx('openFtPos', [{
                tokTypeId: ft.ftId, ledger_A: p.account, ledger_B: shortAccount, qty_A: ft_long.q, qty_B: ft_long.q * -1, price: ft_long.p
            }], O.addr, O.privKey);
            //console.log('ev... shortStId:', evs.find(p => p.event == 'FutureOpenInterest').returnValues.shortStId); // ## stack too deep for shortStId
            const shortStId = Number(await CONST.web3_call('getSecToken_MaxId', [])) - 1;
            //console.log('new test pos: ', shortStId);
            //test_shortPosIds.push(shortStId);
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
            underlyerTypeId: CONST.tokenType.TOK_T1,
                   refCcyId: CONST.ccyType.USD,
               contractSize: 1000,
             feePerContract: 300, // $3.00
             initMarginBips: 1000, // 10%
              varMarginBips: 1000, // 10%
        }, CONST.nullAddr], O.addr, O.privKey);
    } else console.log(`${TEST_FT_1} future already present; nop.`);
    fts = (await CONST.web3_call('getSecTokenTypes', [])).tokenTypes.filter(p => p.settlementType == CONST.settlementType.FUTURE);

    // init - get entire ledger (for allocation of clean/unused accounts to test participants)
    ledgerOwners = await CONST.web3_call('getLedgerOwners', []);
    const freshAccounts = _.differenceWith(accounts, ledgerOwners, (a,b) => a.toLowerCase() == b.toLowerCase());
    if (freshAccounts.length == 0) throw ('Insufficient fresh test accounts: redeploy the contract');
    //console.log('accounts', accounts);
    //console.log('ledgerOwners', ledgerOwners);
    //console.log(`${testMode} - freshAccounts`, freshAccounts);

    // init - define test data series, and test FTs
    var i=0, ret;
    if (testMode == "TEST_0") { // single position - desc price
        ret = [ { ftId: fts.find(p => p.name == TEST_FT_1).id.toString(), data: { // ## TODO: fails w/ "Central insufficient for settlement" becuase not ordering TP2 joib by OTM first?!
price:
               [ 100,               99,                98,                97,                96,                95,                94,                 93,                 92 ],
TEST_PARTICIPANTS: [ {
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
    else if (testMode == "TEST_1") { // single position - asc price
        ret = [ { ftId: fts.find(p => p.name == TEST_FT_1).id.toString(), data: {
price:
               [ 100,               101,               102,               103,               104,               105,               106,                107,                108 ],
TEST_PARTICIPANTS: [ {
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
    else if (testMode == "TEST_2") { // adding to positions, 2 parties (pos-combine)
        ret =  [ { ftId: fts.find(p => p.name == TEST_FT_1).id.toString(), data: {
price:
               [ 100,               101,               102,               103,               104,               105,               106,                107,                108 ],
TEST_PARTICIPANTS: [ {
           id: 1, account: freshAccounts[i++],
 ccy_deposits: [ {a:+20300},        {a:+21300},        {a:+22300},        {},                {},                {},                {},                 {},                 {} ],
ccy_withdraws: [ {a:+0000},         {},                {},                {},                {},                {},                {},                 {},                 {} ],
     ft_longs: [ {q:1,cid:2,p:100}, {q:1,cid:2,p:101}, {q:1,cid:2,p:102}, {},                {},                {},                {},                 {},                 {} ],
},
{
           id: 2, account: freshAccounts[i++],
 ccy_deposits: [ {a:+20300},        {a:+21300},        {a:+22300},        {},                {},                {},                {},                 {},                 {} ],
ccy_withdraws: [ {a:+0000},         {},                {},                {},                {},                {},                {},                 {},                 {} ],
     ft_longs: [ {},                {},                {},                {},                {},                {},                {},                 {},                 {} ],
}
]
        }
    }];
    }
    else if (testMode == "TEST_3") { // A - B - C (counterparty gets swapped)
        ret =  [ { ftId: fts.find(p => p.name == TEST_FT_1).id.toString(), data: {
price:
               [ 100,               101,               102,               103,               104,               105,               106,                107,                108 ],
TEST_PARTICIPANTS: [ {
           id: 1, account: freshAccounts[i++],
 ccy_deposits: [ {a:+20300},        {},                {},                {},                {},                {},                {},                 {},                 {} ],
ccy_withdraws: [ {},                {},                {},                {},                {},                {},                {},                 {},                 {} ],
     ft_longs: [ {q:1,cid:2,p:100}, {},                {},                {},                {},                {},                {},                 {},                 {} ],
},
{
           id: 2, account: freshAccounts[i++],
 ccy_deposits: [ {a:+20300},        {a:+21300},        {},                {},                {},                {},                {},                 {},                 {} ],
ccy_withdraws: [ {},                {},                {},                {},                {},                {},                {},                 {},                 {} ],
     ft_longs: [ {},                {q:1,cid:3,p:101}, {},                {},                {},                {},                {},                 {},                 {} ],
},
{
           id: 3, account: freshAccounts[i++],
 ccy_deposits: [ {},                {a:+21300},        {},                {},                {},                {},                {},                 {},                 {} ],
ccy_withdraws: [ {},                {},                {},                {},                {},                {},                {},                 {},                 {} ],
     ft_longs: [ {},                {},                {},                {},                {},                {},                {},                 {},                 {} ],
}
]
        }
    }];
    }
    else if (testMode == "TEST_4") { // margin call -> zero (## settelment fails, by design ##)
        ret =  [ { ftId: fts.find(p => p.name == TEST_FT_1).id.toString(), data: {
price:
               [ 100,               110,               120,               130,               140,               150,               160,                170,                180 ],
TEST_PARTICIPANTS: [ {
           id: 1, account: freshAccounts[i++],
 ccy_deposits: [ {a:+20300},        {},                {},                {},                {},                {},                {},                 {},                 {} ],
ccy_withdraws: [ {a:+0000},         {},                {},                {},                {},                {},                {},                 {},                 {} ],
     ft_longs: [ {q:1,cid:2,p:100}, {},                {},                {},                {},                {},                {},                 {},                 {} ],
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

    // set starting balances in context
    for (ft of ret) {
        ft.data.TEST_PARTICIPANTS.push({ id: 0, account: O.addr });
        for (let p of ft.data.TEST_PARTICIPANTS) {
            p.le_before = await CONST.web3_call('getLedgerEntry', [p.account]);
        }
    }
    return ret;
}
