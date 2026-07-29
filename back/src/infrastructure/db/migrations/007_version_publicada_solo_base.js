/**
 * 007_version_publicada_solo_base.js
 * UQ_Version_publicada (migración 001) aplicaba la unicidad "una sola versión
 * publicada por planograma+tipo" a todas las versiones por igual, incluyendo
 * las especiales por tienda (version_base_id NOT NULL). Se corrige para que
 * la regla aplique solo a la línea base, igual que UQ_Version_borrador /
 * UQ_Version_en_desarrollo / UQ_Version_piloto (migración 006).
 */

exports.up = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS UQ_Version_publicada ON PlanogramaVersion');

  await knex.raw(`
    CREATE UNIQUE INDEX UQ_Version_publicada
    ON PlanogramaVersion (planograma_id, tipo)
    WHERE estado = 'publicado' AND version_base_id IS NULL
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS UQ_Version_publicada ON PlanogramaVersion');

  await knex.raw(`
    CREATE UNIQUE INDEX UQ_Version_publicada
    ON PlanogramaVersion (planograma_id, tipo)
    WHERE estado = 'publicado'
  `);
};
