/**
 * planograma.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db      = require('../db/connection');
const { ESTADOS } = require('../../domain/planograma/planograma.entity');

const TABLA_PLANOGRAMA          = 'Planograma';
const TABLA_SUBCATEGORIA        = 'PlanogramaSubcategoria';
const TABLA_VERSION             = 'PlanogramaVersion';
const TABLA_VERSION_TIENDA      = 'VersionTienda';

// ─── listar ──────────────────────────────────────────────────────────────────

async function listar({ departamento, estado, search, page, pageSize }) {
  const offset = (page - 1) * pageSize;

  const baseQuery = db(TABLA_PLANOGRAMA).where((builder) => {
    if (departamento) builder.where('departamento', departamento);
    if (estado)       builder.where('estado',       estado);
    if (search)       builder.whereILike('nombre',  `%${search}%`);
  });

  const [{ total }] = await baseQuery.clone().count('id as total');

  const data = await baseQuery
    .clone()
    .select(
      'id',
      'nombre',
      'departamento',
      'estado',
      'created_at',
      'created_by',
    )
    .orderBy('created_at', 'desc')
    .limit(pageSize)
    .offset(offset);

  // Agregar totalVersiones por planograma en una sola query adicional
  const ids = data.map((p) => p.id);
  const conteos = ids.length
    ? await db(TABLA_VERSION)
        .whereIn('planograma_id', ids)
        .groupBy('planograma_id')
        .select('planograma_id')
        .count('id as totalVersiones')
    : [];

  const conteoMap = {};
  conteos.forEach((c) => { conteoMap[c.planograma_id] = Number(c.totalVersiones); });

  const dataConConteos = data.map((p) => ({
    ...p,
    totalVersiones: conteoMap[p.id] ?? 0,
  }));

  return { data: dataConConteos, total: Number(total) };
}

// ─── crear ───────────────────────────────────────────────────────────────────

async function crear(planograma, subcategorias) {
  return db.transaction(async (trx) => {
    const [{ id }] = await trx(TABLA_PLANOGRAMA).insert(planograma).returning('id');

    if (subcategorias.length > 0) {
      const filas = subcategorias.map((s) => ({ planograma_id: id, subcategoria: s }));
      await trx(TABLA_SUBCATEGORIA).insert(filas);
    }

    return id;
  });
}

// ─── buscarPorId ─────────────────────────────────────────────────────────────

async function buscarPorId(id) {
  const planograma = await db(TABLA_PLANOGRAMA)
    .where('id', id)
    .select('id', 'nombre', 'departamento', 'estado', 'created_at', 'created_by')
    .first();

  if (!planograma) return null;

  const subcategorias = await db(TABLA_SUBCATEGORIA)
    .where('planograma_id', id)
    .pluck('subcategoria');

  const versiones = await db(TABLA_VERSION)
    .where('planograma_id', id)
    .select('id', 'tipo', 'codigo', 'estado')
    .orderBy('id', 'desc');

  // Enriquecer cada versión con totalGondolas (placeholder — la tabla Gondola se implementa después)
  // y totalTiendas desde VersionTienda
  const versionIds = versiones.map((v) => v.id);
  const tiendaCounts = versionIds.length
    ? await db(TABLA_VERSION_TIENDA)
        .whereIn('planograma_version_id', versionIds)
        .groupBy('planograma_version_id')
        .select('planograma_version_id')
        .count('tienda_id as totalTiendas')
    : [];

  const tiendaMap = {};
  tiendaCounts.forEach((t) => { tiendaMap[t.planograma_version_id] = Number(t.totalTiendas); });

  const versionesResumen = versiones.map((v) => ({
    id:           v.id,
    tipo:         v.tipo,
    codigo:       v.codigo,
    estado:       v.estado,
    totalTiendas: tiendaMap[v.id] ?? 0,
  }));

  return {
    ...planograma,
    subcategorias,
    versiones: versionesResumen,
  };
}

// ─── actualizar ──────────────────────────────────────────────────────────────

async function actualizar(id, camposMetadatos, subcategorias) {
  return db.transaction(async (trx) => {
    if (Object.keys(camposMetadatos).length > 0) {
      await trx(TABLA_PLANOGRAMA).where('id', id).update(camposMetadatos);
    }

    if (subcategorias !== undefined) {
      await trx(TABLA_SUBCATEGORIA).where('planograma_id', id).delete();

      if (subcategorias.length > 0) {
        const filas = subcategorias.map((s) => ({ planograma_id: id, subcategoria: s }));
        await trx(TABLA_SUBCATEGORIA).insert(filas);
      }
    }
  });
}

// ─── archivar ────────────────────────────────────────────────────────────────

async function archivar(id) {
  await db(TABLA_PLANOGRAMA).where('id', id).update({ estado: ESTADOS.ARCHIVADO });
}

// ─── existeNombreEnDepartamento ───────────────────────────────────────────────

async function existeNombreEnDepartamento(nombre, departamento, excluirId) {
  const query = db(TABLA_PLANOGRAMA)
    .where('nombre',       nombre)
    .where('departamento', departamento);

  if (excluirId !== undefined) {
    query.whereNot('id', excluirId);
  }

  const row = await query.select('id').first();
  return row !== undefined;
}

// ─── tieneVersionesPublicadas ─────────────────────────────────────────────────

async function tieneVersionesPublicadas(planogramaId) {
  const row = await db(TABLA_VERSION)
    .join(TABLA_VERSION_TIENDA, `${TABLA_VERSION}.id`, `${TABLA_VERSION_TIENDA}.planograma_version_id`)
    .where(`${TABLA_VERSION}.planograma_id`, planogramaId)
    .where(`${TABLA_VERSION}.estado`, 'publicado')
    .select(`${TABLA_VERSION}.id`)
    .first();

  return row !== undefined;
}

// ─── Exportación ─────────────────────────────────────────────────────────────

module.exports = {
  listar,
  crear,
  buscarPorId,
  actualizar,
  archivar,
  existeNombreEnDepartamento,
  tieneVersionesPublicadas,
};
