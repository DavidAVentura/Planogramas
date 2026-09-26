/**
 * asignacionTx.js  (infraestructura)
 * Operaciones de asignación versión ↔ tienda que corren DENTRO de una transacción ajena.
 * Las comparten asignacion.repository.js (matriz de Estructura) y version.repository.js
 * (promover a piloto / publicar / "Tiendas asignadas"), para que la regla "una tienda monta una
 * sola versión por planograma" y la auditoría se apliquen igual en todos los caminos.
 *
 * Cada función recibe `conn`: el trx de Knex en curso.
 */

const { ESTADOS_MONTABLES } = require('../../domain/asignacion/asignacion.entity');

const TABLA_VERSION        = 'PlanogramaVersion';
const TABLA_VERSION_TIENDA = 'VersionTienda';
const TABLA_EDICION        = 'EdicionAsignacion';
const TABLA_AUDITORIA      = 'AsignacionAuditoria';

// SQL Server acepta hasta 2100 parámetros por consulta; cada fila de auditoría usa 11.
const FILAS_POR_INSERT = 150;

/**
 * Versiones montadas (publicadas o en piloto) de un planograma en las tiendas indicadas.
 * @returns {Promise<{ tiendaId, id, codigo, estado }[]>}
 */
async function versionesMontadas(conn, planogramaId, tiendaIds) {
  if (tiendaIds.length === 0) return [];
  const filas = await conn(TABLA_VERSION_TIENDA)
    .join(TABLA_VERSION, `${TABLA_VERSION_TIENDA}.planograma_version_id`, `${TABLA_VERSION}.id`)
    .where(`${TABLA_VERSION}.planograma_id`, planogramaId)
    .whereIn(`${TABLA_VERSION}.estado`, ESTADOS_MONTABLES)
    .whereIn(`${TABLA_VERSION_TIENDA}.tienda_id`, tiendaIds)
    .select(
      `${TABLA_VERSION_TIENDA}.tienda_id as tiendaId`,
      `${TABLA_VERSION}.id as id`,
      `${TABLA_VERSION}.codigo as codigo`,
      `${TABLA_VERSION}.estado as estado`,
    );
  return filas;
}

/** Quita de la tienda cualquier versión montada del planograma. */
async function desmontar(conn, planogramaId, tiendaId) {
  await conn(TABLA_VERSION_TIENDA)
    .where('tienda_id', tiendaId)
    .whereIn(
      'planograma_version_id',
      conn(TABLA_VERSION).select('id').where('planograma_id', planogramaId).whereIn('estado', ESTADOS_MONTABLES),
    )
    .delete();
}

/** Deja `versionId` como la única versión montada del planograma en la tienda. */
async function montar(conn, planogramaId, tiendaId, versionId) {
  await desmontar(conn, planogramaId, tiendaId);
  await conn(TABLA_VERSION_TIENDA).where({ planograma_version_id: versionId, tienda_id: tiendaId }).delete();
  await conn(TABLA_VERSION_TIENDA).insert({ planograma_version_id: versionId, tienda_id: tiendaId });
}

function filaAuditoria(edicionId, op) {
  return {
    edicion_id:          edicionId,
    planograma_id:       op.planogramaId,
    tienda_id:           op.tiendaId,
    accion:              op.accion,
    version_anterior_id: op.anterior?.id ?? null,
    codigo_anterior:     op.anterior?.codigo ?? null,
    estado_anterior:     op.anterior?.estado ?? null,
    version_nueva_id:    op.nueva?.id ?? null,
    codigo_nuevo:        op.nueva?.codigo ?? null,
    estado_nuevo:        op.nueva?.estado ?? null,
  };
}

/**
 * Crea la edición y un registro de auditoría por operación. Sin operaciones no crea nada.
 * @param {object} conn
 * @param {{ usuario: { numero, nombre }, motivo, origen }} edicion
 * @param {{ planogramaId, tiendaId, accion, anterior, nueva }[]} operaciones
 * @returns {Promise<{ edicionId, fecha }|null>}
 */
async function registrarEdicion(conn, edicion, operaciones) {
  if (operaciones.length === 0) return null;

  const [creada] = await conn(TABLA_EDICION)
    .insert({
      usuario_numero: edicion.usuario.numero,
      usuario_nombre: edicion.usuario.nombre,
      motivo:         edicion.motivo ?? null,
      origen:         edicion.origen,
    })
    .returning(['id', 'fecha']);

  const filas = operaciones.map((op) => filaAuditoria(creada.id, op));
  for (let i = 0; i < filas.length; i += FILAS_POR_INSERT) {
    await conn(TABLA_AUDITORIA).insert(filas.slice(i, i + FILAS_POR_INSERT));
  }

  return { edicionId: creada.id, fecha: creada.fecha };
}

module.exports = {
  versionesMontadas,
  desmontar,
  montar,
  registrarEdicion,
};
