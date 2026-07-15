/**
 * accesorio.repository.js  (dominio)
 * Contrato del repositorio — define los métodos que cualquier implementación
 * concreta debe proveer. No contiene lógica; es documentación ejecutable.
 *
 * Las implementaciones concretas viven en:
 *   src/infrastructure/repositories/accesorio.repository.js
 */

module.exports = {
  /**
   * Lista los accesorios del catálogo, ordenados por tipo ASC, nombre ASC.
   * @param {{ tipo?: string }} filtros
   * @returns {Promise<object[]>}
   */
  listar: async (_filtros) => { throw new Error('No implementado'); },

  /**
   * Retorna el detalle de un accesorio (incluye notas_capacidad).
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  buscarPorId: async (_id) => { throw new Error('No implementado'); },
};
