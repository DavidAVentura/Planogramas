/**
 * 018_autor_nombre_evidencia_adjunto.js
 * Agrega `subido_por_nombre` (nvarchar(150) NULL) a EvidenciaImplementacion y Adjunto: nombre de
 * quien cargó el archivo, tomado del token CAO al momento de la carga. `subido_por` sigue siendo
 * el número de empleado.
 *
 * Retrocompatible: columna nullable sin default (cambio de metadatos); las filas existentes quedan
 * en NULL (sin relleno, por decisión del usuario). Idempotente (hasColumn).
 * El `down` pierde los nombres capturados: no se pueden reconstruir.
 * No aplicar en PROD sin pedido explícito y siguiendo el procedimiento de migraciones de PROD
 * vigente (DT-08).
 */

const TABLAS = ['EvidenciaImplementacion', 'Adjunto'];

exports.up = async function (knex) {
  for (const tabla of TABLAS) {
    if (!await knex.schema.hasColumn(tabla, 'subido_por_nombre')) {
      await knex.schema.alterTable(tabla, (t) => {
        t.string('subido_por_nombre', 150).nullable();
      });
    }
  }
};

exports.down = async function (knex) {
  for (const tabla of [...TABLAS].reverse()) {
    if (await knex.schema.hasColumn(tabla, 'subido_por_nombre')) {
      await knex.schema.alterTable(tabla, (t) => {
        t.dropColumn('subido_por_nombre');
      });
    }
  }
};
