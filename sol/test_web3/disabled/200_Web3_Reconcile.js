// SPDX-License-Identifier: AGPL-3.0-only - (c) AirCarbon Pte Ltd - see /LICENSE.md for Terms
// Author: https://github.com/7-of-9

const assert = require("assert");
const EthereumJsTx = require("ethereumjs-tx");
const chalk = require("chalk");
const BN = require("bn.js");
const db = require("../../orm/build");

const CONST = require("../const.js");
process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 888);

const OWNER_NDX = 0;
var OWNER, OWNER_privKey;

describe(`Contract Web3 Interface`, async () => {
  //
  //  AC various
  //       ("export INSTANCE_ID=local && mocha test_web3 --timeout 10000000 --exit")
  //       ("export INSTANCE_ID=DEV && mocha test_web3 --timeout 10000000 --exit")
  //       ("export INSTANCE_ID=DEMO && mocha test_web3 --timeout 10000000 --exit")
  //       ("export INSTANCE_ID=PROD_56 && mocha test_web3 --timeout 10000000 --exit")
  //

  // iterate over all ledger entries, query all ST quantities...
  it(`web3 direct - reconciliation: _spot_totalMintedQty`, async () => {

    console.log(`name: ${(await await CONST.web3_call("name", []))}`);
    console.log(`version: ${(await await CONST.web3_call("version", []))}`);
    console.log(`unit: ${(await await CONST.web3_call("unit", []))}`);
    console.log(`getSecToken_totalMintedQty: ${(await await CONST.web3_call("getSecToken_totalMintedQty", []))}`);

    CONST.consoleOutput(false);
    //if ((await CONST.web3_call("getContractType", [])) != CONST.contractType.COMMODITY) { this.skip(); return; }
    const types = (await CONST.web3_call("getSecTokenTypes", [])).tokenTypes;
    console.log("types", types.map(p => p.name).join(', '));

    // (A) iterate LEs, get STs from all LEs
    const ledgerOwners = await CONST.web3_call("getLedgerOwners", []);
    console.group("A");
    var tot_minted_A = 0, tot_current_A = 0, tot_countST_A = 0;
    for (var ledgerOwner of ledgerOwners) {
        const ledgerEntry = await CONST.web3_call("getLedgerEntry", [ledgerOwner]);
        const ccyInfo = [], tokInfo = [];
        for (var ccy of ledgerEntry.ccys) {
            ccyInfo.push(`name:${ccy.name} bal:${ccy.balance.toString()}`);
        }
        for (var token of ledgerEntry.tokens) {
            const bn = new BN(token.stId.toString());
            tokInfo.push(chalk.dim(`tokTypeId:${token.tokTypeId} batchId:${token.batchId} stId:0x${bn.toString(16)} currentQty:${token.currentQty} mintedQty:${token.mintedQty}`));
            tot_minted_A += Number(token.mintedQty);
            tot_current_A += Number(token.currentQty);
            tot_countST_A++;
        }
        console.log(`${ledgerOwner} ${ccyInfo.join(" ")}\n\t${tokInfo.join("\n\t")}`);
    }
    console.log(`ledgerOwners.length: ${ledgerOwners.length}`); // prod: 41
    console.log(`tot_countST_A: ${tot_countST_A}`); // prod: 77
    console.log(`tot_minted_A: ${tot_minted_A}`); // prod: 1115266000
    console.log(`tot_current_A: ${tot_minted_A}`); // prod: ...
    console.log(`getSecToken_totalMintedQty: ${(await await CONST.web3_call("getSecToken_totalMintedQty", []))}`); // prod: 1698725000
    console.groupEnd("A");

    // (2) iterate STs directly - TODO: x-ref w/ batch totals, to see which batch/STs have the issue (### 10% discrepancy)
    console.group("B");
    const baseStId = (await CONST.web3_call("getSecToken_BaseId", [])).toString(10);
    const maxStId = (await CONST.web3_call("getSecToken_MaxId", [])).toString(10);
    console.log("baseStId", baseStId);
    console.log("maxStId", maxStId);
    const sts = [];
    var tot_minted_B = 0;
    var tot_countST_B = 0;
    for (var i = baseStId ; i <= maxStId ; i++) {
        const token = (await CONST.web3_call("getSecToken", [i]));
        const bn = new BN(token.stId.toString());
        //if (Number(token.currentQty) != Number(token.mintedQty)) {
            console.log(chalk.dim(`tokTypeId:${token.tokTypeId} batchId:${token.batchId} stId:0x${bn.toString(16)} currentQty:${token.currentQty} mintedQty:${token.mintedQty}`));
        //}
        tot_minted_B += Number(token.mintedQty);
        tot_countST_B++;
        sts.push(token);
    }
    console.log(`tot_countST_B: ${tot_countST_B}`); // 96
    console.log(`tot_minted_B: ${tot_minted_B}`); // prod: 1817787000
    console.log(`getSecToken_totalMintedQty: ${(await await CONST.web3_call("getSecToken_totalMintedQty", []))}`); // prod: 1698725000

    // (3) x-ref w/ batches...
    const maxBatchId = await CONST.web3_call("getSecTokenBatch_MaxId", []);
    const batches = [];
    console.log("maxBatchId", maxBatchId);
    for (var i = 1; i <= maxBatchId ; i++) {
        const batch = await CONST.web3_call("getSecTokenBatch", [i]);
        const sts_forBatch = sts.filter(p => p.batchId == i);
        const sts_totMinted_forBatch = sts_forBatch.map(p => Number(p.mintedQty)).reduce((a,b) => a + b, 0);
        console.log(`got batchid=${i} mintedQty=${batch.mintedQty} #sts_forBatch=${sts_forBatch.length} sts_totMinted_forBatch=${sts_totMinted_forBatch}`);
        batches.push(batch);
    }
    console.groupEnd("B");

    // ... when burning a full ST: it doesn't get removed from the _sts[] list (only from the ledger)
    // (hence difference between tot_countST_B && tot_countST_A?) 
    // #### i.e. the consistency check fail (1) is STILL UNACOUNTED FOR?!

    // that still leaves discrepancy between all STs across all time !== _spot_totalMintedQty (it should be)
  });
});
