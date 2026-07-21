/**
 * producto.usecases.js
 * Casos de uso del dominio Producto (tabla local).
 * Reciben el repositorio por inyección de dependencia — sin imports de infraestructura.
 */

const { errorNotFound, validarDimensionesCompletas } = require('./producto.entity');

async function buscarProductoOFallar(productoRepo, sku) {
  const producto = await productoRepo.buscarPorSku(sku);
  if (!producto) throw errorNotFound(`Producto ${sku} no encontrado`);
  return producto;
}

/**
 * Actualiza las dimensiones físicas de un producto local (CU-04-12). El repositorio de
 * infraestructura es responsable de fijar fuente_dimensiones='MANUAL' y
 * dimensiones_validadas=true — el analista que ingresa una medida a mano la da por válida.
 */
async function actualizarDimensiones(productoRepo, sku, dimensiones) {
  await buscarProductoOFallar(productoRepo, sku);
  return productoRepo.actualizarDimensiones(sku, dimensiones);
}

/**
 * Confirma que las dimensiones físicas ya guardadas de un producto son correctas, sin
 * modificarlas (CU-04-13). Requiere que las tres medidas actuales sean mayores a 0.
 */
async function validarDimensiones(productoRepo, sku) {
  const producto = await buscarProductoOFallar(productoRepo, sku);
  validarDimensionesCompletas(producto);
  return productoRepo.marcarDimensionesValidadas(sku);
}

module.exports = {
  actualizarDimensiones,
  validarDimensiones,
};
