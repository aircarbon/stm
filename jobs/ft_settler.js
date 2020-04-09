require('dotenv').config();
const { web3_call } = require('../const.js');
const { db } = require('../../common/dist');

module.exports = {

    FT_Maintain: async () => {
        const contractSealed = await web3_call('getContractSeal', []);
      
        console.log('hello futures world! contractSeal=', contractSealed);
    },

}
