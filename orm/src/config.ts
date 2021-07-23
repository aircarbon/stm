function getConfig(scope: string, key: string) {
  if (process.env[key] != null) return process.env[key];
  if (process.env[`${scope}_${key}`] != null) return process.env[`${scope}_${key}`];

  console.error(`### missing config!: ${key} in ${scope}`);
  return null;
}

export default function sqlConfig(scope: string) {
  return {
    // https://www.npmjs.com/package/mssql#tedious
    user: getConfig(scope, 'sql_user'),
    port: Number(getConfig(scope, 'sql_port')),
    password: getConfig(scope, 'sql_password'),
    server: getConfig(scope, 'sql_server'),
    database: getConfig(scope, 'sql_database'),

    connectionTimeout: 30000,
    requestTimeout: 30000,

    pool: {
      // https://github.com/coopernurse/node-pool
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },

    options: {
      enableArithAbort: true,
      // trustServerCertificate: true,
      encrypt: false, // refer https://github.com/tediousjs/node-mssql/issues/993
    },
  };
}
