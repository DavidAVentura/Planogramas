/**
 * 006_versiones_unicidad_por_estado.js
 * Hasta ahora solo existía un índice único filtrado para el estado 'publicado'
 * (UQ_Version_publicada, migración 001). El resto de la regla "una versión por
 * estado por planograma+tipo" (borrador / en_desarrollo / piloto) solo vivía como
 * una validación de aplicación, sin respaldo en la base de datos. Se agregan los
 * 3 índices que faltan, mismo patrón que el ya existente.
 */

exports.up = async function (knex) {
  await knex.raw(`
    CREATE UNIQUE INDEX UQ_Version_borrador
    ON PlanogramaVersion (planograma_id, tipo)
    WHERE estado = 'borrador'
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX UQ_Version_en_desarrollo
    ON PlanogramaVersion (planograma_id, tipo)
    WHERE estado = 'en_desarrollo'
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX UQ_Version_piloto
    ON PlanogramaVersion (planograma_id, tipo)
    WHERE estado = 'piloto'
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS UQ_Version_borrador ON PlanogramaVersion');
  await knex.raw('DROP INDEX IF EXISTS UQ_Version_en_desarrollo ON PlanogramaVersion');
  await knex.raw('DROP INDEX IF EXISTS UQ_Version_piloto ON PlanogramaVersion');
};
