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

// ─── Exportación ─────────────────────────────────────────────────────────────

module.exports = {
  listar,
  buscarPorId,
};
