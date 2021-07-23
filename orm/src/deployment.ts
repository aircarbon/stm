import { getPool } from "./pool";

const sql = require("mssql");

/**
 * Get deployment by network id
 * @param networkId
 */

/**
 * Get all deployed contract by network and ignore all cash flow base
 * @param networkId string
 */
export async function GetDeployedContracts(networkId: string) {
  const sqlPool = await getPool("admin");
  const result =
    await // AND clause stops all but latest verions being returned on dev networks
    sqlPool
      .request()
      .input("network_id", sql.NVarChar, networkId)
      .input("contract_type", sql.NVarChar, "CASHFLOW_BASE")
      .query(`SELECT DISTINCT a.[contract_enum] FROM [contract] a WHERE a.[network_id] = @network_id \
            AND a.[contract_type] NOT LIKE @contract_type
            AND\
              (a.[contract_ver] = (SELECT TOP 1 [contract_ver] FROM [contract] WHERE [contract_enum] = a.[contract_enum] AND [contract_type] = a.[contract_type] ORDER BY [id] DESC)\
               OR a.[network_id] = 1 OR a.[network_id] = 3 OR a.[network_id] = 4 OR a.[contract_type] != @contract_type)\
            ORDER BY 1 DESC`);
  return result;
}

/**
 * Get deploy contract with network and contract name
 * @param networkId
 * @param contractName
 */

export async function GetDeployedContractVersions(
  networkId: string,
  contractName: string
) {
  const sqlPool = await getPool("admin");
  const result = await sqlPool
    .request()
    .input("network_id", sql.NVarChar, networkId)
    .input("contract_enum", sql.NVarChar, contractName)
    .query(
      `SELECT DISTINCT [contract_ver] FROM [contract] WHERE [network_id] = @network_id AND [contract_enum] = @contract_enum ORDER BY 1 DESC`
    );
  return result;
}

/**
 * Get deploy contract by network id, name and version
 * @param networkId
 * @param contractName
 * @param contractVer
 */

export async function GetDeployment(
  networkId: string,
  contractName: string,
  contractVer: string
) {
  const sqlPool = await getPool("admin");
  const result = await sqlPool
    .request()
    .input("network_id", sql.NVarChar, networkId)
    .input("contract_enum", sql.NVarChar, contractName)
    .input("contract_ver", sql.NVarChar, contractVer)
    .query(
      `SELECT TOP 1 * FROM [contract] \
       WHERE [network_id] = @network_id \
       AND [contract_enum] = @contract_enum \
       AND [contract_ver] = @contract_ver \
       ORDER BY [deployed_utc] DESC`
    );
  return result;
}

/**
 * Get deploy contract by network id and address
 * @param networkId
 * @param contractAddr
 */
export async function GetDeploymentByAddress(
  networkId: string,
  contractAddr: string
) {
  const sqlPool = await getPool("admin");
  const result = await sqlPool
    .request()
    .input("network_id", sql.NVarChar, networkId)
    .input("addr", sql.NVarChar, contractAddr)
    .query(
      `SELECT TOP 1 * FROM [contract] \
            WHERE [network_id] = @network_id \
            AND [addr] = @addr \
            ORDER BY [deployed_utc] DESC`
    );
  return result;
}

// Ref https://github.com/tediousjs/node-mssql/issues/313#issuecomment-409879580
/**
 * @param request sql request object
 * @param {string} columnName sql table column name
 * @param {string} paramNamePrefix prefix for parameter name
 * @param type parameter type
 * @param {Array<string>} values an array of values
 */
function parameterizedQueryForInWithGroupBy({
  request,
  columnName,
  parameterNamePrefix,
  type,
  values,
}: {
  request: any;
  columnName: string;
  parameterNamePrefix: string;
  type: string;
  values: string | string[] | number[];
}) {
  const parameterNames = [];
  for (let index = 0; index < values.length; index += 1) {
    const parameterName = parameterNamePrefix + index;
    request.input(parameterName, type, values[index]);
    parameterNames.push(`@${parameterName}`);
  }
  return `${columnName} IN (${parameterNames.join(
    ","
  )}) group by ${columnName}`;
}

/**
 * Get deploy contract by network id and address
 * @param networkId
 * @param contractAddresses
 */
export async function GetDeploymentsByAddresses(
  networkId: string,
  contractAddresses: Array<string>
) {
  const sqlPool = await getPool("admin");
  const request = await sqlPool.request();
  const parameterizedQuery = `SELECT * FROM [contract] WHERE [network_id] = @network_id AND [id] IN (
    SELECT MAX(id) FROM [contract] WHERE
      ${parameterizedQueryForInWithGroupBy({
        request,
        columnName: "[addr]",
        parameterNamePrefix: "addr",
        type: sql.NVarChar,
        values: contractAddresses,
      })}
  )`;
  const result = await request
    .input("network_id", sql.NVarChar, networkId)
    .query(parameterizedQuery);
  return result;
}

/**
 * Get deploy contract by network id and name
 * @param networkId
 * @param contractName
 */
export async function GetDeploymentByName(
  networkId: string,
  contractName: string
) {
  const sqlPool = await getPool("admin");
  const result = await sqlPool
    .request()
    .input("network_id", sql.NVarChar, networkId)
    .input("contract_enum", sql.NVarChar, contractName)
    .query(
      `SELECT TOP 1 * FROM [contract] \
            WHERE [network_id] = @network_id \
            AND [contract_enum] = @contract_enum \
            ORDER BY [deployed_utc] DESC`
    );
  return result;
}

/**
 * Get deploy contract by network id and type
 * @param networkId
 * @param contractType
 */
export async function GetDeploymentByType(
  networkId: string,
  contractType: string
) {
  const sqlPool = await getPool("admin");
  const result = await sqlPool
    .request()
    .input("network_id", sql.NVarChar, networkId)
    .input("contract_type", sql.NVarChar, contractType)
    .query(
      `SELECT TOP 1 * FROM [contract] \
            WHERE [network_id] = @network_id \
            AND [contract_type] = @contract_type \
            ORDER BY [deployed_utc] DESC`
    );
  return result;
}

/**
 * Save deployment contract
 * @param contract
 */
export async function SaveDeployment({
  contractName,
  contractVer,
  networkId,
  deployedAddress,
  deployedAbi,
  deployerHostName,
  deployerIpv4,
  contractType,
  txHash,
  symbol,
}: {
  contractName: string;
  contractVer: string;
  networkId: string;
  deployedAddress: string;
  deployedAbi: string;
  deployerHostName: string;
  deployerIpv4: string;
  contractType: string;
  txHash: string;
  symbol: string;
}) {
  const sqlPool = await getPool("erc20");
  const result = await sqlPool
    .request()
    .input("contract_enum", sql.NVarChar, contractName)
    .input("network_id", sql.Int, networkId)
    .input("addr", sql.NVarChar, deployedAddress)
    .input("host_name", sql.NVarChar, deployerHostName)
    .input("ip_v4", sql.NVarChar, deployerIpv4)
    .input("abi", sql.NVarChar, deployedAbi)
    .input("contractVer", sql.NVarChar, contractVer)
    .input("contractType", sql.NVarChar, contractType)
    .input("txHash", sql.NVarChar, txHash)
    .input("symbol", sql.NVarChar, symbol)
    .query(
      `INSERT INTO [contract] VALUES \
      (@contract_enum, @network_id, GETUTCDATE(), @addr, @host_name, @ip_v4, @abi, @contractVer, @contractType, @txHash, @symbol)`
    );
  console.log(
    `DB: saved contract deployment network ${networkId} @ ${deployedAddress} - ok`,
    result.rowsAffected
  );
  return true;
}
