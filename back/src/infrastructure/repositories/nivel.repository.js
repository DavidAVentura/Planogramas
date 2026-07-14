/**
 * nivel.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db = require('../db/connection');

const TABLA_NIVEL              = 'Nivel';
const TABLA_GONDOLA             = 'Gondola';
const TABLA_ACCESORIO           = 'Accesorio';
const TABLA_POSICION            = 'Posicion';
const TABLA_POSICION_ACCESORIO  = 'PosicionAccesorio';

const COLUMNAS_NIVEL = [
  `${TABLA_NIVEL}.id`,
  `${TABLA_NIVEL}.gondola_id`,
  `${TABLA_NIVEL}.orden`,
  `${TABLA_NIVEL}.altura_desde_piso_cm`,
  `${TABLA_NIVEL}.ancho_disponible_cm`,
  `${TABLA_NIVEL}.tipo_accesorio`,
  `${TABLA_NIVEL}.codigo_accesorio_id`,
  `${TABLA_NIVEL}.tamano_accesorio_pulgadas`,
  `${TABLA_NIVEL}.notas`,
  `${TABLA_ACCESORIO}.codigo as accesorio_codigo`,
  `${TABLA_ACCESORIO}.nombre as accesorio_nombre`,
];

// ─── Helpers privados ────────────────────────────────────────────────────────

function nivelConAccesorio() {
  return db(TABLA_NIVEL)
    .leftJoin(TABLA_ACCESORIO, `${TABLA_NIVEL}.codigo_accesorio_id`, `${TABLA_ACCESORIO}.id`)
    .select(COLUMNAS_NIVEL);
}

function mapNivel(row) {
  return {
    id:                        row.id,
    gondolaId:                 row.gondola_id,
    orden:                     row.orden,
    altura_desde_piso_cm:      Number(row.altura_desde_piso_cm),
    tipo_accesorio:            row.tipo_accesorio,
    accesorio: row.codigo_accesorio_id
      ? { id: row.codigo_accesorio_id, codigo: row.accesorio_codigo, nombre: row.accesorio_nombre }
      : null,
    tamano_accesorio_pulgadas: row.tamano_accesorio_pulgadas != null ? Number(row.tamano_accesorio_pulgadas) : null,
    ancho_disponible_cm:       Number(row.ancho_disponible_cm),
    notas:                     row.notas,
  };
}

// ─── listarPorGondola ────────────────────────────────────────────────────────

async function listarPorGondola(gondolaId) {
  const niveles = await nivelConAccesorio()
    .where(`${TABLA_NIVEL}.gondola_id`, gondolaId)
    .orderBy(`${TABLA_NIVEL}.orden`, 'asc');

  return niveles.map(mapNivel);
}

// ─── buscarPorId ─────────────────────────────────────────────────────────────

async function buscarPorId(id) {
  const row = await nivelConAccesorio().where(`${TABLA_NIVEL}.id`, id).first();
  return row ? mapNivel(row) : null;
}

// ─── obtenerResumen ──────────────────────────────────────────────────────────

async function obtenerResumen(id) {
  const nivel = await db(TABLA_NIVEL)
    .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
    .where(`${TABLA_NIVEL}.id`, id)
    .select(`${TABLA_NIVEL}.id`, `${TABLA_NIVEL}.orden`, `${TABLA_GONDOLA}.nombre as gondolaNombre`)
    .first();
  if (!nivel) return null;

  const [{ totalPosiciones }] = await db(TABLA_POSICION).where('nivel_id', id).count('id as totalPosiciones');

  return {
    id:              nivel.id,
    gondolaNombre:   nivel.gondolaNombre,
    orden:           nivel.orden,
    totalPosiciones: Number(totalPosiciones),
  };
}

// ─── accesorioExiste ─────────────────────────────────────────────────────────

async function accesorioExiste(id) {
  const row = await db(TABLA_ACCESORIO).where('id', id).select('id').first();
  return Boolean(row);
}

// ─── contarPosiciones ────────────────────────────────────────────────────────

async function contarPosiciones(id) {
  const [{ total }] = await db(TABLA_POSICION).where('nivel_id', id).count('id as total');
  return Number(total);
}

// ─── anchoOcupadoCm ──────────────────────────────────────────────────────────

async function anchoOcupadoCm(id) {
  const [{ total }] = await db(TABLA_POSICION).where('nivel_id', id).sum('ancho_asignado_cm as total');
  return Number(total ?? 0);
}

// ─── crearConOrden ───────────────────────────────────────────────────────────
// Inserta el nivel en la posición `orden` indicada, desplazando (+1) los niveles
// existentes de la misma góndola con orden >= al solicitado — ver POST_niveles_agregar.md.

async function crearConOrden(nivel) {
  return db.transaction(async (trx) => {
    await trx(TABLA_NIVEL)
      .where('gondola_id', nivel.gondola_id)
      .where('orden', '>=', nivel.orden)
      .increment('orden', 1);

    const [{ id }] = await trx(TABLA_NIVEL).insert(nivel).returning('id');
    return id;
  });
}

// ─── actualizar ──────────────────────────────────────────────────────────────

async function actualizar(id, cambios) {
  const campos = {};
  if (cambios.altura_desde_piso_cm      !== undefined) campos.altura_desde_piso_cm      = cambios.altura_desde_piso_cm;
  if (cambios.tipo_accesorio            !== undefined) campos.tipo_accesorio            = cambios.tipo_accesorio;
  if (cambios.codigo_accesorio_id       !== undefined) campos.codigo_accesorio_id       = cambios.codigo_accesorio_id;
  if (cambios.tamano_accesorio_pulgadas !== undefined) campos.tamano_accesorio_pulgadas = cambios.tamano_accesorio_pulgadas;
  if (cambios.ancho_disponible_cm       !== undefined) campos.ancho_disponible_cm       = cambios.ancho_disponible_cm;
  if (cambios.notas                     !== undefined) campos.notas                     = cambios.notas;

  if (Object.keys(campos).length > 0) {
    await db(TABLA_NIVEL).where('id', id).update(campos);
  }
}

// ─── contarPertenecientesAGondola ────────────────────────────────────────────

async function contarPertenecientesAGondola(gondolaId, ids) {
  const [{ total }] = await db(TABLA_NIVEL)
    .where('gondola_id', gondolaId)
    .whereIn('id', ids)
    .count('id as total');

  return Number(total);
}

// ─── reordenar ───────────────────────────────────────────────────────────────

async function reordenar(orden) {
  await db.transaction(async (trx) => {
    for (const { id, orden: nuevoOrden } of orden) {
      await trx(TABLA_NIVEL).where('id', id).update({ orden: nuevoOrden });
    }
  });
}

// ─── eliminar ────────────────────────────────────────────────────────────────
// Cascada explícita a nivel de aplicación: PosicionAccesorio → Posicion → Nivel.

async function eliminar(id) {
  await db.transaction(async (trx) => {
    const posicionIds = await trx(TABLA_POSICION).where('nivel_id', id).pluck('id');

    if (posicionIds.length > 0) {
      await trx(TABLA_POSICION_ACCESORIO).whereIn('posicion_id', posicionIds).delete();
      await trx(TABLA_POSICION).whereIn('id', posicionIds).delete();
    }

    await trx(TABLA_NIVEL).where('id', id).delete();
  });
}

// ─── Exportación ─────────────────────────────────────────────────────────────

module.exports = {
  listarPorGondola,
  buscarPorId,
  obtenerResumen,
  accesorioExiste,
  contarPosiciones,
  anchoOcupadoCm,
  crearConOrden,
  actualizar,
  contarPertenecientesAGondola,
  reordenar,
  eliminar,
};
