/**
 * producto.repository.js  (infraestructura)
 * Acceso a la tabla local `Producto` — la fuente de verdad LOCAL que valida el backend al
 * crear una Posicion (FK real a nivel de BD, ver Posicion.sku en la migración). Es distinta
 * del catálogo de solo-lectura que expone `GET /catalog/productos/*` (proxy en vivo a CATI,
 * ver catalogo.controller.js) — CATI puede conocer un SKU real que todavía no exista acá.
 *
 * Todavía no existe un pipeline automático que sincronice esta tabla desde Stibo/VTEX/CATI
 * (ver REUNION_TECNICA.md) — `asegurarExistencia` cubre ese hueco de forma incremental: nutre
 * la tabla local con un producto de CATI la primera vez que alguien intenta usar su SKU.
 */

const db = require('../db/connection');
const catiClient = require('../cati/catiClient');

const TABLA_PRODUCTO = 'Producto';

// ─── buscarSkuSustituto ──────────────────────────────────────────────────────

async function buscarSkuSustituto(sku) {
  const row = await db(TABLA_PRODUCTO).where('sku', sku).select('sku_sustituto').first();
  return row?.sku_sustituto ?? null;
}

// ─── existe ──────────────────────────────────────────────────────────────────

async function existe(sku) {
  const row = await db(TABLA_PRODUCTO).where('sku', sku).select('sku').first();
  return Boolean(row);
}

// ─── crearDesdeCati ──────────────────────────────────────────────────────────

async function crearDesdeCati(datosCati) {
  await db(TABLA_PRODUCTO).insert({
    sku:              datosCati.sku,
    nombre:           datosCati.nombre || datosCati.sku,
    marca:            datosCati.marca,
    categoria_nivel1: datosCati.categoria_nivel1,
    categoria_nivel2: datosCati.categoria_nivel2,
    subcategoria:     datosCati.subcategoria,
    ancho_cm:         datosCati.ancho_cm,
    alto_cm:          datosCati.alto_cm,
    profundidad_cm:   datosCati.profundidad_cm,
    precio:           datosCati.precio,
    imagen_url:       datosCati.imagen_url,
  });
}

// ─── asegurarExistencia ──────────────────────────────────────────────────────

/**
 * Garantiza que el SKU exista en la tabla local Producto antes de usarlo en una Posicion.
 * Si ya existe localmente, no hace nada. Si no, lo busca en CATI y, si CATI lo tiene, lo
 * inserta localmente con esos datos (nutriendo el catálogo local incrementalmente).
 * @param {string} sku
 * @returns {Promise<boolean>} true si el SKU existe localmente al terminar (ya existía o se
 *   acaba de crear), false si no existe ni localmente ni en CATI.
 */
async function asegurarExistencia(sku) {
  if (await existe(sku)) return true;

  const datosCati = await catiClient.obtenerProducto(sku);
  if (!datosCati) return false;

  await crearDesdeCati(datosCati);
  return true;
}

module.exports = { buscarSkuSustituto, existe, crearDesdeCati, asegurarExistencia };
