/**
 * implementacion.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db = require('../db/connection');
const { ESTADOS_VERSION_IMPLEMENTACION } = require('../../domain/implementacion/implementacion.entity');

const TABLA_TIENDA         = 'Tienda';
const TABLA_VERSION_TIENDA = 'VersionTienda';
const TABLA_VERSION        = 'PlanogramaVersion';
const TABLA_PLANOGRAMA     = 'Planograma';
const TABLA_GONDOLA        = 'Gondola';
const TABLA_NIVEL          = 'Nivel';
const TABLA_POSICION       = 'Posicion';
const TABLA_PRODUCTO       = 'Producto';
const TABLA_ADJUNTO        = 'Adjunto';
const TABLA_EVIDENCIA      = 'EvidenciaImplementacion';

const DECISION_ACTIVO = 'ACTIVO';

// ─── buscarTienda ────────────────────────────────────────────────────────────

async function buscarTienda(tiendaId) {
  const row = await db(TABLA_TIENDA)
    .where('id', tiendaId)
    .select('id', 'codigo', 'nombre', 'tipo', 'estado')
    .first();

  return row ?? null;
}

// ─── listarVersionesAsignadas ────────────────────────────────────────────────

async function listarVersionesAsignadas(tiendaId) {
  const rows = await db(TABLA_VERSION_TIENDA)
    .join(TABLA_VERSION, `${TABLA_VERSION_TIENDA}.planograma_version_id`, `${TABLA_VERSION}.id`)
    .join(TABLA_PLANOGRAMA, `${TABLA_VERSION}.planograma_id`, `${TABLA_PLANOGRAMA}.id`)
    .where(`${TABLA_VERSION_TIENDA}.tienda_id`, tiendaId)
    .whereIn(`${TABLA_VERSION}.estado`, ESTADOS_VERSION_IMPLEMENTACION)
    .orderBy(`${TABLA_PLANOGRAMA}.departamento`, 'asc')
    .orderBy(`${TABLA_VERSION}.codigo`, 'asc')
    .select(
      `${TABLA_VERSION}.id as versionId`,
      `${TABLA_VERSION}.codigo as codigo`,
      `${TABLA_VERSION}.tipo as tipo`,
      `${TABLA_VERSION}.estado as estado`,
      `${TABLA_VERSION}.version_base_id as versionBaseId`,
      `${TABLA_PLANOGRAMA}.id as planogramaId`,
      `${TABLA_PLANOGRAMA}.nombre as nombre`,
      `${TABLA_PLANOGRAMA}.departamento as departamento`,
    );

  return rows.map((r) => ({
    versionId:    r.versionId,
    codigo:       r.codigo,
    tipo:         r.tipo,
    estado:       r.estado,
    esEspecial:   r.versionBaseId !== null,
    planogramaId: r.planogramaId,
    nombre:       r.nombre,
    departamento: r.departamento,
  }));
}

// ─── listarSkusActivosPorVersion ─────────────────────────────────────────────

async function listarSkusActivosPorVersion(versionIds) {
  if (versionIds.length === 0) return [];

  const rows = await db(TABLA_POSICION)
    .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
    .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
    .whereIn(`${TABLA_GONDOLA}.planograma_version_id`, versionIds)
    .whereNotNull(`${TABLA_POSICION}.sku`)
    .where(`${TABLA_POSICION}.decision`, DECISION_ACTIVO)
    .distinct(
      `${TABLA_GONDOLA}.planograma_version_id as versionId`,
      `${TABLA_POSICION}.sku as sku`,
    );

  return rows.map((r) => ({ versionId: r.versionId, sku: String(r.sku) }));
}

// ─── contarAdjuntosPorVersion ────────────────────────────────────────────────

async function contarAdjuntosPorVersion(versionIds) {
  const mapa = new Map();
  if (versionIds.length === 0) return mapa;

  const rows = await db(TABLA_ADJUNTO)
    .whereIn('planograma_version_id', versionIds)
    .groupBy('planograma_version_id')
    .select('planograma_version_id')
    .count('id as total');

  rows.forEach((r) => mapa.set(r.planograma_version_id, Number(r.total)));
  return mapa;
}

// ─── listarGondolasConEvidencias ─────────────────────────────────────────────

async function listarGondolasConEvidencias(tiendaId, versionIds) {
  if (versionIds.length === 0) return [];

  const conteo = db(TABLA_EVIDENCIA)
    .where('tienda_id', tiendaId)
    .whereIn('planograma_version_id', versionIds)
    .groupBy('gondola_id')
    .select('gondola_id')
    .count('id as evidencias')
    .as('conteo');

  const rows = await db(TABLA_GONDOLA)
    .leftJoin(conteo, 'conteo.gondola_id', `${TABLA_GONDOLA}.id`)
    .whereIn(`${TABLA_GONDOLA}.planograma_version_id`, versionIds)
    .orderBy(`${TABLA_GONDOLA}.orden`, 'asc')
    .orderBy(`${TABLA_GONDOLA}.id`, 'asc')
    .select(
      `${TABLA_GONDOLA}.id`,
      `${TABLA_GONDOLA}.planograma_version_id as versionId`,
      `${TABLA_GONDOLA}.nombre`,
      `${TABLA_GONDOLA}.orden`,
      db.raw('COALESCE(conteo.evidencias, 0) as evidencias'),
    );

  return rows.map((r) => ({
    id:         r.id,
    versionId:  r.versionId,
    nombre:     r.nombre,
    orden:      r.orden,
    evidencias: Number(r.evidencias),
  }));
}

// ─── listarPosicionesConProducto ─────────────────────────────────────────────

async function listarPosicionesConProducto(versionIds) {
  if (versionIds.length === 0) return [];

  const rows = await db(TABLA_POSICION)
    .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
    .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
    .join(TABLA_VERSION, `${TABLA_GONDOLA}.planograma_version_id`, `${TABLA_VERSION}.id`)
    .join(TABLA_PLANOGRAMA, `${TABLA_VERSION}.planograma_id`, `${TABLA_PLANOGRAMA}.id`)
    .leftJoin(`${TABLA_PRODUCTO} as producto`, `${TABLA_POSICION}.sku`, 'producto.sku')
    .leftJoin(`${TABLA_PRODUCTO} as sustituto`, 'producto.sku_sustituto', 'sustituto.sku')
    .whereIn(`${TABLA_VERSION}.id`, versionIds)
    .whereNotNull(`${TABLA_POSICION}.sku`)
    .orderBy(`${TABLA_VERSION}.codigo`, 'asc')
    .orderBy(`${TABLA_GONDOLA}.orden`, 'asc')
    .orderBy(`${TABLA_NIVEL}.orden`, 'asc')
    .orderBy(`${TABLA_POSICION}.orden_horizontal`, 'asc')
    .orderBy(`${TABLA_POSICION}.id`, 'asc')
    .select(
      `${TABLA_POSICION}.id as posicionId`,
      `${TABLA_VERSION}.id as versionId`,
      `${TABLA_VERSION}.codigo as codigoVersion`,
      `${TABLA_VERSION}.estado as estadoVersion`,
      `${TABLA_PLANOGRAMA}.nombre as planogramaNombre`,
      `${TABLA_GONDOLA}.id as gondolaId`,
      `${TABLA_GONDOLA}.nombre as gondola`,
      `${TABLA_GONDOLA}.orden as gondolaOrden`,
      `${TABLA_NIVEL}.id as nivelId`,
      `${TABLA_NIVEL}.orden as nivel`,
      `${TABLA_POSICION}.orden_horizontal as orden`,
      `${TABLA_POSICION}.sku as sku`,
      'producto.nombre as nombre',
      'producto.marca as marca',
      `${TABLA_POSICION}.facings_horizontal`,
      `${TABLA_POSICION}.cantidad_apilable`,
      `${TABLA_POSICION}.unidades_por_facing`,
      `${TABLA_POSICION}.capacidad_maxima`,
      `${TABLA_POSICION}.min_estetico`,
      `${TABLA_POSICION}.perfil_redondeo`,
      `${TABLA_POSICION}.modo`,
      `${TABLA_POSICION}.decision`,
      `${TABLA_POSICION}.observaciones`,
      'producto.sku_sustituto as sku_sustituto',
      'sustituto.nombre as sustituto_nombre',
    );

  return rows.map((r) => ({
    posicionId:          r.posicionId,
    versionId:           r.versionId,
    codigoVersion:       r.codigoVersion,
    estadoVersion:       r.estadoVersion,
    planogramaNombre:    r.planogramaNombre,
    gondolaId:           r.gondolaId,
    gondola:             r.gondola,
    gondolaOrden:        r.gondolaOrden,
    nivelId:             r.nivelId,
    nivel:               r.nivel,
    orden:               r.orden,
    sku:                 String(r.sku),
    nombre:              r.nombre ?? null,
    marca:               r.marca ?? null,
    facings_horizontal:  r.facings_horizontal,
    cantidad_apilable:   r.cantidad_apilable,
    unidades_por_facing: r.unidades_por_facing,
    capacidad_maxima:    r.capacidad_maxima,
    min_estetico:        r.min_estetico,
    perfil_redondeo:     r.perfil_redondeo,
    modo:                r.modo,
    decision:            r.decision,
    observaciones:       r.observaciones,
    sku_sustituto:       r.sku_sustituto ?? null,
    sustituto_nombre:    r.sustituto_nombre ?? null,
  }));
}

// ─── Exportación ─────────────────────────────────────────────────────────────

module.exports = {
  buscarTienda,
  listarVersionesAsignadas,
  listarSkusActivosPorVersion,
  contarAdjuntosPorVersion,
  listarGondolasConEvidencias,
  listarPosicionesConProducto,
};
