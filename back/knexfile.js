/**
 * knexfile.js — configuración del CLI de Knex para migraciones.
 * Uso:
 *   npm run migrate           → aplica migraciones pendientes
 *   npm run migrate:rollback  → revierte la última migración
 *   npm run migrate:status    → muestra el estado de cada migración
 */

const env = require('./src/config/env');

/** @type {import('knex').Knex.Config} */
module.exports = {
  client: 'mssql',
  connection: {
    host:     env.db.host,
    port:     env.db.port,
    database: env.db.name,
    user:     env.db.user,
    password: env.db.password,
    options: {
      encrypt:                env.db.encrypt,
      trustServerCertificate: env.db.trustServerCertificate,
    },
  },
  migrations: {
    directory: './src/infrastructure/db/migrations',
    tableName:  'knex_migrations',
  },
};
