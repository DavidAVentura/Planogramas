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
    id:          row.id,
    codigo:      row.codigo,
    nombre:      row.nombre,
    tipo:        row.tipo,
    region:      row.region,
    marca:       row.marca,
    estado:      row.estado,
    versionesPublicadas: Number(row.versionesPublicadas ?? 0),
  };
}

// La columna de marca se llama `Marca` en la BD (migración 005); el dominio usa `marca`.
function aColumnas(datos) {
  const { marca, ...resto } = datos;
  return marca === undefined ? resto : { ...resto, Marca: marca };
}

/**
 * Consulta base de tiendas con el conteo de versiones de planograma publicadas asignadas a cada
 * tienda (lo que la tienda tiene implementado en piso). Los filtros se agregan sobre `Tienda.*`.
 */
function consultaTiendas() {
  const conteo = db(TABLA_VERSION_TIENDA)
    .join(TABLA_VERSION, `${TABLA_VERSION_TIENDA}.planograma_version_id`, `${TABLA_VERSION}.id`)
    .where(`${TABLA_VERSION}.estado`, 'publicado')
    .groupBy(`${TABLA_VERSION_TIENDA}.tienda_id`)
    .select(`${TABLA_VERSION_TIENDA}.tienda_id`)
    .count(`${TABLA_VERSION_TIENDA}.planograma_version_id as versionesPublicadas`)
    .as('conteo');

  return db(TABLA_TIENDA)
    .leftJoin(conteo, 'conteo.tienda_id', `${TABLA_TIENDA}.id`)
    .select(
      `${TABLA_TIENDA}.id`,
      `${TABLA_TIENDA}.codigo`,
      `${TABLA_TIENDA}.nombre`,
      `${TABLA_TIENDA}.tipo`,
      `${TABLA_TIENDA}.region`,
      `${TABLA_TIENDA}.Marca as marca`,
      `${TABLA_TIENDA}.estado`,
      db.raw('COALESCE(conteo.versionesPublicadas, 0) as versionesPublicadas'),
    );
}

function aplicarFiltros(query, { tipo, estado }) {
  if (estado) query.where(`${TABLA_TIENDA}.estado`, estado);
  if (tipo) query.where(`${TABLA_TIENDA}.tipo`, tipo);
  return query;
}

// ─── listar ──────────────────────────────────────────────────────────────────

async function listar({ tipo, estado }) {
  const rows = await aplicarFiltros(consultaTiendas(), { tipo, estado })
    .orderBy(`${TABLA_TIENDA}.nombre`, 'asc');

  return rows.map(mapTienda);
}

// ─── listarDisponiblesParaVersionEspecial ───────────────────────────────────

async function listarDisponiblesParaVersionEspecial({ planogramaId, versionBaseId, tipo, estado }) {
  const yaClonadas = await db(TABLA_VERSION_TIENDA)
    .join(TABLA_VERSION, `${TABLA_VERSION_TIENDA}.planograma_version_id`, `${TABLA_VERSION}.id`)
    .where(`${TABLA_VERSION}.planograma_id`, planogramaId)
    .where(`${TABLA_VERSION}.version_base_id`, versionBaseId)
    .pluck(`${TABLA_VERSION_TIENDA}.tienda_id`);

  const query = aplicarFiltros(consultaTiendas(), { tipo, estado });
  if (yaClonadas.length > 0) query.whereNotIn(`${TABLA_TIENDA}.id`, yaClonadas);

  const rows = await query.orderBy(`${TABLA_TIENDA}.nombre`, 'asc');

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

// ─── obtenerDetalle ──────────────────────────────────────────────────────────

async function obtenerDetalle(id) {
  const row = await consultaTiendas().where(`${TABLA_TIENDA}.id`, id).first();
  return row ? mapTienda(row) : null;
}

// ─── existeCodigo ────────────────────────────────────────────────────────────

async function existeCodigo(codigo, excluirId) {
  const query = db(TABLA_TIENDA).where('codigo', codigo);
  if (excluirId !== undefined) query.whereNot('id', excluirId);

  const row = await query.select('id').first();
  return Boolean(row);
}

// ─── crear ───────────────────────────────────────────────────────────────────

async function crear(tienda) {
  const [{ id }] = await db(TABLA_TIENDA).insert(aColumnas(tienda)).returning('id');
  return obtenerDetalle(id);
}

// ─── editar ──────────────────────────────────────────────────────────────────

async function editar(id, cambios) {
  await db(TABLA_TIENDA).where('id', id).update(aColumnas(cambios));
  return obtenerDetalle(id);
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
    `${TABLA_VERSION}.version_base_id as versionBaseId`,
    `${TABLA_PLANOGRAMA}.id as planogramaId`,
    `${TABLA_PLANOGRAMA}.nombre as nombre`,
    `${TABLA_PLANOGRAMA}.descripcion as descripcion`,
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
    esEspecial:    r.versionBaseId !== null,
    planogramaId:  r.planogramaId,
    nombre:        r.nombre,
    descripcion:   r.descripcion,
    departamento:  r.departamento,
    subcategorias: subcategoriasMap[r.planogramaId] ?? [],
  }));
}

// ─── Exportación ─────────────────────────────────────────────────────────────

module.exports = {
  listar,
  listarDisponiblesParaVersionEspecial,
  buscarPorId,
  obtenerDetalle,
  existeCodigo,
  crear,
  editar,
  listarPlanogramasPublicados,
};
