module.exports = {
    get: function (key) {
        if (process.env[key] != null) return process.env[key];

        var config_json = require('./config.json');

        if (config_json[key] != null) return config_json[key];

        console.error(`### missing config!: ${key}`);

        return null;
    },

    sql_config: function () {
        return {
            // https://www.npmjs.com/package/mssql#tedious
            user: this.get('sql_user'),
            port: this.get('sql_port'),
            password: this.get('sql_password'),
            server: this.get('sql_server'),
            database: this.get('sql_database'),

            connectionTimeout: 3000,
            requestTimeout: 3000,

            pool: {
                // https://github.com/coopernurse/node-pool
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000,
            },

            options: {
                encrypt: true, // Use this if you're on Windows Azure
            },
        };
    },
};
