const knex  = require('knex');
const env   = require('../../config/env');

const db = knex({
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
  pool: { min: 2, max: 10 },
});

module.exports = db;
