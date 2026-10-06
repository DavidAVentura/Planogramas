/**
 * importacion.repository.js  (dominio)
 * Contrato del repositorio — define los métodos que cualquier implementación
 * concreta debe proveer. No contiene lógica; es documentación ejecutable.
 *
 * La implementación concreta vive en:
 *   src/infrastructure/repositories/importacion.repository.js
 */

module.exports = {
  /**
   * Persiste, en UNA transacción, los planes de cada cuerpo: crea la góndola (destino NUEVA, al
   * final de la versión) o vacía y actualiza la existente (destino REEMPLAZAR: borra sus
   * secciones, niveles, posiciones y accesorios de posición), y luego inserta secciones (ids
   * temporales negativos, padres primero), niveles y posiciones (con sus ganchos y accesorios).
   * Después aplica `cruce` (productos de "Por ubicar" ya ubicados: eliminar / dejar ganchos
   * sobrantes) y elimina la góndola "Por ubicar" si quedó vacía. Si algo falla no queda nada.
   * @param {number} versionId
   * @param {object[]} planes - salida de `planificarCuerpo` (importacion.entity.js)
   * @returns {Promise<Array<{ id, nombre, destino, totalSecciones, totalNiveles, totalPosiciones }>>}
   */
  importarCuerpos: async (_versionId, _planes, _cruce) => { throw new Error('No implementado'); },

  /**
   * Posiciones de la góndola "Por ubicar" que tienen ganchos guardados, con sus datos de montaje y
   * accesorios — insumo de `cruzarConPorUbicar` (importacion.entity.js).
   * @param {number} versionId
   * @returns {Promise<object[]>}
   */
  posicionesPorUbicar: async (_versionId) => { throw new Error('No implementado'); },

  /**
   * SKUs que ya tienen al menos una posición en la versión.
   * @param {number} versionId
   * @returns {Promise<Set<string>>}
   */
  skusDeVersion: async (_versionId) => { throw new Error('No implementado'); },

  /**
   * En una transacción: busca (o crea) la góndola "Por ubicar" de la versión, completa sus niveles
   * de relleno hasta 10 posiciones cada uno, crea los niveles que falten, inserta las posiciones
   * (y su accesorio de montaje) y recalcula medidas de la góndola y alturas de sus niveles.
   * @param {number} versionId
   * @param {object[]} posiciones - salida de `posicionDesdeFila` (importacion.entity.js)
   * @returns {Promise<{ id: number, creada: boolean, totalNiveles: number }>}
   */
  importarPorUbicar: async (_versionId, _posiciones) => { throw new Error('No implementado'); },
};
