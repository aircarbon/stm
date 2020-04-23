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

contract("StMaster", accounts => {
    var stm;

    var usdFT, usdFT_underlyer, usdFT_refCcy; // usd FT
    var spotTypes, ccyTypes;

    // TODO: negative tests...

    before(async function () {
        stm = await st.deployed();
        if (await stm.getContractType() == CONST.contractType.CASHFLOW) this.skip();
        await stm.sealContract();
        await require('../test/testSetupContract.js').setDefaults({ stm, accounts });
        if (!global.TaddrNdx) global.TaddrNdx = 0;

        ccyTypes = (await stm.getCcyTypes()).ccyTypes;
        spotTypes = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);

        // add test FT type - USD
        const ftTestName_USD = `FT_USD_${new Date().getTime()}`;
        const addFtTx_USD = await stm.addSecTokenType(ftTestName_USD, CONST.settlementType.FUTURE, { ...CONST.nullFutureArgs,
              expiryTimestamp: DateTime.local().plus({ days: 30 }).toMillis(),
              underlyerTypeId: spotTypes[0].id,
                     refCcyId: ccyTypes.find(p => p.name === 'USD').id,
                 contractSize: FT_SIZE.toString(),
        });
        usdFT = (await stm.getSecTokenTypes()).tokenTypes.filter(p => p.name == ftTestName_USD)[0];
        usdFT_underlyer = spotTypes.filter(p => p.id == usdFT.ft.underlyerTypeId)[0];
        usdFT_refCcy = ccyTypes.filter(p => p.id == usdFT.refCcyId)[0];
    });

    beforeEach(async () => {
        global.TaddrNdx += 2;
        if (CONST.logTestAccountUsage)
            console.log(`addrNdx: ${global.TaddrNdx} - contract @ ${stm.address} (owner: ${accounts[0]})`);
    });

    it(`FT pos-combine - should combine 2 positions`, async () => {
        const A = accounts[global.TaddrNdx], B = accounts[global.TaddrNdx + 1];
        
        await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: -1, qty_B: +1, price: 100 });
        const posId = Number(await stm.getSecToken_countMinted()) - 1;

        await futuresHelper.openFtPos({ stm, accounts, tokTypeId: usdFT.id, ledger_A: A, ledger_B: B, qty_A: -1, qty_B: +1, price: 100 });
        const childId = Number(await stm.getSecToken_countMinted()) - 1;

        const data = stm.combineFtPos({ tokTypeId: usdFT.id, master_StId: posId, child_StIds: [childId] });
        //...
        truffleAssert.prettyPrintEmittedEvents(data.tx);
        //truffleAssert.eventEmitted(data.tx, 'xxx', ev => ev.delta.isZero() && ev.done.isZero());
    });
});
