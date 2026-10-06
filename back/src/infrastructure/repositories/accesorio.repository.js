/**
 * accesorio.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db = require('../db/connection');

const TABLA_ACCESORIO = 'Accesorio';

// ─── listar ──────────────────────────────────────────────────────────────────

async function listar({ tipo }) {
  const query = db(TABLA_ACCESORIO)
    .select('id', 'codigo', 'nombre', 'tipo', 'longitud_cm', 'ancho_cm')
    .orderBy([{ column: 'tipo', order: 'asc' }, { column: 'nombre', order: 'asc' }]);

  if (tipo) query.where('tipo', tipo);

  return query;
}

// ─── buscarPorId ─────────────────────────────────────────────────────────────

async function buscarPorId(id) {
  const accesorio = await db(TABLA_ACCESORIO)
    .where('id', id)
    .select('id', 'codigo', 'nombre', 'tipo', 'longitud_cm', 'ancho_cm', 'notas_capacidad')
    .first();

  return accesorio ?? null;
}

// ─── buscarPorCodigo ─────────────────────────────────────────────────────────

/** Busca por código ya normalizado (mayúsculas, sin espacios extra) — comparación sin distinguir
 * mayúsculas para no depender de la collation de la columna. */
async function buscarPorCodigo(codigoNormalizado) {
  const accesorio = await db(TABLA_ACCESORIO)
    .whereRaw('UPPER(LTRIM(RTRIM(codigo))) = ?', [codigoNormalizado])
    .select('id', 'codigo', 'nombre', 'tipo', 'longitud_cm', 'ancho_cm', 'notas_capacidad')
    .first();

  return accesorio ?? null;
}

// ─── crear ───────────────────────────────────────────────────────────────────

async function crear(datos) {
  const [{ id }] = await db(TABLA_ACCESORIO).insert({
    codigo:          datos.codigo,
    nombre:          datos.nombre,
    tipo:            datos.tipo,
    longitud_cm:     datos.longitud_cm ?? null,
    ancho_cm:        datos.ancho_cm ?? null,
    notas_capacidad: datos.notas_capacidad ?? null,
  }).returning('id');
  return id;
}

// ─── actualizar ──────────────────────────────────────────────────────────────

const CAMPOS_EDITABLES = ['codigo', 'nombre', 'tipo', 'longitud_cm', 'ancho_cm', 'notas_capacidad'];

async function actualizar(id, cambios) {
  const campos = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (cambios[campo] !== undefined) campos[campo] = cambios[campo];
  }
  if (Object.keys(campos).length > 0) await db(TABLA_ACCESORIO).where('id', id).update(campos);
}

// ─── contarUsos ──────────────────────────────────────────────────────────────

async function contarUsos(id) {
  const [{ total: niveles }] = await db('Nivel').where('codigo_accesorio_id', id).count('id as total');
  const [{ total: posiciones }] = await db('PosicionAccesorio').where('accesorio_id', id).count('id as total');
  return { niveles: Number(niveles), posiciones: Number(posiciones) };
}

// ─── eliminar ────────────────────────────────────────────────────────────────

async function eliminar(id) {
  await db(TABLA_ACCESORIO).where('id', id).delete();
}

// ─── Exportación ─────────────────────────────────────────────────────────────

module.exports = {
  listar,
  buscarPorId,
  buscarPorCodigo,
  crear,
  actualizar,
  contarUsos,
  eliminar,
};
