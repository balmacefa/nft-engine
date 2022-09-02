const pgString = require('pg-connection-string');

module.exports = ({ env }) => ({
    connection: {
        client: 'postgres',
        connection: {
            host: pgString.parse(env("DATABASE_URL", "EMPTY")).host,
            port: pgString.parse(env("DATABASE_URL", "EMPTY")).port,
            database: pgString.parse(env("DATABASE_URL", "EMPTY")).database,
            user: pgString.parse(env("DATABASE_URL", "EMPTY")).user,
            password: pgString.parse(env("DATABASE_URL", "EMPTY")).password,
            ssl: {
                rejectUnauthorized: false
            },
        },
        debug: false,
    },
});
