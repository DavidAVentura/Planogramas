/**
 * gondola.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db = require('../db/connection');

const TABLA_GONDOLA            = 'Gondola';
const TABLA_NIVEL              = 'Nivel';
const TABLA_POSICION           = 'Posicion';
const TABLA_POSICION_ACCESORIO = 'PosicionAccesorio';

// ─── Helpers privados ────────────────────────────────────────────────────────

function mapGondola(row) {
  return {
    id:                 row.id,
    versionId:          row.planograma_version_id,
    nombre:             row.nombre,
    ancho_cm:           Number(row.ancho_cm),
    alto_cm:            Number(row.alto_cm),
    profundidad_cm:     Number(row.profundidad_cm),
    posicion_en_tienda: row.posicion_en_tienda,
    orden:              row.orden,
  };
}

// ─── listarPorVersion ────────────────────────────────────────────────────────

async function listarPorVersion(versionId) {
  const gondolas = await db(TABLA_GONDOLA)
    .where('planograma_version_id', versionId)
    .orderBy('orden', 'asc');

  const ids = gondolas.map((g) => g.id);
  const nivelCounts = ids.length
    ? await db(TABLA_NIVEL)
        .whereIn('gondola_id', ids)
        .groupBy('gondola_id')
        .select('gondola_id')
        .count('id as total')
    : [];

  const nivelMap = {};
  nivelCounts.forEach((n) => { nivelMap[n.gondola_id] = Number(n.total); });

  return gondolas.map((g) => ({ ...mapGondola(g), totalNiveles: nivelMap[g.id] ?? 0 }));
}

// ─── buscarPorId ─────────────────────────────────────────────────────────────

async function buscarPorId(id) {
  const row = await db(TABLA_GONDOLA).where('id', id).first();
  return row ? mapGondola(row) : null;
}

// ─── obtenerResumen ──────────────────────────────────────────────────────────

async function obtenerResumen(id) {
  const gondola = await db(TABLA_GONDOLA).where('id', id).select('id', 'nombre').first();
  if (!gondola) return null;

  const [{ totalNiveles }] = await db(TABLA_NIVEL).where('gondola_id', id).count('id as totalNiveles');

  const [{ totalPosiciones }] = await db(TABLA_POSICION)
    .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
    .where(`${TABLA_NIVEL}.gondola_id`, id)
    .count(`${TABLA_POSICION}.id as totalPosiciones`);

  return {
    id:              gondola.id,
    nombre:          gondola.nombre,
    totalNiveles:    Number(totalNiveles),
    totalPosiciones: Number(totalPosiciones),
  };
}

// ─── siguienteOrden ──────────────────────────────────────────────────────────

async function siguienteOrden(versionId) {
  const [{ max }] = await db(TABLA_GONDOLA)
    .where('planograma_version_id', versionId)
    .max('orden as max');

  return (max ?? 0) + 1;
}

// ─── crear ───────────────────────────────────────────────────────────────────

async function crear(gondola) {
  const [{ id }] = await db(TABLA_GONDOLA).insert(gondola).returning('id');
  return id;
}

// ─── actualizar ──────────────────────────────────────────────────────────────
// Si ancho_cm cambia, recalcula ancho_disponible_cm en los niveles cuyo ancho
// coincidía con el ancho anterior de la góndola — ver PATCH_gondolas_editar.md.

async function actualizar(id, cambios) {
  return db.transaction(async (trx) => {
    const actual = await trx(TABLA_GONDOLA).where('id', id).select('ancho_cm').first();

    const campos = {};
    if (cambios.nombre             !== undefined) campos.nombre             = cambios.nombre;
    if (cambios.ancho_cm           !== undefined) campos.ancho_cm           = cambios.ancho_cm;
    if (cambios.alto_cm            !== undefined) campos.alto_cm            = cambios.alto_cm;
    if (cambios.profundidad_cm     !== undefined) campos.profundidad_cm     = cambios.profundidad_cm;
    if (cambios.posicion_en_tienda !== undefined) campos.posicion_en_tienda = cambios.posicion_en_tienda;

    if (Object.keys(campos).length > 0) {
      await trx(TABLA_GONDOLA).where('id', id).update(campos);
    }

    let nivelesActualizados = 0;

    if (cambios.ancho_cm !== undefined && Number(cambios.ancho_cm) !== Number(actual.ancho_cm)) {
      nivelesActualizados = await trx(TABLA_NIVEL)
        .where('gondola_id', id)
        .where('ancho_disponible_cm', actual.ancho_cm)
        .update({ ancho_disponible_cm: cambios.ancho_cm });
    }

    return { nivelesActualizados };
  });
}

// ─── contarPertenecientesAVersion ────────────────────────────────────────────

async function contarPertenecientesAVersion(versionId, ids) {
  const [{ total }] = await db(TABLA_GONDOLA)
    .where('planograma_version_id', versionId)
    .whereIn('id', ids)
    .count('id as total');

  return Number(total);
}

// ─── reordenar ───────────────────────────────────────────────────────────────

async function reordenar(orden) {
  await db.transaction(async (trx) => {
    for (const { id, orden: nuevoOrden } of orden) {
      await trx(TABLA_GONDOLA).where('id', id).update({ orden: nuevoOrden });
    }
  });
}

// ─── eliminar ────────────────────────────────────────────────────────────────
// Cascada explícita a nivel de aplicación: PosicionAccesorio → Posicion → Nivel → Gondola.

async function eliminar(id) {
  await db.transaction(async (trx) => {
    const nivelIds = await trx(TABLA_NIVEL).where('gondola_id', id).pluck('id');

    if (nivelIds.length > 0) {
      const posicionIds = await trx(TABLA_POSICION).whereIn('nivel_id', nivelIds).pluck('id');

      if (posicionIds.length > 0) {
        await trx(TABLA_POSICION_ACCESORIO).whereIn('posicion_id', posicionIds).delete();
        await trx(TABLA_POSICION).whereIn('id', posicionIds).delete();
      }

      await trx(TABLA_NIVEL).whereIn('id', nivelIds).delete();
    }

    await trx(TABLA_GONDOLA).where('id', id).delete();
  });
}

// ─── Exportación ─────────────────────────────────────────────────────────────

module.exports = {
  listarPorVersion,
  buscarPorId,
  obtenerResumen,
  siguienteOrden,
  crear,
  actualizar,
  contarPertenecientesAVersion,
  reordenar,
  eliminar,
};
