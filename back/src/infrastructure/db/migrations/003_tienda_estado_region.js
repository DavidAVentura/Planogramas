/**
 * 003_tienda_estado_region.js
 * Tienda necesita estado (activo/inactivo) y region para el contrato del módulo de
 * tiendas (filtro por estado, default 'activo'; region en la respuesta de listado).
 * La migración 001 no los incluyó porque en ese momento el módulo de tiendas no
 * estaba en desarrollo.
 */

exports.up = async function (knex) {
  await knex.schema.table('Tienda', (t) => {
    t.string('estado', 20).notNullable().defaultTo('activo');
    t.string('region', 200).nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.table('Tienda', (t) => {
    t.dropColumn('estado');
    t.dropColumn('region');
  });
};
