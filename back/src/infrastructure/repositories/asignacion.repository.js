/**
 * asignacion.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db = require('../db/connection');
const { ESTADOS } = require('../../domain/version/version.entity');
const { ESTADOS_MONTABLES } = require('../../domain/asignacion/asignacion.entity');
const { versionesMontadas, desmontar, montar, registrarEdicion } = require('./asignacionTx');
const { clonarEstructura, tiendaTieneVersionEspecialDeBase } = require('./version.repository');

const TABLA_TIENDA         = 'Tienda';
const TABLA_PLANOGRAMA     = 'Planograma';
const TABLA_VERSION        = 'PlanogramaVersion';
const TABLA_VERSION_TIENDA = 'VersionTienda';
const TABLA_EDICION        = 'EdicionAsignacion';
const TABLA_AUDITORIA      = 'AsignacionAuditoria';

// ─── Helpers privados ────────────────────────────────────────────────────────

/**
 * Tienda dueña de cada versión especial: la que la tiene asignada o, si quedó sin asignar,
 * la tienda cuyo código es el sufijo del código de la versión (ver generarCodigoEspecial).
 * @returns {Promise<Map<number, number>>} versionId → tiendaId
 */
async function tiendasDeEspeciales(especiales) {
  const mapa = new Map();
  if (especiales.length === 0) return mapa;

  const asignadas = await db(TABLA_VERSION_TIENDA)
    .whereIn('planograma_version_id', especiales.map((v) => v.id))
    .select('planograma_version_id', 'tienda_id');
  asignadas.forEach((a) => { if (!mapa.has(a.planograma_version_id)) mapa.set(a.planograma_version_id, a.tienda_id); });

  const sinAsignar = especiales.filter((v) => !mapa.has(v.id));
  if (sinAsignar.length > 0) {
    const tiendas = await db(TABLA_TIENDA).select('id', 'codigo');
    sinAsignar.forEach((v) => {
      const codigo = v.codigo.toUpperCase();
      const duena  = tiendas.find((t) => codigo.endsWith(`-${t.codigo.toUpperCase()}`));
      if (duena) mapa.set(v.id, duena.id);
    });
  }
  return mapa;
}

function mapVersion(row, tiendaEspecialId) {
  return {
    id:               row.id,
    planogramaId:     row.planograma_id,
    codigo:           row.codigo,
    tipo:             row.tipo,
    estado:           row.estado,
    versionBaseId:    row.version_base_id,
    tiendaEspecialId: row.version_base_id === null ? null : (tiendaEspecialId ?? null),
  };
}

async function versionesConDuena(rows) {
  const duenas = await tiendasDeEspeciales(rows.filter((v) => v.version_base_id !== null));
  return rows.map((v) => mapVersion(v, duenas.get(v.id)));
}

// ─── obtenerMatriz ───────────────────────────────────────────────────────────

async function obtenerMatriz() {
  const tiendas = await db(TABLA_TIENDA)
    .where('estado', 'activo')
    .orderBy('nombre', 'asc')
    .select('id', 'codigo', 'nombre', 'tipo', 'Marca as marca');

  const filasVersion = await db(TABLA_VERSION)
    .join(TABLA_PLANOGRAMA, `${TABLA_VERSION}.planograma_id`, `${TABLA_PLANOGRAMA}.id`)
    .whereNot(`${TABLA_PLANOGRAMA}.estado`, 'archivado')
    .whereNot(`${TABLA_VERSION}.estado`, ESTADOS.ARCHIVADO)
    .select(`${TABLA_VERSION}.*`);

  const versiones = await versionesConDuena(filasVersion);
  const planogramaIds = [...new Set(versiones.filter((v) => ESTADOS_MONTABLES.includes(v.estado)).map((v) => v.planogramaId))];
  if (planogramaIds.length === 0) return { tiendas, planogramas: [], asignaciones: [] };

  const planogramas = await db(TABLA_PLANOGRAMA)
    .whereIn('id', planogramaIds)
    .orderBy('nombre', 'asc')
    .select('id', 'nombre', 'departamento');

  const asignaciones = await db(TABLA_VERSION_TIENDA)
    .join(TABLA_VERSION, `${TABLA_VERSION_TIENDA}.planograma_version_id`, `${TABLA_VERSION}.id`)
    .join(TABLA_TIENDA, `${TABLA_VERSION_TIENDA}.tienda_id`, `${TABLA_TIENDA}.id`)
    .whereIn(`${TABLA_VERSION}.planograma_id`, planogramaIds)
    .whereIn(`${TABLA_VERSION}.estado`, ESTADOS_MONTABLES)
    .where(`${TABLA_TIENDA}.estado`, 'activo')
    .select(
      `${TABLA_VERSION}.planograma_id as planogramaId`,
      `${TABLA_VERSION_TIENDA}.tienda_id as tiendaId`,
      `${TABLA_VERSION}.id as versionId`,
    );

  return {
    tiendas,
    planogramas: planogramas.map((p) => ({
      ...p,
      versiones: versiones
        .filter((v) => v.planogramaId === p.id)
        .map(({ planogramaId, ...v }) => v),
    })),
    asignaciones,
  };
}

// ─── Búsquedas para validar una edición ──────────────────────────────────────

async function buscarTiendas(ids) {
  if (ids.length === 0) return [];
  return db(TABLA_TIENDA).whereIn('id', ids).select('id', 'codigo', 'nombre', 'estado');
}

async function buscarPlanogramas(ids) {
  if (ids.length === 0) return [];
  return db(TABLA_PLANOGRAMA).whereIn('id', ids).select('id', 'nombre', 'estado');
}

async function buscarVersiones(ids) {
  if (ids.length === 0) return [];
  const filas = await db(TABLA_VERSION).whereIn('id', ids);
  return versionesConDuena(filas);
}

async function tiendaTieneEspecialDeBase(versionBaseId, tiendaId) {
  return tiendaTieneVersionEspecialDeBase(versionBaseId, tiendaId);
}

async function asignacionesActuales(celdas) {
  const porPlanograma = new Map();
  celdas.forEach((c) => {
    if (!porPlanograma.has(c.planogramaId)) porPlanograma.set(c.planogramaId, []);
    porPlanograma.get(c.planogramaId).push(c.tiendaId);
  });

  const resultado = {};
  for (const [planogramaId, tiendaIds] of porPlanograma) {
    const montadas = await versionesMontadas(db, planogramaId, tiendaIds);
    montadas.forEach((m) => {
      const clave = `${planogramaId}|${m.tiendaId}`;
      if (!resultado[clave]) resultado[clave] = { id: m.id, codigo: m.codigo, estado: m.estado };
    });
  }
  return resultado;
}

// ─── aplicarEdicion ──────────────────────────────────────────────────────────

async function crearEspecialPublicada(trx, op) {
  const [{ id }] = await trx(TABLA_VERSION)
    .insert({
      planograma_id:   op.planogramaId,
      tipo:            op.especialNueva.tipo,
      codigo:          op.especialNueva.codigo,
      estado:          ESTADOS.PUBLICADO,
      notas:           null,
      version_base_id: op.especialNueva.versionBaseId,
    })
    .returning('id');
  await trx(TABLA_VERSION_TIENDA).insert({ planograma_version_id: id, tienda_id: op.tiendaId });
  await clonarEstructura(trx, op.especialNueva.versionBaseId, id);
  return id;
}

async function aplicarEdicion(edicion, operaciones) {
  return db.transaction(async (trx) => {
    const especialesCreadas = [];

    for (const op of operaciones) {
      if (op.especialNueva) {
        await desmontar(trx, op.planogramaId, op.tiendaId);
        const id = await crearEspecialPublicada(trx, op);
        op.nueva = { ...op.nueva, id };
        especialesCreadas.push({ versionId: id, codigo: op.nueva.codigo, planogramaId: op.planogramaId, tiendaId: op.tiendaId });
      } else if (op.nueva) {
        await montar(trx, op.planogramaId, op.tiendaId, op.nueva.id);
      } else {
        await desmontar(trx, op.planogramaId, op.tiendaId);
      }
    }

    const { edicionId, fecha } = await registrarEdicion(trx, edicion, operaciones);
    return { edicionId, fecha, especialesCreadas };
  });
}

// ─── listarHistorial ─────────────────────────────────────────────────────────

function versionDeAuditoria(id, codigo, estado) {
  return id === null && codigo === null ? null : { id, codigo, estado };
}

async function listarHistorial(planogramaId, tiendaId) {
  const filas = await db(TABLA_AUDITORIA)
    .join(TABLA_EDICION, `${TABLA_AUDITORIA}.edicion_id`, `${TABLA_EDICION}.id`)
    .where(`${TABLA_AUDITORIA}.planograma_id`, planogramaId)
    .where(`${TABLA_AUDITORIA}.tienda_id`, tiendaId)
    .orderBy([
      { column: `${TABLA_EDICION}.fecha`, order: 'desc' },
      { column: `${TABLA_AUDITORIA}.id`, order: 'desc' },
    ])
    .select(
      `${TABLA_AUDITORIA}.*`,
      `${TABLA_EDICION}.fecha as fecha`,
      `${TABLA_EDICION}.usuario_numero as usuario_numero`,
      `${TABLA_EDICION}.usuario_nombre as usuario_nombre`,
      `${TABLA_EDICION}.motivo as motivo`,
      `${TABLA_EDICION}.origen as origen`,
    );

  const edicionIds = [...new Set(filas.map((f) => f.edicion_id))];
  const tamanos = edicionIds.length
    ? await db(TABLA_AUDITORIA).whereIn('edicion_id', edicionIds).groupBy('edicion_id').select('edicion_id').count('id as total')
    : [];
  const tamanoPorEdicion = new Map(tamanos.map((t) => [t.edicion_id, Number(t.total)]));

  return filas.map((f) => ({
    id:               f.id,
    edicionId:        f.edicion_id,
    cambiosEnEdicion: tamanoPorEdicion.get(f.edicion_id) ?? 1,
    fecha:            f.fecha,
    usuario:          { numero: f.usuario_numero, nombre: f.usuario_nombre },
    motivo:           f.motivo,
    origen:           f.origen,
    accion:           f.accion,
    anterior:         versionDeAuditoria(f.version_anterior_id, f.codigo_anterior, f.estado_anterior),
    nueva:            versionDeAuditoria(f.version_nueva_id, f.codigo_nuevo, f.estado_nuevo),
  }));
}

module.exports = {
  obtenerMatriz,
  buscarTiendas,
  buscarPlanogramas,
  buscarVersiones,
  tiendaTieneEspecialDeBase,
  asignacionesActuales,
  aplicarEdicion,
  listarHistorial,
};
