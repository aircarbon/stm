const Big = require('big.js');

const Web3 = require('web3');
const web3 = new Web3();
const _ethUsd = 150;

const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/hdkey');
const EthereumJsTx = require('ethereumjs-tx');
const chalk = require('chalk');

const { db } = require('../common/dist');

// misc
const WEB3_GWEI_GAS_BID = '10';
const WEB3_GAS_LIMIT = 5000000;

// CFD helpers
const nullCashflowArgs = { cashflowType: 0,
    //wei_maxIssuance: 0,
    //wei_currentPrice: 0,
    term_Blks: 0, bond_bps: 0, bond_int_EveryBlks: 0 };
const cashflowType = Object.freeze({
    BOND: 0,
    EQUITY: 1,
});
const blocksFromSecs = (secs) => Math.ceil(secs / 15); // 15 secs per block avg assumed
const blocksFromMins = (mins) => Math.ceil(blocksFromSecs(mins * 60));
const blocksFromHours = (hours) => Math.ceil(blocksFromMins(hours * 60));
const blocksFromDays = (days) => Math.ceil(blocksFromHours(days * 24));
const blocksFromMonths = (months) => Math.ceil(blocksFromDays(months * 30.42));

//
// MAIN: deployer definitions -- contract ctor() params
//
const contractVer = "0.96n";
const contractProps = {
    COMMODITY: {
        contractVer: contractVer,
        contractName: `AirCarbon__v${contractVer}`,
        contractUnit: "Ton(s)",
        contractSymbol: "ACC",
        contractDecimals: 0,
        cashflowArgs: nullCashflowArgs,
    },
    CASHFLOW: {
        contractVer: contractVer,
        contractName: `SingDax_CFT__v${contractVer}_1A`,
        contractUnit: "Token(s)",
        contractSymbol: "SD1A",
        contractDecimals: 0,
        cashflowArgs: {
              cashflowType: cashflowType.BOND,
                 term_Blks: blocksFromDays(1),
                  bond_bps: 1000, // 10%
        bond_int_EveryBlks: blocksFromHours(1)
        }
    },
};


module.exports = {
    contractProps: contractProps,

    //logTestAccountUsage: true,

    nullAddr: "0x0000000000000000000000000000000000000000",

    // https://docs.chain.link/docs/using-chainlink-reference-contracts
    chainlinkAggregators: {
        "1": { // mainnet
            btcUsd: '0xF5fff180082d6017036B771bA883025c654BC935',
            ethUsd: '0x79fEbF6B9F76853EDBcBc913e6aAE8232cFB9De9'
        },
        "3": { // ropsten
            btcUsd: '0x882906a758207FeA9F21e0bb7d2f24E561bd0981',
            ethUsd: '0x8468b2bDCE073A157E560AA4D9CcF6dB1DB98507'
        },
        "888": { // dev
            btcUsd: '0x0000000000000000000000000000000000000000',
            ethUsd: '0x0000000000000000000000000000000000000000'
        },
        "889": { // dev
            btcUsd: '0x0000000000000000000000000000000000000000',
            ethUsd: '0x0000000000000000000000000000000000000000'
        },
        "890": { // dev
            btcUsd: '0x0000000000000000000000000000000000000000',
            ethUsd: '0x0000000000000000000000000000000000000000'
        },
    },

    getTestContextWeb3: () => getTestContextWeb3(),
    getAccountAndKey: async (accountNdx, mnemonic) => getAccountAndKey(accountNdx, mnemonic),

    web3_sendEthTestAddr: (sendFromNdx, sendToAddr, ethValue) => web3_sendEthTestAddr(sendFromNdx, sendToAddr, ethValue),
    web3_call: (methodName, methodArgs) => web3_call(methodName, methodArgs),
    web3_tx: (methodName, methodArgs, fromAddr, fromPrivKey) => web3_tx(methodName, methodArgs, fromAddr, fromPrivKey),

    nullFees: {
        ccy_mirrorFee: false,
        ccy_perThousand: 0,
        fee_fixed: 0,
        fee_percBips: 0,
        fee_min: 0,
        fee_max: 0,
    },

    contractType: Object.freeze({
        COMMODITY: 0,
        CASHFLOW: 1,
    }),

    cashflowType: cashflowType,

    getFeeType: Object.freeze({
        CCY: 0,
        TOK: 1,
    }),

    // transfer types (event data)
    transferType: Object.freeze({
        USER: 0,
EXCHANGE_FEE: 1,
    ORIG_FEE: 2,
    }),

    // token types (contract data)
    tokenType: Object.freeze({
          CORSIA: 1,
          NATURE: 2,
         PREMIUM: 3,
    }),

    // ccy types (contract data)
    ccyType: Object.freeze({
        USD: 1,
        ETH: 2,
        BTC: 3,
        // SGD: 4,
        // EUR: 5,
        // HKD: 6,
        // GBP: 7
    }),

    // eeu qty constants
    kt1Carbon: 1000,                      // 1000 qty (tons) = 1 kiloton
     mtCarbon: 1000 * 1000,               // 1^6 qty (tons) = 1 megaton
     gtCarbon: 1000 * 1000 * 1000,        // 1^9 qty (tons) = 1 gigaton

    // ccy constants
         oneCcy_cents: Big(1 * 100).toFixed(),
     hundredCcy_cents: Big(100 * 100).toFixed(),
    thousandCcy_cents: Big(1000 * 100).toFixed(),
     millionCcy_cents: Big(1000 * 1000 * 100).toFixed(),
     billionCcy_cents: Big(1000).times(1000).times(1000).times(100).toFixed(),
    thousandthEth_wei: Big(web3.utils.toWei("1", "ether") / 1000).toFixed(),                  // "1000000000000000",
     hundredthEth_wei: Big(web3.utils.toWei("1", "ether") / 100).toFixed(),                   // "10000000000000000",
         tenthEth_wei: Big(web3.utils.toWei("1", "ether") / 10).toFixed(),                    // "100000000000000000",
           oneEth_wei: Big(web3.utils.toWei("1", "ether")).toFixed(),                         // "1000000000000000000",
      thousandEth_wei: Big(web3.utils.toWei("1", "ether") * 1000).toFixed(),                  // "1000000000000000000000",
       millionEth_wei: Big(web3.utils.toWei("1", "ether")).times(1000).times(1000).toFixed(), // "1000000000000000000000000",
     hundredthBtc_sat: Big(1000000).toFixed(),
         tenthBtc_sat: Big(10000000).toFixed(),
           oneBtc_sat: Big(100000000).toFixed(),
      thousandBtc_sat: Big(100000000).times(1000).toFixed(),
       millionBtc_sat: Big(100000000).times(1000000).toFixed(),


    // gas approx values - for cost estimations
    //gasPriceEth: _gasPriceEth,
    //     ethUsd: _ethUsd,

    logGas: async (truffleWeb3, truffleTx, desc) => { // actual gas price, not estimated
        //console.log('truffleTx', truffleTx);

        const web3Tx = await truffleWeb3.eth.getTransaction(truffleTx.receipt.transactionHash);
        //console.log('web3Tx', web3Tx);

        const actualGasPriceEth = web3.utils.fromWei(web3Tx.gasPrice);
        //console.log('actualGasPriceEth', actualGasPriceEth);

        const weiCost = web3Tx.gasPrice * truffleTx.receipt.gasUsed;
        const usdCost = actualGasPriceEth * truffleTx.receipt.gasUsed * _ethUsd;

        console.log(`>>> gasUsed - ${desc}: ${truffleTx.receipt.gasUsed} @${actualGasPriceEth} ETH/gas = Ξ${(actualGasPriceEth * truffleTx.receipt.gasUsed).toFixed(4)} ~= $${(usdCost).toFixed(4)}`);
        return { usdCost, weiCost };
    }
};

function getTestContextWeb3() {
    const context =
            // DM
            process.env.WEB3_NETWORK_ID == 888 ? { web3: new Web3('http://127.0.0.1:8545'),  ethereumTxChain: {} }

            // Vince
        : process.env.WEB3_NETWORK_ID == 890 ? { web3: new Web3('http://127.0.0.1:8545'),    ethereumTxChain: {} }

            // Dung
        : process.env.WEB3_NETWORK_ID == 889 ? { web3: new Web3('http://127.0.0.1:8545'),    ethereumTxChain: {} }

            // Ropsten
        : process.env.WEB3_NETWORK_ID == 3 ?   { web3: new Web3('https://ac-dev0.net:9545'), ethereumTxChain: { chain: 'ropsten', hardfork: 'petersburg' } }

        : undefined;
    if (!context) throw('WEB3_NETWORK_ID is not set!');
    return context;
}

async function getAccountAndKey(accountNdx, mnemonic) {
    const MNEMONIC = mnemonic || require('./dev_mnemonic.js').MNEMONIC;
    //console.log('MNEMONIC: ', MNEMONIC);
    const seed = await bip39.mnemonicToSeed(MNEMONIC);
    const hdk = hdkey.fromMasterSeed(seed);
    const addr_node = hdk.derivePath(`m/44'/60'/0'/0/${accountNdx}`);
    const addr = addr_node.getWallet().getAddressString();
    const privKeyBytes = addr_node.getWallet().getPrivateKey();
    //console.dir(privKeyBytes);
    const privKeyHex = privKeyBytes.toString('hex');
    //console.log('privKeyHex', privKeyHex);
    return { addr, privKey: privKeyHex };
}

async function web3_call(methodName, methodArgs) {
    const { web3, ethereumTxChain } = getTestContextWeb3();
    const contractDb = (await db.GetDeployment(process.env.WEB3_NETWORK_ID, contractProps[process.env.CONTRACT_TYPE].contractName, contractProps[process.env.CONTRACT_TYPE].contractVer)).recordset[0];
    if (!contractDb) throw(Error(`Failed to lookup contract deployment for networkId=${process.env.WEB3_NETWORK_ID}, contractName=${contractProps[process.env.CONTRACT_TYPE].contractName}, contractVer=${contractProps[process.env.CONTRACT_TYPE].contractVer}`));
    console.log(` > CALL: [${contractDb.contract_enum} ${contractDb.contract_ver} @${contractDb.addr}] ${chalk.blue.bgWhite(methodName)}(${methodArgs.join()}) [networkId: ${process.env.WEB3_NETWORK_ID} - ${web3.currentProvider.host}]`);
    var contract = new web3.eth.Contract(JSON.parse(contractDb.abi), contractDb.addr);
    const callRet = await contract.methods[methodName](...methodArgs).call();
    return callRet;
}

async function web3_tx(methodName, methodArgs, fromAddr, fromPrivKey) {
    const { web3, ethereumTxChain } = getTestContextWeb3();
    const contractDb = (await db.GetDeployment(process.env.WEB3_NETWORK_ID, contractProps[process.env.CONTRACT_TYPE].contractName, contractProps[process.env.CONTRACT_TYPE].contractVer)).recordset[0];
    if (!contractDb) throw(Error(`Failed to lookup contract deployment for networkId=${process.env.WEB3_NETWORK_ID}, contractName=${contractProps[process.env.CONTRACT_TYPE].contractName}, contractVer=${contractProps[process.env.CONTRACT_TYPE].contractVer}`));
    var contract = new web3.eth.Contract(JSON.parse(contractDb.abi), contractDb.addr);

    // tx data
    console.log(` >   TX: [${contractDb.contract_enum} ${contractDb.contract_ver} @${contractDb.addr}] ${chalk.red.bgWhite(methodName)}(${methodArgs.join()}) [networkId: ${process.env.WEB3_NETWORK_ID} - ${web3.currentProvider.host}]`);
    const nonce = await web3.eth.getTransactionCount(fromAddr, "pending");
    var paramsData = contract.methods
        [methodName](...methodArgs)
        .encodeABI();
    const txData = {
        nonce: nonce,
     gasPrice: web3.utils.toHex(web3.utils.toWei(WEB3_GWEI_GAS_BID, 'gwei')),
     gasLimit: WEB3_GAS_LIMIT,
         from: fromAddr,
           to: contractDb.addr,
         data: paramsData,
        value: 0
     }

    // estimate gas
    const gasEstimate = await web3.eth.estimateGas(txData);
    console.log(chalk.yellow('   -> gasEstimate=', gasEstimate));

    // send signed tx
    const EthereumTx = EthereumJsTx.Transaction
    var tx = new EthereumTx(txData, ethereumTxChain);
    tx.sign(Buffer.from(fromPrivKey, 'hex'));
    const raw = '0x' + tx.serialize().toString('hex');
    const txPromise = new Promise((resolve, reject) =>  {
        var txHash;
        web3.eth.sendSignedTransaction(raw)
        .on("receipt", receipt => {
            //console.log(`   => receipt`, receipt);
        })
        .once("transactionHash", hash => {
            txHash = hash;
            console.log(chalk.yellow(`   => ${txHash} ...`));
        })
        .once("confirmation", async (confirms) => {
            const receipt = await web3.eth.getTransactionReceipt(txHash);
            console.log(chalk.yellow(`   => ${txHash} - ${confirms} confirm(s), receipt.gasUsed=`, receipt.gasUsed));
            resolve(txHash);
        })
        .once("error", error => {
            console.log(chalk.yellow(`   => ## error`, error));
            console.dir(error);
            reject(error);
        });
    });
    return txPromise;
}

async function web3_sendEthTestAddr(sendFromNdx, sendToAddr, ethValue) {
    const { addr: fromAddr, privKey: fromPrivKey } = await getAccountAndKey(sendFromNdx);
    //const { addr: toAddr,   privKey: toPrivKey }   = await getAccountAndKey(sendToNdx);

    // send signed tx
    const { web3, ethereumTxChain } = getTestContextWeb3();
    console.log(` > TX web3_sendEthTestAddr: Ξ${chalk.red.bgWhite(ethValue.toString())} @ ${chalk.red.bgWhite(fromAddr)} => ${chalk.red.bgWhite(sendToAddr)} [networkId: ${process.env.WEB3_NETWORK_ID} - ${web3.currentProvider.host}]`);
    const nonce = await web3.eth.getTransactionCount(fromAddr, "pending");
    const EthereumTx = EthereumJsTx.Transaction
    var tx = new EthereumTx({
           nonce: nonce,
        gasPrice: web3.utils.toHex(web3.utils.toWei(WEB3_GWEI_GAS_BID, 'gwei')),
        gasLimit: WEB3_GAS_LIMIT,
              to: sendToAddr,
            from: fromAddr,
           value: web3.utils.toHex(web3.utils.toWei(ethValue)),
        },
        ethereumTxChain,
    );
    //console.dir(fromPrivKey);
    tx.sign(Buffer.from(fromPrivKey, 'hex'));
    const raw = '0x' + tx.serialize().toString('hex');
    const txPromise = new Promise((resolve, reject) =>  {
        var txHash;
        web3.eth.sendSignedTransaction(raw)
        .on("receipt", receipt => {
            //console.log(`   => receipt`, receipt);
        })
        .on("transactionHash", hash => {
            txHash = hash;
            //console.log(`   => ${txHash} ...`);
        })
        .once("confirmation", async confirms => {
            const receipt = await web3.eth.getTransactionReceipt(txHash);
            console.log(chalk.yellow(`   => ${txHash} - ${confirms} confirm(s), receipt.gasUsed=`, receipt.gasUsed));
            resolve(txHash);
        })
        .once("error", error => {
            console.log(chalk.yellow(`   => ## error`, error));
            console.dir(error);
            reject(error);
        });
    });
    return txPromise;
}