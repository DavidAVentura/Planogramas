/**
 * nivel.repository.js  (dominio)
 * Contrato del repositorio — define los métodos que cualquier implementación
 * concreta debe proveer. No contiene lógica; es documentación ejecutable.
 *
 * La implementación concreta vive en:
 *   src/infrastructure/repositories/nivel.repository.js
 */

module.exports = {
  /**
   * Lista los niveles de una góndola ordenados de abajo hacia arriba (`orden` ascendente).
   * @param {number} gondolaId
   * @returns {Promise<object[]>}
   */
  listarPorGondola: async (_gondolaId) => { throw new Error('No implementado'); },

  /**
   * Retorna el detalle completo de un nivel.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  buscarPorId: async (_id) => { throw new Error('No implementado'); },

  /**
   * Retorna el nombre de la góndola dueña, el orden y el conteo de posiciones del nivel.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  obtenerResumen: async (_id) => { throw new Error('No implementado'); },

  /**
   * Verifica si un accesorio con ese id existe en la tabla Accesorio.
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  accesorioExiste: async (_id) => { throw new Error('No implementado'); },

  /**
   * Cuenta las posiciones asignadas al nivel.
   * @param {number} id
   * @returns {Promise<number>}
   */
  contarPosiciones: async (_id) => { throw new Error('No implementado'); },

  /**
   * Suma el ancho asignado de las posiciones del nivel.
   * @param {number} id
   * @returns {Promise<number>}
   */
  anchoOcupadoCm: async (_id) => { throw new Error('No implementado'); },

  /**
   * Crea un nivel nuevo en la posición de `orden` indicada, desplazando (+1) los niveles
   * existentes de la misma góndola con `orden` mayor o igual.
   * @param {{ gondola_id, orden, altura_desde_piso_cm, tipo_accesorio, codigo_accesorio_id, tamano_accesorio_pulgadas, ancho_disponible_cm, notas }} nivel
   * @returns {Promise<number>} id del nivel creado
   */
  crearConOrden: async (_nivel) => { throw new Error('No implementado'); },

  /**
   * Aplica un partial update.
   * @param {number} id
   * @param {{ altura_desde_piso_cm?, tipo_accesorio?, codigo_accesorio_id?, tamano_accesorio_pulgadas?, ancho_disponible_cm?, notas? }} cambios
   * @returns {Promise<void>}
   */
  actualizar: async (_id, _cambios) => { throw new Error('No implementado'); },

  /**
   * Cuenta cuántos de los ids dados pertenecen efectivamente a la góndola indicada.
   * @param {number} gondolaId
   * @param {number[]} ids
   * @returns {Promise<number>}
   */
  contarPertenecientesAGondola: async (_gondolaId, _ids) => { throw new Error('No implementado'); },

  /**
   * Reordena los niveles en una única transacción.
   * @param {Array<{id: number, orden: number}>} orden
   * @returns {Promise<void>}
   */
  reordenar: async (_orden) => { throw new Error('No implementado'); },

  /**
   * Elimina un nivel y, en cascada, sus posiciones/accesorios de posición.
   * @param {number} id
   * @returns {Promise<void>}
   */
  eliminar: async (_id) => { throw new Error('No implementado'); },
};
