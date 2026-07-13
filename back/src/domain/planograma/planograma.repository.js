/**
 * planograma.repository.js  (dominio)
 * Contrato del repositorio — define los métodos que cualquier implementación
 * concreta debe proveer. No contiene lógica; es documentación ejecutable.
 *
 * Las implementaciones concretas viven en:
 *   src/infrastructure/repositories/planograma.repository.js
 */

module.exports = {
  /**
   * Lista planogramas con filtros y paginación.
   * @param {{ departamento?, estado?, search?, page, pageSize }} filtros
   * @returns {Promise<{ data: object[], total: number }>}
   */
  listar: async (_filtros) => { throw new Error('No implementado'); },

  /**
   * Crea un planograma y sus subcategorías en una transacción.
   * @param {{ nombre, departamento, estado, created_by }} planograma
   * @param {string[]} subcategorias
   * @returns {Promise<number>} id del planograma creado
   */
  crear: async (_planograma, _subcategorias) => { throw new Error('No implementado'); },

  /**
   * Retorna metadatos + subcategorias[] + resumen de versiones de un planograma.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  buscarPorId: async (_id) => { throw new Error('No implementado'); },

  /**
   * Aplica un partial update de metadatos. Solo actualiza los campos presentes en `cambios`.
   * @param {number} id
   * @param {{ nombre?, departamento? }} cambios  — subcategorías se manejan aparte
   * @param {string[]|undefined} subcategorias    — si está presente, reemplaza las existentes
   * @returns {Promise<void>}
   */
  actualizar: async (_id, _cambios, _subcategorias) => { throw new Error('No implementado'); },

  /**
   * Marca el planograma como archivado.
   * @param {number} id
   * @returns {Promise<void>}
   */
  archivar: async (_id) => { throw new Error('No implementado'); },

  /**
   * Verifica si ya existe un planograma con el mismo nombre en el departamento dado.
   * @param {string} nombre
   * @param {string} departamento
   * @param {number|undefined} excluirId  — excluye este id (útil en edición)
   * @returns {Promise<boolean>}
   */
  existeNombreEnDepartamento: async (_nombre, _departamento, _excluirId) => { throw new Error('No implementado'); },

  /**
   * Verifica si el planograma tiene versiones publicadas asignadas a tiendas.
   * @param {number} planogramaId
   * @returns {Promise<boolean>}
   */
  tieneVersionesPublicadas: async (_planogramaId) => { throw new Error('No implementado'); },
};
