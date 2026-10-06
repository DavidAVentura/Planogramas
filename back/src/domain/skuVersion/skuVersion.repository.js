/**
 * skuVersion.repository.js  (dominio)
 * Contrato del repositorio — define los métodos que cualquier implementación
 * concreta debe proveer. No contiene lógica; es documentación ejecutable.
 *
 * La implementación concreta vive en:
 *   src/infrastructure/repositories/skuVersion.repository.js
 */

module.exports = {
  /**
   * Filas planas de la versión necesarias para recorrerla en orden físico.
   * @param {number} versionId
   * @returns {Promise<{ gondolas: object[], secciones: object[], niveles: object[], posiciones: object[] }>}
   */
  cargarVersion: async (_versionId) => { throw new Error('No implementado'); },

  /**
   * Actualiza min_final y/o max_final de todas las posiciones del SKU en la versión.
   * @param {number} versionId
   * @param {string} sku
   * @param {{ min_final?: number|null, max_final?: number|null }} cambios
   * @returns {Promise<void>}
   */
  actualizarMinMax: async (_versionId, _sku, _cambios) => { throw new Error('No implementado'); },
};
