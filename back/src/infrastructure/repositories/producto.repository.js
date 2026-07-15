/**
 * producto.repository.js  (infraestructura)
 * Acceso de solo lectura a la tabla local `Producto` — usada por el módulo catalog para
 * enriquecer el detalle de CATI con el `sku_sustituto` sugerido (fuente de verdad local,
 * ver regla 3 de Arquitectura/Contratos/08_catalogo/GET_productos_detalle.md).
 */

const db = require('../db/connection');

const TABLA_PRODUCTO = 'Producto';

// ─── buscarSkuSustituto ──────────────────────────────────────────────────────

async function buscarSkuSustituto(sku) {
  const row = await db(TABLA_PRODUCTO).where('sku', sku).select('sku_sustituto').first();
  return row?.sku_sustituto ?? null;
}

module.exports = { buscarSkuSustituto };
