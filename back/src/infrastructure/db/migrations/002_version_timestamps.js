/**
 * 002_version_timestamps.js
 * PlanogramaVersion necesita created_at/updated_at para los contratos del módulo
 * de versiones (listado, detalle y "guardar" los exponen). La migración 001 no
 * los incluyó porque en ese momento el módulo de versiones no estaba en desarrollo.
 */

exports.up = async function (knex) {
  await knex.schema.table('PlanogramaVersion', (t) => {
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    t.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.table('PlanogramaVersion', (t) => {
    t.dropColumn('created_at');
    t.dropColumn('updated_at');
  });
};
