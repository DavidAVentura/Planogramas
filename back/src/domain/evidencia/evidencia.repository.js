/**
 * evidencia.repository.js  (dominio)
 * Contrato del repositorio — define los métodos que cualquier implementación
 * concreta debe proveer. No contiene lógica; es documentación ejecutable.
 *
 * La implementación concreta vive en:
 *   src/infrastructure/repositories/evidencia.repository.js
 *
 * La validación de tienda activa y versión asignada usa el repositorio de implementación
 * (domain/implementacion/implementacion.repository.js).
 */

module.exports = {
  /**
   * Góndolas de la versión (id, nombre, orden), ordenadas por orden.
   * @param {number} versionId
   * @returns {Promise<object[]>}
   */
  listarGondolasDeVersion: async (_versionId) => { throw new Error('No implementado'); },

  /**
   * Indica si la góndola pertenece a la versión.
   * @param {number} gondolaId
   * @param {number} versionId
   * @returns {Promise<boolean>}
   */
  gondolaPerteneceAVersion: async (_gondolaId, _versionId) => { throw new Error('No implementado'); },

  /**
   * Evidencias de la versión en la tienda, por created_at ascendente.
   * @param {number} tiendaId
   * @param {number} versionId
   * @returns {Promise<object[]>}
   */
  listarPorTiendaYVersion: async (_tiendaId, _versionId) => { throw new Error('No implementado'); },

  /**
   * Retorna una evidencia por id o null.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  buscarPorId: async (_id) => { throw new Error('No implementado'); },

  /**
   * Crea una evidencia.
   * @param {{ planograma_version_id, tienda_id, gondola_id, nombre_original, tipo_mime, tamano_bytes, blob_container, blob_path, blob_url, subido_por }} evidencia
   * @returns {Promise<number>} id creado
   */
  crear: async (_evidencia) => { throw new Error('No implementado'); },

  /**
   * Elimina una evidencia.
   * @param {number} id
   * @returns {Promise<void>}
   */
  eliminar: async (_id) => { throw new Error('No implementado'); },
};
