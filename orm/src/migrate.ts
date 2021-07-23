import 'reflect-metadata';
import { createConnection } from 'typeorm';

createConnection({
  type: 'mssql',
  port: Number(process.env.sql_port || '1433'),
  host: String(process.env.sql_server || 'localhost'),
  username: String(process.env.sql_user || 'sa'),
  password: String(process.env.sql_password || 'Admin12345'),
  database: String(process.env.sql_database || 'stmdb'),
  synchronize: true,
  logging: true,
  entities: ['src/entity/**/*.ts'],
  migrations: ['src/migration/**/*.ts'],
  subscribers: ['src/subscriber/**/*.ts'],
  cli: {
    entitiesDir: 'src/entities',
    migrationsDir: 'src/migration',
    subscribersDir: 'src/subscriber',
  },
})
  .then(async (connection) => {
    console.log('Here you can setup and run express/koa/any other framework.', connection.options);
    process.exit();
  })
  .catch((error) => console.log(error));
