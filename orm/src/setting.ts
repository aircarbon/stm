import { getPool } from './pool';

const sql = require('mssql');

/**
 * Save key value setting
 * @param configKey
 * @param configValue
 */
export async function AddConfigSetting(configKey: string, configValue: string) {
  const sqlPool = await getPool('erc20');
  const result = await sqlPool
    .request()
    .input('config_key', sql.NVarChar(128), configKey)
    .input('config_value', sql.NVarChar(128), configValue)
    .query(`INSERT INTO [global_config] VALUES (@config_key, @config_value)`);
  return result;
}

/**
 * Save whitelist address
 * @param addr
 */
export async function AddWhitelistAddress(addr: string) {
  const sqlPool = await getPool('erc20');
  const result = await sqlPool
    .request()
    .input('addr', sql.NVarChar(42), addr.substr(0, 42))
    .query(`INSERT INTO [whitelist_addr] VALUES (@addr)`);
  return result;
}

/**
 * Get next available address
 */
export async function GetAvailableWhitelistAddress() {
  const sqlPool = await getPool('admin');
  const result = await sqlPool.request().input('config_key', sql.NVarChar(128), 'next_wl_index')
    .query(`SELECT * FROM [whitelist_addr]
            WHERE id = (SELECT TOP 1 [config_value] FROM [global_config] WHERE config_key = @config_key)`);
  return result;
}

/**
 * Get next available address
 */
export async function GetTotalWhitelistAddress() {
  const sqlPool = await getPool('erc20');
  const result = await sqlPool
    .request()
    .input('config_key', sql.NVarChar(128), 'next_wl_index')
    .query(`SELECT COUNT(*) as total FROM [whitelist_addr]`);
  return result;
}
