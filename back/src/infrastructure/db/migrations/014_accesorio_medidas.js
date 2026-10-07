/**
 * 014_accesorio_medidas.js
 * Medidas del accesorio de catálogo: alto, ancho y profundidad (cm, DECIMAL(8,2)).
 *
 * - Accesorio.longitud_cm se renombra a profundidad_cm: ya se usaba como cuánto sobresale el
 *   accesorio (ej. largo de un gancho), que es su profundidad.
 * - Accesorio.alto_cm: medida nueva.
 *
 * Al aplicarla no había datos reales en el catálogo; el renombre conserva los valores existentes.
 */

exports.up = async function (knex) {
  await knex.raw("EXEC sp_rename 'Accesorio.longitud_cm', 'profundidad_cm', 'COLUMN'");
  await knex.raw('ALTER TABLE Accesorio ADD alto_cm DECIMAL(8,2) NULL');
};

exports.down = async function (knex) {
  await knex.raw('ALTER TABLE Accesorio DROP COLUMN alto_cm');
  await knex.raw("EXEC sp_rename 'Accesorio.profundidad_cm', 'longitud_cm', 'COLUMN'");
};
