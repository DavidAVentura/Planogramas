/**
 * producto.repository.js  (dominio)
 * Contrato del repositorio — define los métodos que cualquier implementación
 * concreta debe proveer. No contiene lógica; es documentación ejecutable.
 *
 * La implementación concreta vive en:
 *   src/infrastructure/repositories/producto.repository.js
 */

module.exports = {
  /**
   * Retorna la fila completa de un producto local por SKU.
   * @param {string} sku
   * @returns {Promise<object|null>}
   */
  buscarPorSku: async (_sku) => { throw new Error('No implementado'); },

  /**
   * Actualiza las dimensiones físicas del producto. Fija fuente_dimensiones='MANUAL' y
   * dimensiones_validadas=true — el analista que corrige una medida a mano la da por válida.
   * @param {string} sku
   * @param {{ ancho_cm:number, alto_cm:number, profundidad_cm:number }} dimensiones
   * @returns {Promise<object>} producto actualizado
   */
  actualizarDimensiones: async (_sku, _dimensiones) => { throw new Error('No implementado'); },

  /**
   * Marca dimensiones_validadas=true sin modificar las medidas existentes.
   * @param {string} sku
   * @returns {Promise<object>} producto actualizado
   */
  marcarDimensionesValidadas: async (_sku) => { throw new Error('No implementado'); },

  /**
   * Lista todos los productos locales con el conteo de planogramas distintos en los que
   * aparecen (total y por modo PLANOGRAMA/CROSS/IMPULSO). Solo cuentan posiciones de versiones
   * y planogramas no archivados.
   * @returns {Promise<Array<object>>}
   */
  listarConApariciones: async () => { throw new Error('No implementado'); },

  /**
   * Lista cada posición del producto en versiones no archivadas, con su planograma, versión,
   * góndola, nivel y cantidad de tiendas asignadas a la versión.
   * @param {string} sku
   * @returns {Promise<Array<object>>}
   */
  listarApariciones: async (_sku) => { throw new Error('No implementado'); },
};
