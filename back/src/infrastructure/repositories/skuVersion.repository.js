/**
 * skuVersion.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db = require('../db/connection');
const { mapearGondola, mapearSeccion, mapearNivel, mapearPosicionBase } = require('./mapeadoresVersion');

const TABLA_GONDOLA  = 'Gondola';
const TABLA_SECCION  = 'Seccion';
const TABLA_NIVEL    = 'Nivel';
const TABLA_POSICION = 'Posicion';
const TABLA_PRODUCTO = 'Producto';

// ─── cargarVersion ───────────────────────────────────────────────────────────

async function cargarVersion(versionId) {
  const gondolas = await db(TABLA_GONDOLA)
    .where('planograma_version_id', versionId)
    .select('id', 'nombre', 'orden', 'ancho_cm', 'alto_cm', 'por_ubicar');
  const gondolaIds = gondolas.map((g) => g.id);
  if (gondolaIds.length === 0) return { gondolas: [], secciones: [], niveles: [], posiciones: [] };

  const [secciones, niveles, posiciones] = await Promise.all([
    db(TABLA_SECCION).whereIn('gondola_id', gondolaIds),
    db(TABLA_NIVEL).whereIn('gondola_id', gondolaIds).select('id', 'gondola_id', 'seccion_id', 'orden'),
    db(TABLA_POSICION)
      .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
      .leftJoin(TABLA_PRODUCTO, `${TABLA_POSICION}.sku`, `${TABLA_PRODUCTO}.sku`)
      .whereIn(`${TABLA_NIVEL}.gondola_id`, gondolaIds)
      .select(
        `${TABLA_POSICION}.id`,
        `${TABLA_POSICION}.nivel_id`,
        `${TABLA_POSICION}.orden_horizontal`,
        `${TABLA_POSICION}.sku`,
        `${TABLA_POSICION}.facings_horizontal`,
        `${TABLA_POSICION}.capacidad_maxima`,
        `${TABLA_POSICION}.min_final`,
        `${TABLA_POSICION}.max_final`,
        `${TABLA_POSICION}.ganchos`,
        `${TABLA_PRODUCTO}.nombre as nombre`,
      ),
  ]);

  return {
    gondolas:   gondolas.map(mapearGondola),
    secciones:  secciones.map(mapearSeccion),
    niveles:    niveles.map(mapearNivel),
    posiciones: posiciones.map(mapearPosicionBase),
  };
}

// ─── actualizarMinMax ────────────────────────────────────────────────────────

async function actualizarMinMax(versionId, sku, cambios) {
  const campos = {};
  if (cambios.min_final !== undefined) campos.min_final = cambios.min_final;
  if (cambios.max_final !== undefined) campos.max_final = cambios.max_final;
  if (Object.keys(campos).length === 0) return;

  const nivelIds = db(TABLA_NIVEL)
    .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
    .where(`${TABLA_GONDOLA}.planograma_version_id`, versionId)
    .select(`${TABLA_NIVEL}.id`);

  await db(TABLA_POSICION).where('sku', sku).whereIn('nivel_id', nivelIds).update(campos);
}

module.exports = {
  cargarVersion,
  actualizarMinMax,
};
