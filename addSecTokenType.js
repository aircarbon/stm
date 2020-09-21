const BN = require('bn.js');
const CONST = require('./const.js');
const chalk = require('chalk');

process.env.WEB3_NETWORK_ID = Number(process.env.NETWORK_ID || 42101);

async function addSecTokenType() {
    const nameOverride = undefined;
    console.log(chalk.inverse('addSecTokenType [American Nature Token] >> start...'));
    console.group();
    const O = await CONST.getAccountAndKey(0);

    if ((await CONST.web3_call('getContractType', [], nameOverride)) == CONST.contractType.COMMODITY) {
        console.log(chalk.inverse('devSetupContract >> commodity contract...'));
        // add spot types
        const spotTypes = (await CONST.web3_call('getSecTokenTypes', [], nameOverride)).tokenTypes.filter(p => p.settlementType == CONST.settlementType.SPOT);
        //console.log('spotTypes', spotTypes.map(p => { return { id: p.id, name: p.name } }));
        await addSecTokenIfNotPresent(spotTypes, 'CORSIA Eligible Token', O, nameOverride);
    }
    
    console.groupEnd();
    console.log(chalk.inverse('addSecTokenType >> DONE'));
};

async function addSecTokenIfNotPresent(spotTypes, name, O, nameOverride) {
    if (!spotTypes.some(p => p.name == name)) { await CONST.web3_tx('addSecTokenType',
        [ name, CONST.settlementType.SPOT, CONST.nullFutureArgs, CONST.nullAddr ], O.addr, O.privKey, nameOverride); }
    else console.log(chalk.gray(`${name} already present; nop.`));
}

addSecTokenType();