const sql = require('mssql');
const CONST = require('./const.js');
const config = require('./config.js');

var poolConnected = false;
var sql_pool;

module.exports = {
    SaveDeployment: async function (contractName, networkId, deployedAddress, hostName, ipv4) {
        // write deployment to contract table
        await SetupPool();
        try {
            const result = await sql_pool
                .request()
                .input('contract_enum', sql.NVarChar, contractName)
                .input('network_id', sql.Int, networkId)
                .input('addr', sql.NVarChar, deployedAddress)
                .input('host_name', sql.NVarChar, hostName)
                .input('ip_v4', sql.NVarChar, ipv4)
                .query(
                    `INSERT INTO [contract] VALUES (@contract_enum, @network_id, GETUTCDATE(), @addr, @host_name, @ip_v4)`
                );
            console.log('DB: saved contract deployment - ok', result.rowsAffected);
        } catch (err) {
            console.error(`DB: ## save contract deployment - SQL failed: ${err.message}`);
        }
    },
};

async function SetupPool() {
    if (!poolConnected) {
        sql_pool = new sql.ConnectionPool(config.sql_config());
        sql.on('error', err => console.warn(`DB: ## (err global): ${err.message}`, err));
        try {
            await sql_pool.connect();
            poolConnected = true;
            //.then(() => console.log(`SQL pool connected ok`))
            //.catch((err) => console.error(`## failed to connect to SQL pool: ${err.message}`))
        } catch (err) {
            console.error(`DB: ## failed to connect to SQL pool: ${err.message}`);
        }
    }
}
