const st = artifacts.require("StMaster");

const Web3 = require('web3');
const acmJson = require('../build/contracts/StMaster.json');
const abi = acmJson['abi'];
const ejs = require('ethereumjs-tx');

const CONST = require('../const.js');

contract("StMaster", accounts => {
    var stm;

    const account = "0xf57B0adC78461888BF32d5FB92784CF3FC8f9956"; // dev contract owner
    const privateKey = "0CF8F198ACE6D2D92A2C1CD7F3FC9B42E2AF3B7FD7E64371922CB73A81493C1A"; // dev contract owner privkey

    beforeEach(async () => {
        stm = await st.deployed();
    });

    it("web3 - events", async () => {
        const web3 = new Web3('http://127.0.0.1:8545'); // ganache

        var contract = new web3.eth.Contract(abi, stm.address);
        const events =  await contract.getPastEvents('MintedSecToken', {
            fromBlock: 0,
            toBlock: "latest"
        });
        console.log('events', events);
    })

    it("web3 - fund/getLedgerEntry - numeric types are BN", async () => {
        var address = stm.address;
        const web3 = new Web3('http://127.0.0.1:8545');
        var contract = new web3.eth.Contract(abi, stm.address);
        const A = accounts[0];
        
        // fund with truffle
        //const truffle_fundTx = await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, CONST.ccyType.USD, CONST.hundredCcy_cents, A, 'TEST');

        // fund $100 - web3
        var paramsData = contract.methods
            .fund(CONST.ccyType.USD, CONST.hundredCcy_cents, A)
            .encodeABI(); 
        var web3_fundTx = new ejs.Transaction({
               nonce: await web3.eth.getTransactionCount(account, "pending"),
            gasPrice: web3.utils.toHex(web3.utils.toWei('20', 'gwei')),
            gasLimit: 500000,
                  to: address,
               value: 0,
                data: paramsData,
                from: account, // owner only
        }, //{ chain: 'rinkeby', hardfork: 'petersburg' }
        );
        web3_fundTx.sign(Buffer.from(privateKey, 'hex'));
        var raw = '0x' + web3_fundTx.serialize().toString('hex');
        console.log('sendSignedTransaction...');
        
        const promiseFundTx = new Promise((resolve, reject) =>  {
            web3.eth.sendSignedTransaction(raw)
            .on("receipt", receipt => {
            })
            .on("transactionHash", hash => {
            })
            .on("confirmation", confirmation => {
                return resolve(confirmation);
            })
            .on("error", error => {
                return reject(error);
            });
        });
        const data = await promiseFundTx;

        // getLedgerEntry - truffle
        const truffle_ledgerEntry = await stm.getLedgerEntry(A);
        const truffle_balance = truffle_ledgerEntry.ccys.find(p => p.ccyTypeId == CONST.ccyType.USD).balance;
        console.log('truffle_balance', truffle_balance);
        assert(truffle_balance == 10000, 'unexpected truffle balance after funding');
        
        // getLedgerEntry - web3
        const web3_ledgerEntry = await contract.methods.getLedgerEntry(A).call();
        const web3_balance = web3_ledgerEntry.ccys.find(p => p.ccyTypeId == CONST.ccyType.USD).balance;
        console.log('web3_balance (BN)', web3_balance);
        console.log('web3_balance.toString()', web3_balance.toString());

        assert(web3_balance.toString() == '10000', 'unexpected web3 balance after funding');
    });

    it("web3 - get accounts", async () => {
        const web3 = new Web3('http://127.0.0.1:8545');
        const accounts = await web3.eth.getAccounts();
        console.dir(accounts);
    });

    it("web3 - public accessors - should work", async () => {
        var address = stm.address;
        var account = "0xf57B0adC78461888BF32d5FB92784CF3FC8f9956"; // owner
        var privateKey = "0CF8F198ACE6D2D92A2C1CD7F3FC9B42E2AF3B7FD7E64371922CB73A81493C1A"; // owner privkey
        const web3 = new Web3('http://127.0.0.1:8545');

        var contract = new web3.eth.Contract(abi, address);
        
        const name = await contract.methods.name.call();
        const version = await contract.methods.version.call();
        const unit = await contract.methods.unit.call();
        const symbol = await contract.methods.symbol.call();
        const decimals = await contract.methods.decimals.call();
        console.log('name', name);
        console.log('version', version);
        console.log('unit', unit);
        console.log('symbol', symbol);
        console.log('decimals', decimals);
        // assert(name == 'SecTok_Master', 'fail: name');
        // assert(version == '0.7', 'fail: version');
        // assert(unit == 'TONS', 'fail: version');
        // assert(symbol == 'CCC', 'fail: symbol');
        // assert(decimals == 4, 'fail: decimals');
    });

    // it("web3 - speed - should allow fast return of txid (rinkeby_infura)", async () => {
    //     let networkID = process.env.NETWORK_ID;
    //     console.log('net_version: ', networkID);

    //     if (networkID !== "rinkeby_infura") {``
    //         console.log('aborting - not rinkeby infura');
    //         return;
    //     }
        
    //     // LAB -- pure web3: sendRawTransaction (fast tx id) via Rinkeby Infura
    //     var address = stm.address; //"0x41ffed08c64B339A62DC8003b5b3cCEDC81BcB29"; // deployed addr
    //     var account = "0xf57B0adC78461888BF32d5FB92784CF3FC8f9956"; // owner
    //     var privateKey = "0CF8F198ACE6D2D92A2C1CD7F3FC9B42E2AF3B7FD7E64371922CB73A81493C1A"; // owner privkey
    //     const infura_web3 = new Web3('https://rinkeby.infura.io/v3/93db2c7fd899496d8400e86100058297'); // ropsten_infura

    //     const nonce = await infura_web3.eth.getTransactionCount(account, "pending");
    //     console.log('nonce', nonce);
    //     //infura_web3.eth.getTransactionCount(account, "pending", async function (err, nonce) {
    //         var contract = new infura_web3.eth.Contract(abi, address);

    //         var data = contract.methods
    //             .mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, '0xf57B0adC78461888BF32d5FB92784CF3FC8f9956')
    //             .encodeABI(); // replaces getData()

    //         const ejs = require('ethereumjs-tx');
    //         const EthereumTx = ejs.Transaction
    //         var tx = new EthereumTx({
    //             nonce: nonce,
    //             gasPrice: web3.utils.toHex(web3.utils.toWei('20', 'gwei')), // ## COME FROM CONFIG
    //             gasLimit: 500000,
    //             to: address,
    //             value: 0,
    //             data: data,
    //             from: account, // owner call fn.
    //         },
    //         { chain: 'rinkeby', hardfork: 'petersburg' }
    //         );

    //         tx.sign(Buffer.from(privateKey, 'hex'));

    //         var raw = '0x' + tx.serialize().toString('hex');
    //         console.time('sendTx');
    //         console.log('sendSignedTransaction...');
    //         const receipt1 = await infura_web3.eth.sendSignedTransaction(raw, function (err, tx) {
    //             console.timeEnd('sendTx');
    //             console.log('err', err);
    //             console.log('tx', tx);
    //         })
    //         .on("receipt", receipt2 => {
    //             console.log('receipt2', receipt2);
    //             // + DB txid ...
    //         });
    //         console.log('receipt1', receipt1);
    //     //});

    //     //setTimeout(() => {}, 5000);

    //     // https://github.com/trufflesuite/truffle/issues/2003
    //     // const scp_web3 = new Web3('https://node0.scoop.tech:9545'); // ropsten_scp -- ## "unknown account" back from node on .send()
    //     // const acmWeb3 = new scp_web3.eth.Contract(abi, '0x0dF1c0F898dcCb6210c7581098dC5E60294579c0'); // deployed ropsten (through infura) contract addr
    //     // console.dir(acmWeb3.methods.mintSecTokenBatch);

    //     // const tx = await acmWeb3.methods
    //     //     .mintSecTokenBatch(CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, '0xf57B0adC78461888BF32d5FB92784CF3FC8f9956')
    //     //     .send({ from: '0xf57B0adC78461888BF32d5FB92784CF3FC8f9956' }, function (err, tx) {
    //     //         console.log('callback: tx=', tx);
    //     //         console.log('callback: err=', err);
    //     //     }
    //     // );
    //     // console.log('awaited: ', tx);

    //     // https://github.com/trufflesuite/truffle/issues/624
    //     // console.dir(stm.contract);
    //     // console.time('send mintTx');
    //     // const tx = await stm.mintSecTokenBatch // not a web3 contract instance, but a TruffleContract instance
    //     //     //.sendTransaction
    //     //     (CONST.tokenType.TOK_T1, CONST.GT_CARBON, 1, accounts[0], { from: accounts[0] }
    //     //         // TruffleContact has no callback
    //     //         // , function (err, txHash) {
    //     //         //     console.log(txHash);
    //     //         // }
    //     //     )
    //     //     ;
    //     //     // .then(tx => {
    //     //     //     console.log('tx: ', tx);
    //     //     //     return tx;
    //     //     // });

    //     // console.dir(tx);
    //     // console.timeEnd('send mintTx');
    // });

});