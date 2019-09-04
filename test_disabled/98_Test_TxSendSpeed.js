const ac = artifacts.require("AcMaster");
const CONST = require('../const.js');

contract("AcMaster", accounts => {
    var acm;

    beforeEach(async () => {
        acm = await ac.deployed();
    });

    // leave for now -- do properly in API layer, and measure there
    it("speed - should allow fast return of txid (rinkeby_infura)", async () => {
        let networkID = process.env.NETWORK;
        console.log('net_version: ', networkID);

        if (networkID !== "rinkeby_infura") {``
            console.log('aborting - not rinkeby infura');
            return;
        }
        
        var Web3 = require('web3');
        const acmJson = require('../build/contracts/AcMaster.json');
        const abi = acmJson['abi'];

        // LAB -- pure web3: sendRawTransaction (fast tx id) via Rinkeby Infura
        var address = acm.address; //"0x41ffed08c64B339A62DC8003b5b3cCEDC81BcB29"; // deployed addr
        var account = "0xf57B0adC78461888BF32d5FB92784CF3FC8f9956"; // owner
        var privateKey = "0CF8F198ACE6D2D92A2C1CD7F3FC9B42E2AF3B7FD7E64371922CB73A81493C1A"; // owner privkey
        const infura_web3 = new Web3('https://rinkeby.infura.io/v3/93db2c7fd899496d8400e86100058297'); // ropsten_infura

        const nonce = await infura_web3.eth.getTransactionCount(account, "pending");
        console.log('nonce', nonce);
        //infura_web3.eth.getTransactionCount(account, "pending", async function (err, nonce) {
            var contract = new infura_web3.eth.Contract(abi, address);

            var data = contract.methods
                .mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, '0xf57B0adC78461888BF32d5FB92784CF3FC8f9956')
                .encodeABI(); // replaces getData()

            const ejs = require('ethereumjs-tx');
            const EthereumTx = ejs.Transaction
            var tx = new EthereumTx({
                nonce: nonce,
                gasPrice: web3.utils.toHex(web3.utils.toWei('20', 'gwei')), // ## COME FROM CONFIG
                gasLimit: 500000,
                to: address,
                value: 0,
                data: data,
                from: account, // owner call fn.
            },
            { chain: 'rinkeby', hardfork: 'petersburg' }
            );

            tx.sign(Buffer.from(privateKey, 'hex'));

            var raw = '0x' + tx.serialize().toString('hex');
            console.time('sendTx');
            console.log('sendSignedTransaction...');
            const receipt1 = await infura_web3.eth.sendSignedTransaction(raw, function (err, tx) {
                console.timeEnd('sendTx');
                console.log('err', err);
                console.log('tx', tx);
            })
            .on("receipt", receipt2 => {
                console.log('receipt2', receipt2);
                // + DB txid ...
                
            });
            console.log('receipt1', receipt1);
        //});

        //setTimeout(() => {}, 5000);

        // https://github.com/trufflesuite/truffle/issues/2003
        // const scp_web3 = new Web3('https://node0.scoop.tech:9545'); // ropsten_scp -- ## "unknown account" back from node on .send()
        // const acmWeb3 = new scp_web3.eth.Contract(abi, '0x0dF1c0F898dcCb6210c7581098dC5E60294579c0'); // deployed ropsten (through infura) contract addr
        // console.dir(acmWeb3.methods.mintEeuBatch);

        // const tx = await acmWeb3.methods
        //     .mintEeuBatch(CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, '0xf57B0adC78461888BF32d5FB92784CF3FC8f9956')
        //     .send({ from: '0xf57B0adC78461888BF32d5FB92784CF3FC8f9956' }, function (err, tx) {
        //         console.log('callback: tx=', tx);
        //         console.log('callback: err=', err);
        //     }
        // );
        // console.log('awaited: ', tx);

        // https://github.com/trufflesuite/truffle/issues/624
        /*console.dir(acm.contract);
        console.time('send mintTx');
        const tx = await acm.mintEeuBatch // not a web3 contract instance, but a TruffleContract instance
            //.sendTransaction
            (CONST.eeuType.UNFCCC, CONST.ktCarbon, 1, accounts[0], { from: accounts[0] }
                // TruffleContact has no callback
                // , function (err, txHash) {
                //     console.log(txHash);
                // }
            )
            ;
            // .then(tx => {
            //     console.log('tx: ', tx);
            //     return tx;
            // });

        console.dir(tx);
        console.timeEnd('send mintTx');*/
    });

});