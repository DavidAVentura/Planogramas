/**
 * tienda.repository.js  (dominio)
 * Contrato del repositorio — define los métodos que cualquier implementación
 * concreta debe proveer. No contiene lógica; es documentación ejecutable.
 *
 * Las implementaciones concretas viven en:
 *   src/infrastructure/repositories/tienda.repository.js
 */

module.exports = {
  /**
   * Lista tiendas con filtros, ordenadas por nombre ASC. Sin paginación.
   * @param {{ tipo?: string, estado: string }} filtros
   * @returns {Promise<object[]>}
   */
  listar: async (_filtros) => { throw new Error('No implementado'); },

  /**
   * Lista tiendas de un tipo/estado dados que NO tienen todavía una versión
   * especial derivada de `versionBaseId` dentro de `planogramaId`.
   * @param {{ planogramaId: number, versionBaseId: number, tipo?: string, estado: string }} filtros
   * @returns {Promise<object[]>}
   */
  listarDisponiblesParaVersionEspecial: async (_filtros) => { throw new Error('No implementado'); },

  /**
   * Retorna los datos básicos de una tienda (id, codigo, nombre).
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  buscarPorId: async (_id) => { throw new Error('No implementado'); },

  /**
   * Retorna los planogramas en versión publicada asignados a una tienda,
   * con filtro opcional por departamento.
   * @param {number} tiendaId
   * @param {{ departamento?: string }} filtros
   * @returns {Promise<object[]>}
   */
  listarPlanogramasPublicados: async (_tiendaId, _filtros) => { throw new Error('No implementado'); },
};
