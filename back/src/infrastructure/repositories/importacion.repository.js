/**
 * importacion.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db = require('../db/connection');

const TABLA_GONDOLA            = 'Gondola';
const TABLA_SECCION            = 'Seccion';
const TABLA_NIVEL              = 'Nivel';
const TABLA_POSICION           = 'Posicion';
const TABLA_POSICION_ACCESORIO = 'PosicionAccesorio';

/** SQL Server admite hasta 2100 parámetros por sentencia: ~16 columnas × 100 filas queda holgado. */
const FILAS_POR_INSERT = 100;

// ─── Helpers privados ────────────────────────────────────────────────────────

/** Borra todo el contenido de la góndola (posiciones, niveles, secciones), conservando la góndola. */
async function vaciarGondola(trx, gondolaId) {
  const nivelIds = await trx(TABLA_NIVEL).where('gondola_id', gondolaId).pluck('id');
  if (nivelIds.length > 0) {
    const posicionIds = trx(TABLA_POSICION).whereIn('nivel_id', nivelIds).select('id');
    await trx(TABLA_POSICION_ACCESORIO).whereIn('posicion_id', posicionIds).delete();
    await trx(TABLA_POSICION).whereIn('nivel_id', nivelIds).delete();
    await trx(TABLA_NIVEL).whereIn('id', nivelIds).delete();
  }
  await trx(TABLA_SECCION).where('gondola_id', gondolaId).update({ padre_id: null });
  await trx(TABLA_SECCION).where('gondola_id', gondolaId).delete();
}

async function prepararGondola(trx, versionId, plan, orden) {
  if (plan.destino === 'REEMPLAZAR') {
    await vaciarGondola(trx, plan.gondolaId);
    await trx(TABLA_GONDOLA).where('id', plan.gondolaId).update(plan.gondola);
    return plan.gondolaId;
  }
  const [{ id }] = await trx(TABLA_GONDOLA)
    .insert({ ...plan.gondola, planograma_version_id: versionId, orden })
    .returning('id');
  return id;
}

/** Inserta los nodos (ids temporales negativos) padres primero; devuelve id temporal → id real. */
async function insertarSecciones(trx, gondolaId, nodos) {
  const real = new Map();
  const pendientes = [...nodos];
  while (pendientes.length) {
    const i = pendientes.findIndex((n) => n.padreId === null || real.has(n.padreId));
    const n = pendientes.splice(i, 1)[0];
    const [{ id }] = await trx(TABLA_SECCION).insert({
      gondola_id:  gondolaId,
      padre_id:    n.padreId === null ? null : real.get(n.padreId),
      es_division: n.esDivision,
      direccion:   n.direccion,
      orden:       n.orden,
      tam_cm:      n.tamCm,
    }).returning('id');
    real.set(n.id, id);
  }
  return real;
}

async function insertarNiveles(trx, gondolaId, niveles, seccionReal) {
  let totalPosiciones = 0;
  for (const { posiciones, seccion_id, ...nivel } of niveles) {
    const [{ id: nivelId }] = await trx(TABLA_NIVEL).insert({
      ...nivel,
      gondola_id: gondolaId,
      seccion_id: seccion_id === null ? null : seccionReal.get(seccion_id),
    }).returning('id');

    const filas = posiciones.map((p) => ({ ...p, nivel_id: nivelId }));
    for (let i = 0; i < filas.length; i += FILAS_POR_INSERT) {
      await trx(TABLA_POSICION).insert(filas.slice(i, i + FILAS_POR_INSERT));
    }
    totalPosiciones += filas.length;
  }
  return totalPosiciones;
}

// ─── importarCuerpos ─────────────────────────────────────────────────────────

async function importarCuerpos(versionId, planes) {
  return db.transaction(async (trx) => {
    const [{ max }] = await trx(TABLA_GONDOLA).where('planograma_version_id', versionId).max('orden as max');
    let siguienteOrden = (max ?? 0) + 1;

    const resultado = [];
    for (const plan of planes) {
      const orden = plan.destino === 'NUEVA' ? siguienteOrden++ : null;
      const gondolaId = await prepararGondola(trx, versionId, plan, orden);
      const seccionReal = await insertarSecciones(trx, gondolaId, plan.secciones);
      const totalPosiciones = await insertarNiveles(trx, gondolaId, plan.niveles, seccionReal);

      resultado.push({
        id:              gondolaId,
        nombre:          plan.gondola.nombre,
        destino:         plan.destino,
        totalSecciones:  plan.secciones.length,
        totalNiveles:    plan.niveles.length,
        totalPosiciones,
      });
    }
    return resultado;
  });
}

module.exports = {
  importarCuerpos,
};
