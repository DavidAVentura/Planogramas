/**
 * seccion.repository.js  (dominio)
 * Contrato del repositorio — define los métodos que cualquier implementación
 * concreta debe proveer. No contiene lógica; es documentación ejecutable.
 *
 * La implementación concreta vive en:
 *   src/infrastructure/repositories/seccion.repository.js
 */

module.exports = {
  /**
   * Filas planas del árbol de secciones de la góndola (vacío = góndola sin dividir).
   * @param {number} gondolaId
   * @returns {Promise<Array<{id, gondolaId, padreId, esDivision, direccion, orden, tamCm}>>}
   */
  listarPorGondola: async (_gondolaId) => { throw new Error('No implementado'); },

  /**
   * Busca una sección por id.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  buscarPorId: async (_id) => { throw new Error('No implementado'); },

  /**
   * Niveles de la góndola con su sección y su conteo de posiciones.
   * @param {number} gondolaId
   * @returns {Promise<Array<{id, seccionId, orden, alturaDesdePisoCm, tipoAccesorio, codigoAccesorioId, tamanoAccesorioPulgadas, anchoDisponibleCm, totalPosiciones}>>}
   */
  listarNivelesDeGondola: async (_gondolaId) => { throw new Error('No implementado'); },

  /**
   * Persiste de forma atómica la estructura completa de la góndola: crea, actualiza y borra
   * nodos (ids negativos = nodos nuevos) y aplica los cambios de niveles derivados.
   * @param {number} gondolaId
   * @param {{ nodos: object[], niveles: { actualizar: object[], crear: object[], eliminar: number[] } }} cambios
   * @returns {Promise<void>}
   */
  guardarEstructura: async (_gondolaId, _cambios) => { throw new Error('No implementado'); },
};
