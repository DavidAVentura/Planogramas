/**
 * asignacion.repository.js  (dominio)
 * Contrato del repositorio — define los métodos que cualquier implementación
 * concreta debe proveer. No contiene lógica; es documentación ejecutable.
 *
 * La implementación concreta vive en:
 *   src/infrastructure/repositories/asignacion.repository.js
 */

module.exports = {
  /**
   * Matriz de Estructura: tiendas activas, planogramas no archivados con al menos una versión
   * publicada o en piloto (con todas sus versiones no archivadas) y las asignaciones montadas.
   * @returns {Promise<{ tiendas: object[], planogramas: object[], asignaciones: object[] }>}
   */
  async obtenerMatriz() { throw new Error('No implementado'); },

  /**
   * @param {number[]} ids
   * @returns {Promise<{ id, codigo, nombre, estado }[]>}
   */
  async buscarTiendas(ids) { throw new Error('No implementado'); },

  /**
   * @param {number[]} ids
   * @returns {Promise<{ id, nombre, estado }[]>}
   */
  async buscarPlanogramas(ids) { throw new Error('No implementado'); },

  /**
   * Versiones con la tienda dueña si son especiales (`tiendaEspecialId`, null en la línea base).
   * @param {number[]} ids
   * @returns {Promise<{ id, planogramaId, codigo, tipo, estado, versionBaseId, tiendaEspecialId }[]>}
   */
  async buscarVersiones(ids) { throw new Error('No implementado'); },

  /**
   * @param {number} versionBaseId
   * @param {number} tiendaId
   * @returns {Promise<boolean>}
   */
  async tiendaTieneEspecialDeBase(versionBaseId, tiendaId) { throw new Error('No implementado'); },

  /**
   * Versión montada (publicada o piloto) por cada celda pedida.
   * @param {{ planogramaId, tiendaId }[]} celdas
   * @returns {Promise<Record<string, { id, codigo, estado }>>} clave `${planogramaId}|${tiendaId}`
   */
  async asignacionesActuales(celdas) { throw new Error('No implementado'); },

  /**
   * Aplica en una transacción: crea la edición, monta/desmonta cada celda, clona las especiales
   * nuevas (publicadas) y escribe un registro de auditoría por operación.
   * @param {{ usuario: { numero, nombre }, motivo, origen }} edicion
   * @param {{ planogramaId, tiendaId, accion, anterior, nueva, especialNueva? }[]} operaciones
   * @returns {Promise<{ edicionId, fecha, especialesCreadas: object[] }>}
   */
  async aplicarEdicion(edicion, operaciones) { throw new Error('No implementado'); },

  /**
   * Movimientos de una celda, más reciente primero, con los datos de su edición.
   * @param {number} planogramaId
   * @param {number} tiendaId
   * @returns {Promise<object[]>}
   */
  async listarHistorial(planogramaId, tiendaId) { throw new Error('No implementado'); },
};
