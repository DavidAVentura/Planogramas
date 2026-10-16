/**
 * mapeadoresVersion.js  (infraestructura)
 * Mapeo de filas de la BD a las formas planas que consume `recorrerVersion` (dominio de skuVersion).
 * Compartido por `skuVersion.repository` y `consolidado.repository` para no duplicar el mapeo.
 */

const { parsearGanchosJson } = require('../../domain/compartido/gancho');

function mapearGondola(g) {
  return {
    id: g.id, nombre: g.nombre, orden: g.orden,
    anchoCm: Number(g.ancho_cm), altoCm: Number(g.alto_cm), porUbicar: Boolean(g.por_ubicar),
  };
}

function mapearSeccion(s) {
  return {
    id: s.id, gondolaId: s.gondola_id, padreId: s.padre_id, esDivision: Boolean(s.es_division),
    direccion: s.direccion, orden: s.orden, tamCm: Number(s.tam_cm),
  };
}

function mapearNivel(n) {
  return { id: n.id, gondolaId: n.gondola_id, seccionId: n.seccion_id, orden: n.orden };
}

function mapearPosicionBase(p) {
  return {
    id:              p.id,
    nivelId:         p.nivel_id,
    ordenHorizontal: p.orden_horizontal,
    sku:             p.sku,
    nombre:          p.nombre ?? null,
    facings:         p.facings_horizontal,
    capacidadMaxima: p.capacidad_maxima,
    minFinal:        p.min_final,
    maxFinal:        p.max_final,
    ganchos:         parsearGanchosJson(p.ganchos),
  };
}

module.exports = { mapearGondola, mapearSeccion, mapearNivel, mapearPosicionBase };
