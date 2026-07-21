/**
 * 006_versiones_unicidad_por_estado.js
 * Hasta ahora solo existía un índice único filtrado para el estado 'publicado'
 * (UQ_Version_publicada, migración 001). El resto de la regla "una versión por
 * estado por planograma+tipo" (borrador / en_desarrollo / piloto) solo vivía como
 * una validación de aplicación, sin respaldo en la base de datos. Se agregan los
 * 3 índices que faltan, mismo patrón que el ya existente.
 *
 * La regla "una sola versión por estado" aplica únicamente a la línea base
 * (version_base_id IS NULL) — ver migración 007 para el mismo ajuste sobre
 * UQ_Version_publicada. Las versiones especiales por tienda (version_base_id
 * NOT NULL) quedan fuera de esta unicidad: cada tienda puede tener su propia
 * versión especial en cualquier estado, sin chocar entre sí ni con la base.
 */

exports.up = async function (knex) {
  await knex.raw(`
    CREATE UNIQUE INDEX UQ_Version_borrador
    ON PlanogramaVersion (planograma_id, tipo)
    WHERE estado = 'borrador' AND version_base_id IS NULL
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX UQ_Version_en_desarrollo
    ON PlanogramaVersion (planograma_id, tipo)
    WHERE estado = 'en_desarrollo' AND version_base_id IS NULL
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX UQ_Version_piloto
    ON PlanogramaVersion (planograma_id, tipo)
    WHERE estado = 'piloto' AND version_base_id IS NULL
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS UQ_Version_borrador ON PlanogramaVersion');
  await knex.raw('DROP INDEX IF EXISTS UQ_Version_en_desarrollo ON PlanogramaVersion');
  await knex.raw('DROP INDEX IF EXISTS UQ_Version_piloto ON PlanogramaVersion');
};
