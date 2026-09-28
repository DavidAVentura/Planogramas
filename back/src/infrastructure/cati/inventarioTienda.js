/**
 * inventarioTienda.js
 * Adaptador del puerto de inventario que usan los casos de uso de implementación
 * (domain/implementacion/implementacion.usecases.js):
 *   obtenerInventarioTienda(codigoTienda, skus)
 *     → { inventario: Map<sku, unidades en la tienda>, actualizadoEn: Date|null, desactualizado: boolean }
 *
 * Pide el stock de todos los SKUs a CATI bulkInventoryReport (con caché de 2 horas por SKU, ver
 * catiClient.obtenerStockSapBulk) y se queda con las filas cuyo `centroId` coincide con el código
 * de la tienda (sin distinguir mayúsculas ni espacios). Un SKU sin fila para la tienda no aparece
 * en el Map (el dominio lo cuenta como 0). Si CATI falla y no hay dato en caché, registra el
 * motivo y relanza: el caso de uso decide el modo degradado.
 */

const catiClient = require('./catiClient');
const { normalizarCodigoCentro } = require('../../domain/implementacion/implementacion.entity');

/**
 * @param {string} codigoTienda  Tienda.codigo (ej. T0PC)
 * @param {string[]} skus
 * @returns {Promise<{ inventario: Map<string, number>, actualizadoEn: Date|null, desactualizado: boolean }>}
 */
async function obtenerInventarioTienda(codigoTienda, skus) {
  let stock;
  try {
    stock = await catiClient.obtenerStockSapBulk(skus);
  } catch (err) {
    console.warn('[inventarioTienda] Inventario CATI no disponible, se responde en modo degradado:', err.message);
    throw err;
  }

  const centro     = normalizarCodigoCentro(codigoTienda);
  const inventario = new Map();

  stock.filas
    .filter((f) => f.sku && normalizarCodigoCentro(f.centroId) === centro)
    .forEach((f) => {
      inventario.set(f.sku, (inventario.get(f.sku) ?? 0) + (f.stock ?? 0));
    });

  return { inventario, actualizadoEn: stock.actualizadoEn, desactualizado: stock.desactualizado };
}

module.exports = { obtenerInventarioTienda };
