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
   * Lista tiendas con filtros, ordenadas por nombre ASC. Sin paginación. Cada tienda incluye
   * `estado` y `versionesPublicadas` (cantidad de versiones de planograma en estado `publicado`
   * asignadas a la tienda).
   * @param {{ tipo?: string, estado: string|null }} filtros  `estado` null = sin filtro de estado
   * @returns {Promise<object[]>}
   */
  listar: async (_filtros) => { throw new Error('No implementado'); },

  /**
   * Lista tiendas de un tipo/estado dados que NO tienen todavía una versión
   * especial derivada de `versionBaseId` dentro de `planogramaId`.
   * @param {{ planogramaId: number, versionBaseId: number, tipo?: string, estado: string|null }} filtros
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
   * Retorna una tienda con todos sus datos (mismo formato que `listar`).
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  obtenerDetalle: async (_id) => { throw new Error('No implementado'); },

  /**
   * Indica si ya existe una tienda con ese código, ignorando la tienda `excluirId` (edición).
   * @param {string} codigo
   * @param {number} [excluirId]
   * @returns {Promise<boolean>}
   */
  existeCodigo: async (_codigo, _excluirId) => { throw new Error('No implementado'); },

  /**
   * Inserta una tienda y retorna su detalle.
   * @param {{ codigo, nombre, tipo, marca, region, estado }} tienda
   * @returns {Promise<object>}
   */
  crear: async (_tienda) => { throw new Error('No implementado'); },

  /**
   * Actualiza solo los campos enviados y retorna el detalle actualizado.
   * @param {number} id
   * @param {{ codigo?, nombre?, tipo?, marca?, region?, estado? }} cambios
   * @returns {Promise<object>}
   */
  editar: async (_id, _cambios) => { throw new Error('No implementado'); },

  /**
   * Retorna los planogramas en versión publicada asignados a una tienda,
   * con filtro opcional por departamento.
   * @param {number} tiendaId
   * @param {{ departamento?: string }} filtros
   * @returns {Promise<object[]>}
   */
  listarPlanogramasPublicados: async (_tiendaId, _filtros) => { throw new Error('No implementado'); },
};
