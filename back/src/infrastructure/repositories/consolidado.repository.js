/**
 * consolidado.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 *
 * `cargarBase` hace 7 consultas con columnas explícitas (5 en `baseVersiones.js`), todas acotadas por la misma subconsulta
 * de versiones montables (publicado/piloto asignadas a una tienda activa): nunca listas de ids de
 * versión ni de posición, para no pasar el límite de 2100 parámetros. Solo `tiendaIds` (≤ 200)
 * viaja como parámetro. Se cargan TODAS las posiciones de esas versiones (también las sin SKU y las
 * PENDIENTE): la numeración de ganchos de `recorrerVersion` las necesita; el dominio las descarta.
 */

const db = require('../db/connection');
const { ESTADOS_MONTABLES } = require('../../domain/asignacion/asignacion.entity');
const { cargarEstructura } = require('./baseVersiones');

const TABLA_VERSION_TIENDA = 'VersionTienda';
const TABLA_VERSION        = 'PlanogramaVersion';
const TABLA_PLANOGRAMA     = 'Planograma';
const TABLA_TIENDA         = 'Tienda';
const TABLA_GONDOLA        = 'Gondola';
const TABLA_NIVEL          = 'Nivel';
const TABLA_POSICION       = 'Posicion';

const ESTADO_TIENDA_ACTIVA = 'activo';
const MODO_PENDIENTE       = 'PENDIENTE';

/** Subconsulta: ids de las versiones montables asignadas a tiendas activas (opcional: a `tiendaIds`). */
function versionesMontables(tiendaIds = []) {
  const q = db(TABLA_VERSION_TIENDA)
    .join(TABLA_VERSION, `${TABLA_VERSION_TIENDA}.planograma_version_id`, `${TABLA_VERSION}.id`)
    .join(TABLA_TIENDA, `${TABLA_VERSION_TIENDA}.tienda_id`, `${TABLA_TIENDA}.id`)
    .whereIn(`${TABLA_VERSION}.estado`, ESTADOS_MONTABLES)
    .where(`${TABLA_TIENDA}.estado`, ESTADO_TIENDA_ACTIVA)
    .distinct(`${TABLA_VERSION_TIENDA}.planograma_version_id`);
  if (tiendaIds.length > 0) q.whereIn(`${TABLA_VERSION_TIENDA}.tienda_id`, tiendaIds);
  return q;
}

// ─── cargarBase ──────────────────────────────────────────────────────────────

async function cargarBase({ tiendaIds = [] } = {}) {
  const montables = () => versionesMontables(tiendaIds);

  const [versiones, asignaciones, estructura] = await Promise.all([
    db(TABLA_VERSION)
      .join(TABLA_PLANOGRAMA, `${TABLA_VERSION}.planograma_id`, `${TABLA_PLANOGRAMA}.id`)
      .whereIn(`${TABLA_VERSION}.id`, montables())
      .select(
        `${TABLA_VERSION}.id as versionId`,
        `${TABLA_VERSION}.codigo as codigo`,
        `${TABLA_VERSION}.estado as estado`,
        `${TABLA_PLANOGRAMA}.id as planogramaId`,
        `${TABLA_PLANOGRAMA}.nombre as planogramaNombre`,
      ),

    db(TABLA_VERSION_TIENDA)
      .join(TABLA_VERSION, `${TABLA_VERSION_TIENDA}.planograma_version_id`, `${TABLA_VERSION}.id`)
      .join(TABLA_TIENDA, `${TABLA_VERSION_TIENDA}.tienda_id`, `${TABLA_TIENDA}.id`)
      .whereIn(`${TABLA_VERSION}.estado`, ESTADOS_MONTABLES)
      .where(`${TABLA_TIENDA}.estado`, ESTADO_TIENDA_ACTIVA)
      .modify((q) => { if (tiendaIds.length > 0) q.whereIn(`${TABLA_VERSION_TIENDA}.tienda_id`, tiendaIds); })
      .select(
        `${TABLA_VERSION_TIENDA}.planograma_version_id as versionId`,
        `${TABLA_TIENDA}.id as tiendaId`,
        `${TABLA_TIENDA}.codigo as tiendaCodigo`,
        `${TABLA_TIENDA}.nombre as tiendaNombre`,
        `${TABLA_TIENDA}.tipo as tiendaTipo`,
        `${TABLA_TIENDA}.marca as tiendaMarca`,
      ),

    cargarEstructura(montables),
  ]);

  const tiendas = new Map();
  asignaciones.forEach((a) => {
    if (!tiendas.has(a.tiendaId)) {
      tiendas.set(a.tiendaId, { id: a.tiendaId, codigo: a.tiendaCodigo, nombre: a.tiendaNombre, tipo: a.tiendaTipo, marca: a.tiendaMarca ?? null });
    }
  });

  return {
    versiones: versiones.map((v) => ({
      versionId: v.versionId, codigo: v.codigo, estado: v.estado, planogramaId: v.planogramaId, planogramaNombre: v.planogramaNombre,
    })),
    asignaciones: asignaciones.map((a) => ({ versionId: a.versionId, tiendaId: a.tiendaId })),
    tiendas: [...tiendas.values()],
    ...estructura,
  };
}

// ─── filtrosDisponibles ──────────────────────────────────────────────────────

/** Posiciones con SKU real (no PENDIENTE) de las versiones montables, con versión y gondola. */
function posicionesConSku() {
  return db(TABLA_POSICION)
    .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
    .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
    .whereNotNull(`${TABLA_POSICION}.sku`)
    .where(`${TABLA_POSICION}.modo`, '<>', MODO_PENDIENTE);
}

async function filtrosDisponibles() {
  const [tiendas, versiones, skusPorTienda, skusPorVersion] = await Promise.all([
    db(TABLA_TIENDA)
      .whereIn('id', db(TABLA_VERSION_TIENDA)
        .join(TABLA_VERSION, `${TABLA_VERSION_TIENDA}.planograma_version_id`, `${TABLA_VERSION}.id`)
        .whereIn(`${TABLA_VERSION}.estado`, ESTADOS_MONTABLES)
        .select(`${TABLA_VERSION_TIENDA}.tienda_id`))
      .where('estado', ESTADO_TIENDA_ACTIVA)
      .orderBy('codigo', 'asc')
      .select('id', 'codigo', 'nombre', 'tipo', 'marca'),

    db(TABLA_VERSION)
      .join(TABLA_PLANOGRAMA, `${TABLA_VERSION}.planograma_id`, `${TABLA_PLANOGRAMA}.id`)
      .whereIn(`${TABLA_VERSION}.id`, versionesMontables())
      .orderBy(`${TABLA_PLANOGRAMA}.departamento`, 'asc')
      .orderBy(`${TABLA_VERSION}.codigo`, 'asc')
      .select(
        `${TABLA_VERSION}.id as versionId`,
        `${TABLA_VERSION}.codigo as codigo`,
        `${TABLA_VERSION}.estado as estado`,
        `${TABLA_PLANOGRAMA}.nombre as nombre`,
        `${TABLA_PLANOGRAMA}.descripcion as descripcion`,
        `${TABLA_PLANOGRAMA}.departamento as departamento`,
      ),

    posicionesConSku()
      .join(TABLA_VERSION_TIENDA, `${TABLA_GONDOLA}.planograma_version_id`, `${TABLA_VERSION_TIENDA}.planograma_version_id`)
      .join(TABLA_VERSION, `${TABLA_VERSION_TIENDA}.planograma_version_id`, `${TABLA_VERSION}.id`)
      .whereIn(`${TABLA_VERSION}.estado`, ESTADOS_MONTABLES)
      .groupBy(`${TABLA_VERSION_TIENDA}.tienda_id`)
      .select(`${TABLA_VERSION_TIENDA}.tienda_id as tiendaId`)
      .countDistinct(`${TABLA_POSICION}.sku as total`),

    posicionesConSku()
      .whereIn(`${TABLA_GONDOLA}.planograma_version_id`, versionesMontables())
      .groupBy(`${TABLA_GONDOLA}.planograma_version_id`)
      .select(`${TABLA_GONDOLA}.planograma_version_id as versionId`)
      .countDistinct(`${TABLA_POSICION}.sku as total`),
  ]);

  const porTienda = new Map(skusPorTienda.map((r) => [r.tiendaId, Number(r.total)]));
  const porVersion = new Map(skusPorVersion.map((r) => [r.versionId, Number(r.total)]));

  return {
    tiendas: tiendas.map((t) => ({
      id: t.id, codigo: t.codigo, nombre: t.nombre, tipo: t.tipo, marca: t.marca ?? null, totalSkus: porTienda.get(t.id) ?? 0,
    })),
    versiones: versiones.map((v) => ({
      versionId: v.versionId, codigo: v.codigo, estado: v.estado, nombre: v.nombre,
      descripcion: v.descripcion ?? null, departamento: v.departamento, totalProductos: porVersion.get(v.versionId) ?? 0,
    })),
  };
}

module.exports = { cargarBase, filtrosDisponibles };
