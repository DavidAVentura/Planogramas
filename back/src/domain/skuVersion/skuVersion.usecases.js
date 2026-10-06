/**
 * skuVersion.usecases.js
 * Casos de uso de "SKU en la versión". Reciben los repositorios por inyección de dependencia.
 *
 * Mín./máx. final siguen guardándose en cada Posicion (así los leen la publicación, el drawer y
 * la vista del Implementador, sin cambios). Editarlos "por SKU" los aplica a todas las
 * posiciones de ese SKU en la versión.
 */

const { validarVersionEditable } = require('../nivel/nivel.entity');
const { recorrerVersion, agregarPorSku, validarMinMax } = require('./skuVersion.entity');

function errorNotFound(mensaje) {
  const err = new Error(mensaje);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

async function buscarVersionOFallar(versionRepo, versionId) {
  const version = await versionRepo.buscarPorId(versionId);
  if (!version) throw errorNotFound(`Versión ${versionId} no encontrada`);
  return version;
}

/**
 * SKU de la versión con sus totales y la numeración de ganchos calculada.
 * @returns {Promise<{ versionId, totalGanchos, ganchosPorPosicion, skus }>}
 */
async function obtenerSkus(skuRepo, versionRepo, versionId) {
  await buscarVersionOFallar(versionRepo, versionId);
  const recorrido = recorrerVersion(await skuRepo.cargarVersion(versionId));
  const ganchosPorPosicion = {};
  recorrido.forEach((r) => { ganchosPorPosicion[r.posicion.id] = r.ganchos; });
  return {
    versionId,
    totalGanchos: recorrido.reduce((s, r) => s + r.ganchos.length, 0),
    ganchosPorPosicion,
    skus: agregarPorSku(recorrido),
  };
}

/**
 * Aplica mín./máx. final a todas las posiciones del SKU en la versión.
 * @param {{ min_final?: number|null, max_final?: number|null }} cambios
 */
async function editarSku(skuRepo, versionRepo, versionId, sku, cambios) {
  const version = await buscarVersionOFallar(versionRepo, versionId);
  validarVersionEditable(version.estado);

  const actual = (await obtenerSkus(skuRepo, versionRepo, versionId)).skus.find((s) => s.sku === sku);
  if (!actual) throw errorNotFound(`El SKU ${sku} no está en la versión ${versionId}`);

  const minFinal = cambios.min_final !== undefined ? cambios.min_final : actual.minFinal;
  const maxFinal = cambios.max_final !== undefined ? cambios.max_final : actual.maxFinal;
  validarMinMax(minFinal, maxFinal);

  await skuRepo.actualizarMinMax(versionId, sku, cambios);
  return (await obtenerSkus(skuRepo, versionRepo, versionId)).skus.find((s) => s.sku === sku);
}

module.exports = {
  obtenerSkus,
  editarSku,
};
