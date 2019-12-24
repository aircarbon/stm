const Big = require('big.js');

const Web3 = require('web3');
const web3 = new Web3();
const _gasPriceEth = web3.utils.fromWei(web3.utils.toWei("20", "gwei"), 'ether');
const _ethUsd = 150;

const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/hdkey');
const EthereumJsTx = require('ethereumjs-tx');

const { db } = require('../common/dist');

const contractVer = "0.9";
const contractProps = {
    COMMODITY: {
        contractVer: contractVer,
        contractName: "AirCarbon_CORSIA", //"SecTok_Master",
        contractUnit: "KG",
        contractSymbol: "CCC",
        contractDecimals: 4,
    },
    CASHFLOW: {
        contractVer: contractVer,
        contractName: "SingDax_CFT_1A",
        contractUnit: "Token(s)",
        contractSymbol: "SD1A",
        contractDecimals: 0,
    },
};

const GWEI_GAS_BID = '10';

module.exports = {
    contractProps: contractProps,

    //logTestAccountUsage: true,

    nullAddr: "0x0000000000000000000000000000000000000000",

    getTestContextWeb3: () => getTestContextWeb3(),
    getAccountAndKey: async (accountNdx) => getAccountAndKey(accountNdx),
    
    web3_sendEthTestAddr: (sendFromNdx, sendToNdx, ethValue) => web3_sendEthTestAddr(sendFromNdx, sendToNdx, ethValue),
    web3_call: (methodName, methodArgs) => web3_call(methodName, methodArgs),
    web3_tx: (methodName, methodArgs, fromAddr, fromPrivKey) => web3_tx(methodName, methodArgs, fromAddr, fromPrivKey),

    nullFees: {
        fee_fixed: 0,
        fee_percBips: 0,
        fee_min: 0,
        fee_max: 0,
    },

    contractType: Object.freeze({
        COMMODITY: 0,
        CASHFLOW: 1,
    }),

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
        console.log(`>>> gasUsed - ${desc}: ${tx.receipt.gasUsed} @${_gasPriceEth} ETH/gas = Ξ${(_gasPriceEth * tx.receipt.gasUsed).toFixed(4)} ~= $${(usdCost).toFixed(4)}`);
        return usdCost;
    }
};

function getTestContextWeb3() {
    const context = 
              process.env.WEB3_NETWORK_ID == 888 ? { web3: new Web3('http://127.0.0.1:8545'),    ethereumTxChain: {} }
            : process.env.WEB3_NETWORK_ID == 777 ? { web3: new Web3('http://127.0.0.1:8545'),    ethereumTxChain: {} }
            : process.env.WEB3_NETWORK_ID == 999 ? { web3: new Web3('http://127.0.0.1:8545'),    ethereumTxChain: {} }
            : process.env.WEB3_NETWORK_ID == 3 ?  { web3: new Web3('https://ac-dev0.net:9545'), ethereumTxChain: { chain: 'ropsten', hardfork: 'petersburg' } }
            : undefined;
    if (!context) throw('unknown process.env.NETWORK');
    return context;
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

async function web3_call(methodName, methodArgs) {
    const { web3, ethereumTxChain } = getTestContextWeb3();
    const contractDb = (await db.GetDeployment(process.env.WEB3_NETWORK_ID, contractProps[process.env.CONTRACT_TYPE].contractName, contractProps[process.env.CONTRACT_TYPE].contractVer)).recordset[0];
    if (!contractDb) throw(Error(`Failed to lookup contract deployment for networkId=${process.env.WEB3_NETWORK_ID}, contractName=${contractProps[process.env.CONTRACT_TYPE].contractName}, contractVer=${contractProps[process.env.CONTRACT_TYPE].contractVer}`));
    console.log(` > CALL: [${contractDb.contract_enum} ${contractDb.contract_ver} @${contractDb.addr}] ${methodName}(${methodArgs.join()}) [networkId: ${process.env.WEB3_NETWORK_ID} - ${web3.currentProvider.host}]`);
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
    console.log(` > TX: [${contractDb.contract_enum} ${contractDb.contract_ver} @${contractDb.addr}] ${methodName}(${methodArgs.join()}) [networkId: ${process.env.WEB3_NETWORK_ID} - ${web3.currentProvider.host}]`);
    const nonce = await web3.eth.getTransactionCount(fromAddr, "pending");
    var paramsData = contract.methods
        [methodName](...methodArgs)
        .encodeABI();
    const txData = {
        nonce: nonce,
     gasPrice: web3.utils.toHex(web3.utils.toWei(GWEI_GAS_BID, 'gwei')),
     gasLimit: 500000,
         from: fromAddr,
           to: contractDb.addr,
         data: paramsData,
        value: 0
     }

    // estimate gas
    const gasEstimate = await web3.eth.estimateGas(txData);
    console.log('   -> gasEstimate=', gasEstimate);

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
        .on("transactionHash", hash => {
            txHash = hash;
            //console.log(`   => ${txHash} ...`);
        })
        .once("confirmation", async (confirms) => {
            const receipt = await web3.eth.getTransactionReceipt(txHash);
            console.log(`   => ${txHash} - ${confirms} confirm(s), receipt.gasUsed=`, receipt.gasUsed);
            resolve(txHash);
        })
        .once("error", error => {
            console.log(`   => ## error`, error.message);
            reject(error);
        });
    });
    return txPromise;
}

async function web3_sendEthTestAddr(sendFromNdx, sendToNdx, ethValue) {
    const { addr: fromAddr, privKey: fromPrivKey } = await getAccountAndKey(sendFromNdx);
    const { addr: toAddr,   privKey: toPrivKey }   = await getAccountAndKey(sendToNdx);

    // send signed tx
    const { web3, ethereumTxChain } = getTestContextWeb3();
    //console.log(`web3_sendEthTestAddr: Ξ${ethValue.toString()} @ ${fromAddr}  => ${toAddr} (${web3.currentProvider.host})`);
    const nonce = await web3.eth.getTransactionCount(fromAddr, "pending");
    const EthereumTx = EthereumJsTx.Transaction
    var tx = new EthereumTx({
           nonce: nonce,
        gasPrice: web3.utils.toHex(web3.utils.toWei(GWEI_GAS_BID, 'gwei')),
        gasLimit: 500000,
              to: toAddr,
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
            //console.log(` => receipt`, receipt);
        })
        .on("transactionHash", hash => {
            txHash = hash;
            //console.log(` => ${txHash} ...`);
        })
        .on("confirmation", confirms => {
            //console.log(` => ${txHash} - ${confirms} confirm(s)`);
            resolve(txHash);
        })
        .on("error", error => {
            console.log(` => ## error`, error);
            reject(error);
        });
    });
    return txPromise;
}
