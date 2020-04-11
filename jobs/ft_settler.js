require('dotenv').config();
const { web3_call } = require('../const.js');
const { db } = require('../../common/dist');

module.exports = {

    FT_Maintain: async (ftId, MP) => {
        //const contractSealed = await web3_call('getContractSeal', []);
        //console.log('hello futures world! contractSeal=', contractSealed);

        console.group();
        console.log(`>> SETTLER: ftId=${ftId} MP=${MP}... TODO!`);
        console.groupEnd();
    },

}
