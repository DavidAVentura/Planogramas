/**
 * knexfile.js — configuración del CLI de Knex para migraciones.
 * Uso:
 *   npx knex migrate:latest    → aplica migraciones pendientes
 *   npx knex migrate:rollback  → revierte la última migración
 *   npx knex migrate:status    → muestra el estado de cada migración
 */

require('dotenv').config();

/** @type {import('knex').Knex.Config} */
module.exports = {
  client: 'mssql',
  connection: {
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT) || 1433,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt:                process.env.DB_ENCRYPT                === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    },
  },
  migrations: {
    directory: './src/infrastructure/db/migrations',
    tableName:  'knex_migrations',
  },
};
