/**
 * seccion.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db = require('../db/connection');

const TABLA_SECCION  = 'Seccion';
const TABLA_NIVEL    = 'Nivel';
const TABLA_POSICION = 'Posicion';

function mapSeccion(row) {
  return {
    id:         row.id,
    gondolaId:  row.gondola_id,
    padreId:    row.padre_id,
    esDivision: Boolean(row.es_division),
    direccion:  row.direccion,
    orden:      row.orden,
    tamCm:      Number(row.tam_cm),
  };
}

// ─── listarPorGondola ────────────────────────────────────────────────────────

async function listarPorGondola(gondolaId, trx = db) {
  const filas = await trx(TABLA_SECCION).where('gondola_id', gondolaId).orderBy('orden', 'asc');
  return filas.map(mapSeccion);
}

// ─── buscarPorId ─────────────────────────────────────────────────────────────

async function buscarPorId(id) {
  const row = await db(TABLA_SECCION).where('id', id).first();
  return row ? mapSeccion(row) : null;
}

// ─── listarNivelesDeGondola ──────────────────────────────────────────────────

async function listarNivelesDeGondola(gondolaId) {
  const conteo = db(TABLA_POSICION)
    .groupBy('nivel_id')
    .select('nivel_id')
    .count('id as total')
    .as('c');

  const rows = await db(TABLA_NIVEL)
    .leftJoin(conteo, 'c.nivel_id', `${TABLA_NIVEL}.id`)
    .where(`${TABLA_NIVEL}.gondola_id`, gondolaId)
    .select(`${TABLA_NIVEL}.*`, db.raw('COALESCE(c.total, 0) as totalPosiciones'))
    .orderBy(`${TABLA_NIVEL}.orden`, 'asc');

  return rows.map((r) => ({
    id:                      r.id,
    seccionId:               r.seccion_id,
    seccionIdBd:             r.seccion_id,
    orden:                   r.orden,
    alturaDesdePisoCm:       Number(r.altura_desde_piso_cm),
    tipoAccesorio:           r.tipo_accesorio,
    codigoAccesorioId:       r.codigo_accesorio_id,
    tamanoAccesorioPulgadas: r.tamano_accesorio_pulgadas != null ? Number(r.tamano_accesorio_pulgadas) : null,
    anchoDisponibleCm:       Number(r.ancho_disponible_cm),
    totalPosiciones:         Number(r.totalPosiciones),
  }));
}

// ─── guardarEstructura ───────────────────────────────────────────────────────
// Sincroniza la tabla Seccion con el árbol deseado (ids negativos = nodos nuevos) y aplica los
// cambios de niveles, todo en una transacción. Orden: insertar nodos nuevos (padres primero) →
// actualizar existentes → niveles (con ids temporales ya traducidos) → borrar nodos sobrantes.

async function guardarEstructura(gondolaId, { nodos, niveles }) {
  await db.transaction(async (trx) => {
    const existentes = await listarPorGondola(gondolaId, trx);
    const idsExistentes = new Set(existentes.map((s) => s.id));
    const real = new Map(); // id temporal → id real
    const resolver = (id) => (id === null || id === undefined ? null : (id < 0 ? real.get(id) : id));

    const pendientes = nodos.filter((n) => n.id < 0);
    while (pendientes.length) {
      const i = pendientes.findIndex((n) => n.padreId === null || n.padreId > 0 || real.has(n.padreId));
      const n = pendientes.splice(i, 1)[0];
      const [{ id }] = await trx(TABLA_SECCION).insert({
        gondola_id:  gondolaId,
        padre_id:    resolver(n.padreId),
        es_division: n.esDivision,
        direccion:   n.direccion,
        orden:       n.orden,
        tam_cm:      n.tamCm,
      }).returning('id');
      real.set(n.id, id);
    }

    for (const n of nodos.filter((x) => x.id > 0)) {
      await trx(TABLA_SECCION).where('id', n.id).update({
        padre_id:    resolver(n.padreId),
        es_division: n.esDivision,
        direccion:   n.direccion,
        orden:       n.orden,
        tam_cm:      n.tamCm,
      });
    }

    for (const cambio of niveles.actualizar) {
      const campos = {};
      if (cambio.seccion_id !== undefined)          campos.seccion_id          = resolver(cambio.seccion_id);
      if (cambio.ancho_disponible_cm !== undefined) campos.ancho_disponible_cm = cambio.ancho_disponible_cm;
      await trx(TABLA_NIVEL).where('id', cambio.id).update(campos);
    }
    for (const nuevo of niveles.crear) {
      await trx(TABLA_NIVEL).insert({ ...nuevo, gondola_id: gondolaId, seccion_id: resolver(nuevo.seccion_id) });
    }
    if (niveles.eliminar.length) {
      // Solo llegan niveles sin posiciones (validado en el caso de uso).
      await trx(TABLA_NIVEL).whereIn('id', niveles.eliminar).delete();
    }

    const deseados = new Set(nodos.filter((n) => n.id > 0).map((n) => n.id));
    const sobrantes = [...idsExistentes].filter((id) => !deseados.has(id));
    if (sobrantes.length) {
      await trx(TABLA_NIVEL).whereIn('seccion_id', sobrantes).update({ seccion_id: null });
      await trx(TABLA_SECCION).whereIn('id', sobrantes).update({ padre_id: null });
      await trx(TABLA_SECCION).whereIn('id', sobrantes).delete();
    }
  });
}

module.exports = {
  listarPorGondola,
  buscarPorId,
  listarNivelesDeGondola,
  guardarEstructura,
};
