// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

// Re: StFutures.sol => FuturesLib.sol
const st = artifacts.require('StMaster');
const truffleAssert = require('truffle-assertions');

const acmJson = require('../build/contracts/StMaster.json');
const Web3 = require('web3');
const abi = acmJson['abi'];
const EthereumJsTx = require('ethereumjs-tx');
const BN = require('bn.js');

const { DateTime } = require('luxon');

const futuresHelper = require('../test/futuresHelper.js');
const CONST = require('../const.js');
const setupHelper = require('../test/testSetupContract.js');

contract("StMaster", accounts => {
    var stm;
    var usdFT, usdFT_underlyer, usdFT_refCcy; // usd FT
    
    var ccyTypes, spotTypes;

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() != CONST.contractType.COMMODITY) this.skip();
        
        await setupHelper.whitelistAndSeal({ stm, accounts });
        await setupHelper.setDefaults({ stm, accounts });
        
        if (!global.TaddrNdx) global.TaddrNdx = 0;

        // add test FT type - USD
        ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        const ftTestName_USD = `FT_USD_${new Date().getTime()}`;
        const addFtTx_USD = await stm.addSecTokenType(ftTestName_USD, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
              expiryTimestamp: DateTime.local().plus({ days: 30 }).toMillis(),
              underlyerTypeId: spotTypes[0].id,
                     refCcyId: ccyTypes.find(p => p.name === 'USD').id,
                 contractSize: 1000,
               initMarginBips: 5000,    // 50%
                varMarginBips: 5000,    // 50%
        }, CONST.nullAddr);
        usdFT = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_USD)[0];
        usdFT_underlyer = spotTypes.filter(p => p.id == usdFT.ft.underlyerTypeId)[0];
        usdFT_refCcy = ccyTypes.filter(p => p.id == usdFT.refCcyId)[0];
    });

    beforeEach(async () => {
        global.TaddrNdx++;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`FT max margin - should be able to open an unleveraged futures position (100% margin)`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        const FEE_PER_CONTRACT = new BN(0), POS_QTY = new BN(1), CONTRACT_PRICE = new BN(1);
        await stm.setFuture_FeePerContract(usdFT.id, FEE_PER_CONTRACT);
        
        const NOTIONAL = new BN(usdFT.ft.contractSize).mul(POS_QTY).mul(CONTRACT_PRICE);

        const POS_MARGIN = (((new BN(10000)           // total margin, bips - 100%
                              .mul(new BN(1000000)))  // increase precision
                             .div(new BN(10000)))     // bips
                            .mul(NOTIONAL))
                           .div(new BN(1000000));     // decrease precision
        const CHECK = Math.floor(Number(NOTIONAL) * 1.0); // 100%
        assert(CHECK == POS_MARGIN);

        const MIN_BALANCE = FEE_PER_CONTRACT.mul(POS_QTY).add(new BN(POS_MARGIN));
        //console.log('NOTIONAL $', Number(NOTIONAL.toString())/100);
        //console.log('POS_MARGIN $', Number(POS_MARGIN.toString())/100);
        //console.log('MIN_BALANCE $', Number(MIN_BALANCE.toString())/100);
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.toString(), A, 'TEST');
        await stm.fundOrWithdraw(CONST.fundWithdrawType.FUND, usdFT.ft.refCcyId, MIN_BALANCE.toString(), B, 'TEST');

        const x = await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: POS_QTY, qty_B: POS_QTY.neg(), price: CONTRACT_PRICE });
        assert(new BN(x.ledger_A.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN), 'unexpected reserve ledger A');
        assert(new BN(x.ledger_B.ccys.find(p => p.ccyTypeId == usdFT.ft.refCcyId).reserved).eq(POS_MARGIN), 'unexpected reserve ledger B');
        await CONST.logGas(web3, x.tx, `Open futures position (USD)`);
    });

});
