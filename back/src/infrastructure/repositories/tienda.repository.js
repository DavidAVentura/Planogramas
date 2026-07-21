/**
 * tienda.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db = require('../db/connection');

const TABLA_TIENDA         = 'Tienda';
const TABLA_VERSION_TIENDA = 'VersionTienda';
const TABLA_VERSION        = 'PlanogramaVersion';
const TABLA_PLANOGRAMA     = 'Planograma';
const TABLA_SUBCATEGORIA   = 'PlanogramaSubcategoria';

// ─── Helpers privados ────────────────────────────────────────────────────────

function mapTienda(row) {
  return {
    id:     row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    tipo:   row.tipo,
    region: row.region,
    marca:  row.marca,
  };
}

// ─── listar ──────────────────────────────────────────────────────────────────

async function listar({ tipo, estado }) {
  const query = db(TABLA_TIENDA).where('estado', estado);
  if (tipo) query.where('tipo', tipo);

  const rows = await query
    .select('id', 'codigo', 'nombre', 'tipo', 'region', 'Marca as marca')
    .orderBy('nombre', 'asc');

  return rows.map(mapTienda);
}

// ─── listarDisponiblesParaVersionEspecial ───────────────────────────────────

async function listarDisponiblesParaVersionEspecial({ planogramaId, versionBaseId, tipo, estado }) {
  const yaClonadas = await db(TABLA_VERSION_TIENDA)
    .join(TABLA_VERSION, `${TABLA_VERSION_TIENDA}.planograma_version_id`, `${TABLA_VERSION}.id`)
    .where(`${TABLA_VERSION}.planograma_id`, planogramaId)
    .where(`${TABLA_VERSION}.version_base_id`, versionBaseId)
    .pluck(`${TABLA_VERSION_TIENDA}.tienda_id`);

  const query = db(TABLA_TIENDA).where('estado', estado);
  if (tipo) query.where('tipo', tipo);
  if (yaClonadas.length > 0) query.whereNotIn('id', yaClonadas);

  const rows = await query
    .select('id', 'codigo', 'nombre', 'tipo', 'region', 'Marca as marca')
    .orderBy('nombre', 'asc');

  return rows.map(mapTienda);
}

// ─── buscarPorId ─────────────────────────────────────────────────────────────

async function buscarPorId(id) {
  const row = await db(TABLA_TIENDA)
    .where('id', id)
    .select('id', 'codigo', 'nombre')
    .first();

  return row ?? null;
}

// ─── listarPlanogramasPublicados ─────────────────────────────────────────────

async function listarPlanogramasPublicados(tiendaId, { departamento }) {
  const query = db(TABLA_VERSION_TIENDA)
    .join(TABLA_VERSION, `${TABLA_VERSION_TIENDA}.planograma_version_id`, `${TABLA_VERSION}.id`)
    .join(TABLA_PLANOGRAMA, `${TABLA_VERSION}.planograma_id`, `${TABLA_PLANOGRAMA}.id`)
    .where(`${TABLA_VERSION_TIENDA}.tienda_id`, tiendaId)
    .where(`${TABLA_VERSION}.estado`, 'publicado');

  if (departamento) query.where(`${TABLA_PLANOGRAMA}.departamento`, departamento);

  const rows = await query.select(
    `${TABLA_VERSION}.id as versionId`,
    `${TABLA_VERSION}.codigo as codigo`,
    `${TABLA_VERSION}.tipo as tipo`,
    `${TABLA_PLANOGRAMA}.id as planogramaId`,
    `${TABLA_PLANOGRAMA}.nombre as nombre`,
    `${TABLA_PLANOGRAMA}.departamento as departamento`,
  );

  const planogramaIds = [...new Set(rows.map((r) => r.planogramaId))];
  const subcategoriaFilas = planogramaIds.length
    ? await db(TABLA_SUBCATEGORIA)
        .whereIn('planograma_id', planogramaIds)
        .select('planograma_id', 'subcategoria')
    : [];

  const subcategoriasMap = {};
  subcategoriaFilas.forEach((s) => {
    if (!subcategoriasMap[s.planograma_id]) subcategoriasMap[s.planograma_id] = [];
    subcategoriasMap[s.planograma_id].push(s.subcategoria);
  });

  return rows.map((r) => ({
    versionId:     r.versionId,
    codigo:        r.codigo,
    tipo:          r.tipo,
    planogramaId:  r.planogramaId,
    nombre:        r.nombre,
    departamento:  r.departamento,
    subcategorias: subcategoriasMap[r.planogramaId] ?? [],
  }));
}

// ─── Exportación ─────────────────────────────────────────────────────────────

module.exports = {
  listar,
  listarDisponiblesParaVersionEspecial,
  buscarPorId,
  listarPlanogramasPublicados,
};
