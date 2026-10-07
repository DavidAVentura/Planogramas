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

  /**
   * Busca un accesorio por código ya normalizado (ver `normalizarCodigo` en accesorio.entity.js).
   * @param {string} codigoNormalizado
   * @returns {Promise<object|null>}
   */
  buscarPorCodigo: async (_codigoNormalizado) => { throw new Error('No implementado'); },

  /**
   * Inserta un accesorio y devuelve su id.
   * @param {{ codigo, nombre, tipo, alto_cm?, ancho_cm?, profundidad_cm?, notas_capacidad? }} datos
   * @returns {Promise<number>}
   */
  crear: async (_datos) => { throw new Error('No implementado'); },

  /**
   * Partial update de los campos editables.
   * @param {number} id
   * @param {object} cambios
   * @returns {Promise<void>}
   */
  actualizar: async (_id, _cambios) => { throw new Error('No implementado'); },

  /**
   * Cuántos niveles (codigo_accesorio_id) y posiciones (PosicionAccesorio) usan el accesorio.
   * @param {number} id
   * @returns {Promise<{ niveles: number, posiciones: number }>}
   */
  contarUsos: async (_id) => { throw new Error('No implementado'); },

  /**
   * Elimina el accesorio (el caso de uso ya validó que no está en uso).
   * @param {number} id
   * @returns {Promise<void>}
   */
  eliminar: async (_id) => { throw new Error('No implementado'); },
};
