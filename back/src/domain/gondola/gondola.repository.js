/**
 * gondola.repository.js  (dominio)
 * Contrato del repositorio — define los métodos que cualquier implementación
 * concreta debe proveer. No contiene lógica; es documentación ejecutable.
 *
 * La implementación concreta vive en:
 *   src/infrastructure/repositories/gondola.repository.js
 */

module.exports = {
  /**
   * Lista las góndolas de una versión ordenadas por `orden`, con totalNiveles por góndola.
   * @param {number} versionId
   * @returns {Promise<object[]>}
   */
  listarPorVersion: async (_versionId) => { throw new Error('No implementado'); },

  /**
   * Retorna el detalle completo de una góndola.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  buscarPorId: async (_id) => { throw new Error('No implementado'); },

  /**
   * Retorna nombre y conteos de niveles/posiciones de una góndola.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  obtenerResumen: async (_id) => { throw new Error('No implementado'); },

  /**
   * Calcula el siguiente valor de `orden` para una góndola nueva en la versión.
   * @param {number} versionId
   * @returns {Promise<number>}
   */
  siguienteOrden: async (_versionId) => { throw new Error('No implementado'); },

  /**
   * Crea una góndola nueva.
   * @param {{ planograma_version_id, nombre, ancho_cm, alto_cm, profundidad_cm, posicion_en_tienda, orden }} gondola
   * @returns {Promise<number>} id de la góndola creada
   */
  crear: async (_gondola) => { throw new Error('No implementado'); },

  /**
   * Aplica un partial update. Si `ancho_cm` cambia, recalcula `ancho_disponible_cm`
   * en los niveles cuyo ancho coincidía con el ancho anterior de la góndola.
   * @param {number} id
   * @param {{ nombre?, ancho_cm?, alto_cm?, profundidad_cm?, posicion_en_tienda? }} cambios
   * @returns {Promise<{ nivelesActualizados: number }>}
   */
  actualizar: async (_id, _cambios) => { throw new Error('No implementado'); },

  /**
   * Cuenta cuántos de los ids dados pertenecen efectivamente a la versión indicada.
   * @param {number} versionId
   * @param {number[]} ids
   * @returns {Promise<number>}
   */
  contarPertenecientesAVersion: async (_versionId, _ids) => { throw new Error('No implementado'); },

  /**
   * Reordena las góndolas en una única transacción.
   * @param {Array<{id: number, orden: number}>} orden
   * @returns {Promise<void>}
   */
  reordenar: async (_orden) => { throw new Error('No implementado'); },

  /**
   * Elimina una góndola y, en cascada, sus niveles/posiciones/accesorios de posición.
   * @param {number} id
   * @returns {Promise<void>}
   */
  eliminar: async (_id) => { throw new Error('No implementado'); },
};
