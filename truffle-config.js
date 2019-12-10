/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like truffle-hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a MNEMONIC - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */
require('dotenv').config();
const Web3 = require("web3");
const web3 = new Web3();

const HDWalletProvider = require("@truffle/hdwallet-provider");

// wallet seed (only needed for public testnets: ropsten & rinkeby - manage wallet with MetaMask)
const MNEMONIC = 'educate school blast ability display bleak club soon curve car oil ostrich';
const gweiDeployment = "40";

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */

  networks: {
    solc: {
      optimizer: {
        enabled: true,
        runs: 100
      }
    },

    // Useful for testing. The `development` name is special - truffle uses it by default
    // if it's defined here and no other network is specified at the command line.
    // You should run a client (like ganache-cli, geth or parity) in a separate terminal
    // tab if you use this network and you must also set the `host`, `port` and `network_id`
    // options below to some value.
    //
    // development: { // for "truffle develop"  (built-in ganache, max 10 accounts)
    //     host: "127.0.0.1",
    //     port: 9545,
    //     network_id: "*",
    // },
    development: {
      // for "truffle test" -- with manually launched "ganache-cli -a 1000" (1000 test accounts)
      host: process.env.GANACHE_HOST || "127.0.0.1",
      port: 8545,
      gas: 6000000,
      network_id: "*"
    },

    // aircarbon ropsten geth node -- a bit faster than infura, but representative of mainnet
    ropsten_ac: {
      provider: () => new HDWalletProvider(MNEMONIC, "https://ac-dev0.net:9545",
                      0, 888), // # test accounts
      network_id: "*",  
      gas: 6000000,
      gasPrice: web3.utils.toWei(gweiDeployment, "gwei")
    },

    // aircarbon private testnet geth node
    testnet_ace: {
      provider: () => new HDWalletProvider(MNEMONIC, "https://ac-dev1.net:9545",
                      0, 888), // # test accounts
      network_id: "*",
      gas: 6000000,
      gasPrice: web3.utils.toWei(gweiDeployment, "gwei")
    },

    // ropsten infura -- much slower than rinkeby infura
    ropsten_infura: {
      provider: () => new HDWalletProvider(MNEMONIC, "https://ropsten.infura.io/v3/93db2c7fd899496d8400e86100058297",
                      0, 888), // # test accounts
      network_id: "*",
      gas: 6000000,
      gasPrice: web3.utils.toWei(gweiDeployment, "gwei")
    },

    rinkeby_infura: {
      provider: () => new HDWalletProvider(MNEMONIC, "https://rinkeby.infura.io/v3/93db2c7fd899496d8400e86100058297",
                      0, 888), // # test accounts
      network_id: "*",
      gas: 6000000,
      gasPrice: web3.utils.toWei(gweiDeployment, "gwei")
    }

    // Another network with more advanced options...
    // advanced: {
    // port: 8777,             // Custom port
    // network_id: 1342,       // Custom network
    // gas: 8500000,           // Gas sent with each transaction (default: ~6700000)
    // gasPrice: 20000000000,  // 20 gwei (in wei) (default: 100 gwei)
    // from: <address>,        // Account to send txs from (default: accounts[0])
    // websockets: true        // Enable EventEmitter interface for web3 (default: false)
    // },

    // Useful for deploying to a public network.
    // NB: It's important to wrap the provider as a function.
    // ropsten: {
    // provider: () => new HDWalletProvider(MNEMONIC, `https://ropsten.infura.io/v3/YOUR-PROJECT-ID`),
    // network_id: 3,       // Ropsten's id
    // gas: 5500000,        // Ropsten has a lower block limit than mainnet
    // confirmations: 2,    // # of confs to wait between deployments. (default: 0)
    // timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
    // skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    // },

    // Useful for private networks
    // private: {
    // provider: () => new HDWalletProvider(MNEMONIC, `https://network.io`),
    // network_id: 2111,   // This network is yours, in the cloud.
    // production: true    // Treats this network as if it was a public net. (default: false)
    // }
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    timeout: 0,
    enableTimeouts: false,
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: 'usd',
      gasPrice: 20
       //, url: 'https://ac-dev0.net:9545'
    }
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.5.13", // Fetch exact version from solc-bin (default: truffle's version)
      docker: false, // Use "0.5.8" you've installed locally with docker (default: false)
      settings: {
        // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 100
        },
        evmVersion: "byzantium"
      }
    }
  },

  all: false,
  compileAll: false,
};
