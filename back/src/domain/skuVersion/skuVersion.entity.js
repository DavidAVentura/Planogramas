/**
 * skuVersion.entity.js
 * Reglas de negocio puras de "SKU en la versión": agregados por SKU (sumando todas sus
 * ubicaciones) y numeración de ganchos. Sin dependencias de Express, Knex ni infraestructura.
 *
 * Los números de gancho NO se guardan: se calculan recorriendo las góndolas por `orden`, dentro
 * de cada góndola sus secciones (arriba antes que abajo, izquierda antes que derecha), dentro de
 * cada sección sus niveles por `orden` (el mismo orden en que el lienzo los dibuja, de arriba
 * hacia abajo) y dentro de cada nivel sus posiciones por `orden_horizontal`. Cada facing recibe un
 * número; los espacios pendientes (sin SKU) también, para que asignarles producto no corra la
 * numeración del resto.
 */

const { construirArbol, calcularHojas } = require('../seccion/seccion.entity');

function errorUnprocessable(mensaje, details) {
  const err = new Error(mensaje);
  err.status = 422;
  err.code   = 'UNPROCESSABLE';
  if (details) err.details = details;
  return err;
}

/**
 * Recorre la versión en orden físico y devuelve cada posición con su ubicación y sus ganchos.
 * @param {{ gondolas, secciones, niveles, posiciones }} datos  filas planas de la versión
 * @returns {Array<{ posicion, gondola, seccionIndice, nivelIndice, ganchos: number[] }>}
 */
function recorrerVersion({ gondolas, secciones, niveles, posiciones }) {
  const posicionesPorNivel = new Map();
  posiciones.forEach((p) => {
    if (!posicionesPorNivel.has(p.nivelId)) posicionesPorNivel.set(p.nivelId, []);
    posicionesPorNivel.get(p.nivelId).push(p);
  });
  posicionesPorNivel.forEach((lista) => lista.sort((a, b) => a.ordenHorizontal - b.ordenHorizontal || a.id - b.id));

  const salida = [];
  let numero = 0;
  [...gondolas].sort((a, b) => a.orden - b.orden || a.id - b.id).forEach((g) => {
    const raiz = construirArbol(secciones.filter((s) => s.gondolaId === g.id));
    const hojas = raiz ? calcularHojas(raiz, g.anchoCm, g.altoCm).map((h) => h.nodo.id) : [null];
    const nivelesG = niveles.filter((n) => n.gondolaId === g.id);
    hojas.forEach((hojaId, hi) => {
      const propios = nivelesG
        .filter((n) => (raiz ? (n.seccionId ?? hojas[0]) === hojaId : true))
        .sort((a, b) => a.orden - b.orden || a.id - b.id);
      propios.forEach((n, ni) => {
        (posicionesPorNivel.get(n.id) ?? []).forEach((p) => {
          const ganchos = [];
          for (let f = 0; f < Math.max(1, p.facings); f++) ganchos.push(++numero);
          salida.push({ posicion: p, gondola: g, seccionIndice: raiz ? hi + 1 : null, nivelId: n.id, nivelIndice: ni + 1, ganchos });
        });
      });
    });
  });
  return salida;
}

/** Valor común a todas las ubicaciones, o null si varía (o si ninguna lo tiene). */
function valorComun(valores) {
  const distintos = [...new Set(valores.map((v) => (v === null || v === undefined ? null : Number(v))))];
  return { valor: distintos.length === 1 ? distintos[0] : null, varia: distintos.length > 1 };
}

/**
 * Agrega por SKU: ubicaciones, facings y capacidad sumados, mín./máx. final (si todas las
 * ubicaciones coinciden) y alertas no bloqueantes.
 */
function agregarPorSku(recorrido) {
  const porSku = new Map();
  recorrido.forEach((r) => {
    const p = r.posicion;
    if (!p.sku) return;
    if (!porSku.has(p.sku)) porSku.set(p.sku, { sku: p.sku, nombre: p.nombre, items: [] });
    porSku.get(p.sku).items.push(r);
  });

  return [...porSku.values()].map(({ sku, nombre, items }) => {
    const capacidades = items.map((r) => r.posicion.capacidadMaxima);
    const capacidadTotal = capacidades.some((c) => c === null || c === undefined) ? null : capacidades.reduce((s, c) => s + Number(c), 0);
    const min = valorComun(items.map((r) => r.posicion.minFinal));
    const max = valorComun(items.map((r) => r.posicion.maxFinal));
    const alertas = [];
    if (min.varia || max.varia) alertas.push({ codigo: 'MINMAX_VARIA', mensaje: 'Las ubicaciones tienen mín./máx. distintos' });
    if (min.valor !== null && max.valor !== null && min.valor > max.valor) alertas.push({ codigo: 'MIN_MAYOR_MAX', mensaje: `Mín. final (${min.valor}) mayor que máx. final (${max.valor})` });
    if (max.valor !== null && capacidadTotal !== null && max.valor > capacidadTotal) alertas.push({ codigo: 'MAX_SUPERA_CAPACIDAD', mensaje: `Máx. final (${max.valor}) supera la capacidad total (${capacidadTotal})` });

    return {
      sku,
      nombre,
      ubicaciones: items.map((r) => ({
        posicionId:    r.posicion.id,
        gondolaId:     r.gondola.id,
        gondola:       r.gondola.nombre,
        seccion:       r.seccionIndice,
        nivelId:       r.nivelId,
        nivel:         r.nivelIndice,
        facings:       r.posicion.facings,
        ganchos:       r.ganchos,
      })),
      facings:        items.reduce((s, r) => s + r.posicion.facings, 0),
      capacidadTotal,
      minFinal:       min.valor,
      maxFinal:       max.valor,
      minVaria:       min.varia,
      maxVaria:       max.varia,
      ganchos:        items.flatMap((r) => r.ganchos),
      alertas,
    };
  });
}

/** Valida los valores de mín./máx. que se aplicarán a todas las ubicaciones de un SKU. */
function validarMinMax(minFinal, maxFinal) {
  if (minFinal !== null && minFinal !== undefined && maxFinal !== null && maxFinal !== undefined && Number(minFinal) > Number(maxFinal)) {
    throw errorUnprocessable('min_final no puede ser mayor que max_final', { min_final: minFinal, max_final: maxFinal });
  }
}

module.exports = {
  recorrerVersion,
  agregarPorSku,
  validarMinMax,
};
