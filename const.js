const Big = require('big.js');

const Web3 = require('web3');
const web3 = new Web3();
const _gasPriceEth = web3.utils.fromWei(web3.utils.toWei("20", "gwei"), 'ether');
const _ethUsd = 150;

const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/hdkey');
const EthereumJsTx = require('ethereumjs-tx');

module.exports = {
    //logTestAccountUsage: true,

    whitelistExchangeTestAcounts: true,

    nullAddr: "0x0000000000000000000000000000000000000000",

    getTestContextWeb3: () => getTestContextWeb3(),
    getAccountAndKey: async (accountNdx) => getAccountAndKey(accountNdx),
    sendEthTestAddr: (sendFromNdx, sendToNdx, ethValue) => sendEthTestAddr(sendFromNdx, sendToNdx, ethValue),

    nullFees: {
        fee_fixed: 0,
        fee_percBips: 0,
        fee_min: 0,
        fee_max: 0,
    },

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
        UNFCCC: 1,
           VCS: 2,
    }),

    // ccy types (contract data)
    ccyType: Object.freeze({
        SGD: 1,
        ETH: 2,
        BTC: 3,
        USD: 4,
        EUR: 5,
        HKD: 6,
        GBP: 7
    }), 

    // eeu kg constants
    tonCarbon: 1000,                      // one ton carbon in kg
     ktCarbon: 1000 * 1000,               // kiloton carbon in kg
     mtCarbon: 1000 * 1000 * 1000,        // megaton carbon in kg
     gtCarbon: 1000 * 1000 * 1000 * 1000, // gigaton carbon in kg

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
    gasPriceEth: _gasPriceEth,
         ethUsd: _ethUsd,

    logGas: (tx, desc) => {
        var usdCost = _gasPriceEth * tx.receipt.gasUsed * _ethUsd;
        console.log(`\t>>> gasUsed - ${desc}: ${tx.receipt.gasUsed} @${_gasPriceEth} ETH/gas = Ξ${(_gasPriceEth * tx.receipt.gasUsed).toFixed(4)} ~= $${(usdCost).toFixed(4)}`);
        return usdCost;
    }
};

function getTestContextWeb3() {
    return process.env.NETWORK == 'development'
        ? { web3: new Web3('http://127.0.0.1:8545'), ethereumTxChain: {} }
        : { web3: new Web3('https://ac-dev0.net:9545'), ethereumTxChain: { chain: 'ropsten', hardfork: 'petersburg' } }
    ;
}

async function getAccountAndKey(accountNdx) {
    const MNEMONIC = require('./dev_mnemonic.js').MNEMONIC;
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

async function sendEthTestAddr(sendFromNdx, sendToNdx, ethValue) {
    const { addr: fromAddr, privKey: fromPrivKey } = await getAccountAndKey(sendFromNdx);
    const { addr: toAddr,   privKey: toPrivKey }   = await getAccountAndKey(sendToNdx);

    // send signed tx
    const { web3, ethereumTxChain } = getTestContextWeb3();
    console.log('sendEthTestAddr: provdier.Host', web3.currentProvider.host);
    const nonce = await web3.eth.getTransactionCount(fromAddr, "pending");
    const EthereumTx = EthereumJsTx.Transaction
    var tx = new EthereumTx({
           nonce: nonce,
        gasPrice: web3.utils.toHex(web3.utils.toWei('40', 'gwei')),
        gasLimit: 500000,
              to: toAddr,
            from: fromAddr,
           value: web3.utils.toHex(web3.utils.toWei(ethValue)),
        },
        ethereumTxChain,
        //{ chain: 'ropsten', hardfork: 'petersburg' }
        //{ chain: 'rinkeby', hardfork: 'petersburg' }
    );
    //console.dir(fromPrivKey);
    tx.sign(Buffer.from(fromPrivKey, 'hex'));
    const raw = '0x' + tx.serialize().toString('hex');
    const txPromise = new Promise((resolve, reject) =>  {
        var txHash;
        web3.eth.sendSignedTransaction(raw)
        .on("receipt", receipt => {
            console.log('sendEthTestAddr: receipt', receipt);
        })
        .on("transactionHash", hash => {
            txHash = hash;
            console.log('sendEthTestAddr: hash', hash);
        })
        .on("confirmation", confirmation => {
            console.log('sendEthTestAddr: confirmation', confirmation);
            resolve(txHash);
        })
        .on("error", error => {
            console.log('sendEthTestAddr: error', error);
            reject(error);
        });
    });
    return txPromise;
}