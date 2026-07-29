/**
 * 004_ampliar_codigo_version.js
 * El código de versión ahora se arma con el nombre completo del planograma
 * (hasta 200 caracteres, ver Planograma.nombre) más el sufijo de tipo/tienda,
 * por lo que los 50 caracteres definidos en la migración 001 se quedan cortos.
 */

exports.up = async function (knex) {
  await knex.schema.alterTable('PlanogramaVersion', (t) => {
    t.string('codigo', 250).nullable().alter();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('PlanogramaVersion', (t) => {
    t.string('codigo', 50).nullable().alter();
  });
};
