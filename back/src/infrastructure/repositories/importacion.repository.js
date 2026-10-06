/**
 * importacion.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db = require('../db/connection');
const {
  POSICIONES_POR_NIVEL,
  NOMBRE_POR_UBICAR,
  geometriaPorUbicar,
} = require('../../domain/importacion/importacion.entity');

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

    const sinAccesorios = [];
    for (const { accesorios, ganchos, ...posicion } of posiciones) {
      const fila = { ...posicion, ganchos: ganchos?.length ? JSON.stringify(ganchos) : null, nivel_id: nivelId };
      if (!accesorios?.length) {
        sinAccesorios.push(fila);
        continue;
      }
      // Con accesorios hace falta el id de la posición: se inserta sola.
      const [{ id: posicionId }] = await trx(TABLA_POSICION).insert(fila).returning('id');
      await trx(TABLA_POSICION_ACCESORIO).insert(accesorios.map((a, i) => ({
        posicion_id: posicionId, accesorio_id: a.accesorio_id, tamano_pulgadas: a.tamano_pulgadas ?? null,
        nota_libre: a.nota_libre ?? null, orden: a.orden ?? i + 1,
      })));
    }
    for (let i = 0; i < sinAccesorios.length; i += FILAS_POR_INSERT) {
      await trx(TABLA_POSICION).insert(sinAccesorios.slice(i, i + FILAS_POR_INSERT));
    }
    totalPosiciones += posiciones.length;
  }
  return totalPosiciones;
}

/** Aplica el cruce con "Por ubicar": quita los productos ya ubicados, deja los ganchos sobrantes
 * en los que se ubicaron en parte y elimina la góndola "Por ubicar" si quedó vacía. */
async function aplicarCruce(trx, versionId, { eliminar, actualizar }) {
  if (!eliminar.length && !actualizar.length) return;
  if (eliminar.length) {
    await trx(TABLA_POSICION_ACCESORIO).whereIn('posicion_id', eliminar).delete();
    await trx(TABLA_POSICION).whereIn('id', eliminar).delete();
  }
  for (const { id, ganchos, ...campos } of actualizar) {
    await trx(TABLA_POSICION).where('id', id).update({ ...campos, ganchos: JSON.stringify(ganchos) });
  }

  const porUbicar = await trx(TABLA_GONDOLA).where({ planograma_version_id: versionId, por_ubicar: true }).first();
  if (!porUbicar) return;
  const nivelIds = await trx(TABLA_NIVEL).where('gondola_id', porUbicar.id).pluck('id');
  const [{ total }] = nivelIds.length
    ? await trx(TABLA_POSICION).whereIn('nivel_id', nivelIds).count('id as total')
    : [{ total: 0 }];
  if (Number(total) > 0) return;
  if (nivelIds.length) await trx(TABLA_NIVEL).whereIn('id', nivelIds).delete();
  await trx(TABLA_SECCION).where('gondola_id', porUbicar.id).update({ padre_id: null });
  await trx(TABLA_SECCION).where('gondola_id', porUbicar.id).delete();
  await trx(TABLA_GONDOLA).where('id', porUbicar.id).delete();
}

// ─── importarCuerpos ─────────────────────────────────────────────────────────

async function importarCuerpos(versionId, planes, cruce = { eliminar: [], actualizar: [] }) {
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
    await aplicarCruce(trx, versionId, cruce);
    return resultado;
  });
}

// ─── posicionesPorUbicar ─────────────────────────────────────────────────────

/** Posiciones de la góndola "Por ubicar" de la versión, con sus ganchos y accesorios. */
async function posicionesPorUbicar(versionId) {
  const filas = await db(TABLA_POSICION)
    .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
    .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
    .where(`${TABLA_GONDOLA}.planograma_version_id`, versionId)
    .where(`${TABLA_GONDOLA}.por_ubicar`, true)
    .whereNotNull(`${TABLA_POSICION}.ganchos`)
    .select(`${TABLA_POSICION}.*`);
  if (!filas.length) return [];

  const accesorios = await db(TABLA_POSICION_ACCESORIO).whereIn('posicion_id', filas.map((f) => f.id)).orderBy('orden', 'asc');
  return filas.map((f) => ({
    id:                  f.id,
    sku:                 f.sku ?? null,
    nombre_detectado:    f.nombre_detectado ?? null,
    confidence:          f.confidence ?? 100,
    ganchos:             (() => { try { return JSON.parse(f.ganchos).map(Number); } catch { return []; } })(),
    facings_horizontal:  f.facings_horizontal,
    cantidad_apilable:   f.cantidad_apilable,
    unidades_por_facing: f.unidades_por_facing,
    min_estetico:        f.min_estetico,
    min_final:           f.min_final,
    max_final:           f.max_final,
    perfil_redondeo:     f.perfil_redondeo,
    modo:                f.modo,
    decision:            f.decision,
    observaciones:       f.observaciones,
    accesorios:          accesorios.filter((a) => a.posicion_id === f.id).map((a) => ({
      accesorio_id: a.accesorio_id, tamano_pulgadas: a.tamano_pulgadas != null ? Number(a.tamano_pulgadas) : null, nota_libre: a.nota_libre, orden: a.orden,
    })),
  })).filter((p) => p.ganchos.length);
}

// ─── skusDeVersion ───────────────────────────────────────────────────────────

async function skusDeVersion(versionId) {
  const filas = await db(TABLA_POSICION)
    .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
    .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
    .where(`${TABLA_GONDOLA}.planograma_version_id`, versionId)
    .whereNotNull(`${TABLA_POSICION}.sku`)
    .distinct(`${TABLA_POSICION}.sku`);
  return new Set(filas.map((f) => f.sku));
}

// ─── importarPorUbicar ───────────────────────────────────────────────────────

async function obtenerOCrearPorUbicar(trx, versionId) {
  const existente = await trx(TABLA_GONDOLA).where({ planograma_version_id: versionId, por_ubicar: true }).first();
  if (existente) return { id: existente.id, creada: false };

  const [{ max }] = await trx(TABLA_GONDOLA).where('planograma_version_id', versionId).max('orden as max');
  const { gondola } = geometriaPorUbicar(1, 0);
  const [{ id }] = await trx(TABLA_GONDOLA)
    .insert({ ...gondola, nombre: NOMBRE_POR_UBICAR, planograma_version_id: versionId, orden: (max ?? 0) + 1, por_ubicar: true })
    .returning('id');
  return { id, creada: true };
}

/** Niveles de la góndola (orden 1 = arriba) con su conteo de posiciones y ancho ocupado. */
async function nivelesConOcupacion(trx, gondolaId) {
  const niveles = await trx(TABLA_NIVEL).where('gondola_id', gondolaId).orderBy('orden', 'asc').select('id', 'orden');
  if (!niveles.length) return [];
  const conteos = await trx(TABLA_POSICION)
    .whereIn('nivel_id', niveles.map((n) => n.id))
    .groupBy('nivel_id')
    .select('nivel_id')
    .count('id as total')
    .max('orden_horizontal as maxOrden')
    .sum('ancho_asignado_cm as ancho');
  const porNivel = new Map(conteos.map((c) => [c.nivel_id, c]));
  return niveles.map((n) => ({
    id:       n.id,
    orden:    n.orden,
    total:    Number(porNivel.get(n.id)?.total ?? 0),
    maxOrden: Number(porNivel.get(n.id)?.maxOrden ?? 0),
    ancho:    Number(porNivel.get(n.id)?.ancho ?? 0),
  }));
}

async function insertarPosicionPorUbicar(trx, nivelId, ordenHorizontal, { accesorio, ganchos, ...posicion }) {
  const [{ id }] = await trx(TABLA_POSICION).insert({
    ...posicion,
    ganchos:          ganchos ? JSON.stringify(ganchos) : null,
    nivel_id:         nivelId,
    orden_horizontal: ordenHorizontal,
  }).returning('id');
  if (accesorio) {
    await trx(TABLA_POSICION_ACCESORIO).insert({
      posicion_id: id, accesorio_id: accesorio.id, tamano_pulgadas: accesorio.tamano_pulgadas, orden: 1,
    });
  }
}

async function importarPorUbicar(versionId, posiciones) {
  return db.transaction(async (trx) => {
    const { id: gondolaId, creada } = await obtenerOCrearPorUbicar(trx, versionId);
    const niveles = await nivelesConOcupacion(trx, gondolaId);

    const pendientes = [...posiciones];
    // 1. Completar los niveles de relleno que tienen lugar.
    for (const nivel of niveles) {
      while (nivel.total < POSICIONES_POR_NIVEL && pendientes.length) {
        const posicion = pendientes.shift();
        nivel.maxOrden += 1;
        nivel.total += 1;
        nivel.ancho += posicion.ancho_asignado_cm;
        await insertarPosicionPorUbicar(trx, nivel.id, nivel.maxOrden, posicion);
      }
    }
    // 2. Crear niveles nuevos (debajo de los existentes) para el resto.
    let orden = niveles.length;
    while (pendientes.length) {
      orden += 1;
      const lote = pendientes.splice(0, POSICIONES_POR_NIVEL);
      const [{ id: nivelId }] = await trx(TABLA_NIVEL).insert({
        gondola_id: gondolaId, orden, altura_desde_piso_cm: 0, ancho_disponible_cm: 0, tipo_accesorio: 'OTRO',
        notas: 'Relleno de la góndola Por ubicar',
      }).returning('id');
      for (const [i, posicion] of lote.entries()) await insertarPosicionPorUbicar(trx, nivelId, i + 1, posicion);
      niveles.push({ id: nivelId, orden, total: lote.length, maxOrden: lote.length, ancho: lote.reduce((t, p) => t + p.ancho_asignado_cm, 0) });
    }

    // 3. Medidas de la góndola y alturas de todos sus niveles (relleno, de arriba hacia abajo).
    const { gondola, alturas } = geometriaPorUbicar(niveles.length, Math.max(...niveles.map((n) => n.ancho)));
    await trx(TABLA_GONDOLA).where('id', gondolaId).update(gondola);
    for (const [i, nivel] of niveles.entries()) {
      await trx(TABLA_NIVEL).where('id', nivel.id).update({
        orden: i + 1, altura_desde_piso_cm: alturas[i], ancho_disponible_cm: gondola.ancho_cm,
      });
    }

    return { id: gondolaId, creada, totalNiveles: niveles.length };
  });
}

module.exports = {
  importarCuerpos,
  posicionesPorUbicar,
  skusDeVersion,
  importarPorUbicar,
};
