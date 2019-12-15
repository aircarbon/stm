const assert = require('assert');
//const acmJson = require('../build/contracts/StMaster.json');
//const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');

require('dotenv').config();

const CONST = require('../const.js');

describe('Contract Web3 Interface', async () => {

    //
    // can run these to test web3 more quickly, e.g.
    //      Dev: ("export NETWORK=development && mocha test_web3 --timeout 120000 --exit")
    //  Ropsten: ("export NETWORK=ropsten_ac && mocha test_web3 --timeout 120000 --exit")
    //

    var OWNER,  OWNER_NDX,  OWNER_privKey;
    var WHITE,  WHITE_NDX,  WHITE_privKey;
    var GRAY_1, GRAY_1_NDX, GRAY_1_privKey;
    var GRAY_2, GRAY_2_NDX, GRAY_2_privKey;

    before(async () => {
        if (!global.TaddrNdx) global.TaddrNdx = 1;   // whitelist (exchange) test addr; managed by tests
        if (!global.XaddrNdx) global.XaddrNdx = 800; // graylist (erc20) test addr; managed by tests
        
        OWNER_NDX = 0;
        WHITE_NDX = global.TaddrNdx + 0;
        GRAY_1_NDX = global.XaddrNdx + 0;
        GRAY_2_NDX = global.XaddrNdx + 1;

        const { addr: WHITE,  privKey: WHITE_privKey  } = await CONST.getAccountAndKey(WHITE_NDX);
        const { addr: GRAY_1, privKey: GRAY_1_privKey } = await CONST.getAccountAndKey(GRAY_1_NDX);
        const { addr: GRAY_2, privKey: GRAY_2_privKey } = await CONST.getAccountAndKey(GRAY_2_NDX);

        // setup - whitelist A, mint for A, transferOrTrade A -> GRAY_1
        try {
            const whitelistTx = await CONST.web3_callOwnerMethod('whitelist', [ WHITE ]);
        } catch(ex) {
            if (ex.toString().includes("Already whitelisted")) console.log('(already whitelisted - nop)');
            else throw(ex);
        }

        // setup - mint for A
        const mintTx = await CONST.web3_callOwnerMethod('mintSecTokenBatch', [
            CONST.tokenType.VCS,    CONST.tonCarbon, 1,      WHITE, CONST.nullFees, [], [],
        ]);

        // setup - transferOrTrade A -> GRAY_1
        const transferTradeTx = await CONST.web3_callOwnerMethod('transferOrTrade', [ {
                ledger_A: WHITE,                               ledger_B: GRAY_1,
                   qty_A: CONST.tonCarbon,                tokenTypeId_A: CONST.tokenType.VCS,
                   qty_B: 0,                              tokenTypeId_B: 0,
            ccy_amount_A: 0,                                ccyTypeId_A: 0,
            ccy_amount_B: 0,                                ccyTypeId_B: 0,
               applyFees: false,
            feeAddrOwner: CONST.nullAddr
        }]);

        // setup - fund GRAY_1 eth
        //...
    });

    // it('web3 direct - misc - should be able to derive exchange whitelist addresses and private keys from the mnemonic phrase', async () => {
    //     const { addr: fromAddr, privKey: fromPrivKey } = await CONST.getAccountAndKey(0);
    //     const { addr: toAddr,   privKey: toPrivKey }   = await CONST.getAccountAndKey(1);
    //     assert(fromPrivKey == '0cf8f198ace6d2d92a2c1cd7f3fc9b42e2af3b7fd7e64371922cb73a81493c1a');
    // });

    // it('Should be able to send ETH from exchange whitelist addresses', async function(done) {
    //     const data = await CONST.web3_sendEthTestAddr(0, 1, "0.01");
    //     console.log('web3_sendEthTestAddr resolved:', data);
    //     //return CONST.web3_sendEthTestAddr(0, 1, "0.01");
    // });

    // ## ropsten: "Error: insufficient funds for gas * price + value"
    it('web3 direct - erc20 - should be able to send from graylist addr to whitelist addr (i.e. DEPOSIT: erc20 => exchange)', async () => {
        //... 
    }); // state: 1000 STs back to WHITE

    // ##. ropsten: "insufficient data for uint256 type (arg="fee_tok_B", coderType="uint256", value="0x00000000")"
    // ?? expecting "insufficient funds"
    it('web3 direct - erc20 - should be able to send from graylist addr to graylist addr (i.e. erc20 => erc20)', async () => {
        //...
    });
});

  