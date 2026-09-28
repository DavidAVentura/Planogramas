/**
 * 010_auditoria_asignaciones.js
 * Auditoría de qué versión de cada planograma monta cada tienda (vista Estructura).
 *
 * - EdicionAsignacion: un grupo de cambios guardados juntos (un clic en "Guardar asignaciones",
 *   una publicación, una promoción a piloto…). Todos sus registros comparten id, fecha, usuario
 *   y motivo. `origen` distingue lo hecho a mano en Estructura de lo automático.
 * - AsignacionAuditoria: un cambio de una celda planograma × tienda. Guarda id, código y estado
 *   de la versión anterior y la nueva tal como eran en ese momento, porque la "TG" de hoy puede
 *   ser otra PlanogramaVersion distinta a la TG de hace meses, y el código puede editarse.
 *
 * Tabla append-only (mismo criterio que HistorialSustitucion): nunca se actualiza ni se borra.
 * Por eso planograma/tienda/versión NO llevan FK: el historial debe sobrevivir aunque se borre
 * una tienda o una versión (la FK de VersionTienda sí es CASCADE y perdería el rastro).
 */

exports.up = async function (knex) {
  await knex.schema.createTable('EdicionAsignacion', (t) => {
    t.increments('id');
    t.datetime('fecha').notNullable().defaultTo(knex.fn.now());
    t.string('usuario_numero', 50).notNullable();
    t.string('usuario_nombre', 150).notNullable();
    t.string('motivo', 500).nullable();
    t.string('origen', 30).notNullable(); // MANUAL | VERSION | PILOTO | PUBLICACION
  });

  await knex.schema.createTable('AsignacionAuditoria', (t) => {
    t.increments('id');
    t.integer('edicion_id').notNullable().references('id').inTable('EdicionAsignacion');
    t.integer('planograma_id').notNullable();
    t.integer('tienda_id').notNullable();
    t.string('accion', 30).notNullable();
    t.integer('version_anterior_id').nullable();
    t.string('codigo_anterior', 250).nullable();
    t.string('estado_anterior', 20).nullable();
    t.integer('version_nueva_id').nullable();
    t.string('codigo_nuevo', 250).nullable();
    t.string('estado_nuevo', 20).nullable();
    t.index(['planograma_id', 'tienda_id'], 'IX_AsignacionAuditoria_celda');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('AsignacionAuditoria');
  await knex.schema.dropTableIfExists('EdicionAsignacion');
};
