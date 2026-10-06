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
   * temporales negativos, padres primero), niveles y posiciones. Si algo falla no queda nada.
   * @param {number} versionId
   * @param {object[]} planes - salida de `planificarCuerpo` (importacion.entity.js)
   * @returns {Promise<Array<{ id, nombre, destino, totalSecciones, totalNiveles, totalPosiciones }>>}
   */
  importarCuerpos: async (_versionId, _planes) => { throw new Error('No implementado'); },
};
