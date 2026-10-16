/**
 * 017_indices_consolidado.js
 * Índices no únicos sobre las FK que recorre el Consolidado Tiendas (módulo 21) al cargar la base
 * de todas las versiones montables. Cierra DT-24 (faltaba el de PosicionAccesorio.posicion_id).
 *
 * Sin tablas ni columnas nuevas; retrocompatible. Idempotente (IF NOT EXISTS) y con nombres fijos.
 * No aplicar en PROD hasta resolver DT-08 (migraciones de PROD sin verificar).
 */

const INDICES = [
  ['IX_Gondola_version', 'Gondola', 'planograma_version_id'],
  ['IX_Nivel_gondola', 'Nivel', 'gondola_id'],
  ['IX_Posicion_nivel', 'Posicion', 'nivel_id'],
  ['IX_PosicionAccesorio_posicion', 'PosicionAccesorio', 'posicion_id'],
  ['IX_VersionTienda_tienda', 'VersionTienda', 'tienda_id'],
];

exports.up = async function (knex) {
  for (const [nombre, tabla, columna] of INDICES) {
    await knex.raw(
      `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = '${nombre}' AND object_id = OBJECT_ID('${tabla}')) ` +
      `CREATE INDEX ${nombre} ON ${tabla}(${columna})`
    );
  }
};

exports.down = async function (knex) {
  for (const [nombre, tabla] of [...INDICES].reverse()) {
    await knex.raw(`DROP INDEX IF EXISTS ${nombre} ON ${tabla}`);
  }
};
