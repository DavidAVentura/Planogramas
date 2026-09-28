/**
 * producto.usecases.js
 * Casos de uso del dominio Producto (tabla local).
 * Reciben el repositorio por inyección de dependencia — sin imports de infraestructura.
 */

const { errorNotFound, validarDimensionesCompletas, nivelJerarquiaMasEspecifico } = require('./producto.entity');

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

/**
 * Lista los productos locales con sus apariciones en planogramas. Si se filtra por jerarquía,
 * el catálogo externo (CATI) resuelve qué SKUs pertenecen al nivel más específico elegido y se
 * cruzan con la tabla local — la jerarquía nunca se lee de columnas locales, que pueden estar
 * desactualizadas o no existir (familia/categoría).
 * @param {{ productoRepo: object, catalogo: { listarSkusPorJerarquia: Function } }} deps
 * @param {{ area?: string, departamento?: string, familia?: string, categoria?: string, subcategoria?: string }} filtros
 */
async function listarProductos({ productoRepo, catalogo }, filtros) {
  const jerarquia = nivelJerarquiaMasEspecifico(filtros);
  if (!jerarquia) return productoRepo.listarConApariciones();

  const [productos, skus] = await Promise.all([
    productoRepo.listarConApariciones(),
    catalogo.listarSkusPorJerarquia(jerarquia.nivel, jerarquia.id),
  ]);
  const skusDelNivel = new Set(skus);
  return productos.filter((p) => skusDelNivel.has(p.sku));
}

/** Posiciones del producto en planogramas vigentes (no archivados). */
async function obtenerPlanogramasDeProducto(productoRepo, sku) {
  await buscarProductoOFallar(productoRepo, sku);
  return productoRepo.listarApariciones(sku);
}

module.exports = {
  actualizarDimensiones,
  validarDimensiones,
  listarProductos,
  obtenerPlanogramasDeProducto,
};
