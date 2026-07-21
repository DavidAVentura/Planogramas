/**
 * version.repository.js  (dominio)
 * Contrato del repositorio — define los métodos que cualquier implementación
 * concreta debe proveer. No contiene lógica; es documentación ejecutable.
 *
 * La implementación concreta vive en:
 *   src/infrastructure/repositories/version.repository.js
 */

module.exports = {
  /**
   * Lista las versiones de un planograma con tiendas asignadas y métricas de estructura.
   * @param {number} planogramaId
   * @param {{ incluirArchivadas: boolean }} filtros
   * @returns {Promise<object[]>}
   */
  listarPorPlanograma: async (_planogramaId, _filtros) => { throw new Error('No implementado'); },

  /**
   * Crea una versión vacía.
   * @param {{ planograma_id, tipo, codigo, estado, notas }} version
   * @returns {Promise<number>} id de la versión creada
   */
  crear: async (_version) => { throw new Error('No implementado'); },

  /**
   * Crea una versión especial por tienda clonando la estructura completa
   * (góndolas → niveles → posiciones → accesorios) de la versión base, y la
   * asigna a la tienda indicada. Transacción única.
   * @param {{ planograma_id, tipo, codigo, estado, notas, version_base_id }} version
   * @param {number} versionBaseId
   * @param {number} tiendaId
   * @returns {Promise<number>} id de la versión creada
   */
  crearConClon: async (_version, _versionBaseId, _tiendaId) => { throw new Error('No implementado'); },

  /**
   * Retorna los metadatos básicos de una versión (sin estructura anidada).
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  buscarPorId: async (_id) => { throw new Error('No implementado'); },

  /**
   * Retorna el detalle completo de una versión (todos los campos de edición) con
   * góndolas → niveles → posiciones anidadas. Para el editor del Analista.
   * @param {number} id
   * @param {{ vistaImplementador: boolean }} opciones
   * @returns {Promise<object>}
   */
  obtenerDetalleCompleto: async (_id, _opciones) => { throw new Error('No implementado'); },

  /**
   * Retorna la estructura reducida de una versión (solo campos de montaje, sin
   * capacidad/inventario) con góndolas → niveles → posiciones anidadas. Para la
   * vista de solo lectura del Implementador.
   * @param {number} id
   * @param {{ vistaImplementador: boolean }} opciones
   * @returns {Promise<object>}
   */
  obtenerEstructuraPublicada: async (_id, _opciones) => { throw new Error('No implementado'); },

  /**
   * Aplica un partial update de notas y/o código.
   * @param {number} id
   * @param {{ notas?, codigo? }} cambios
   * @returns {Promise<void>}
   */
  actualizarMetadatos: async (_id, _cambios) => { throw new Error('No implementado'); },

  /**
   * Actualiza el estado de la versión y su updated_at.
   * @param {number} id
   * @param {string} estado
   * @returns {Promise<void>}
   */
  actualizarEstado: async (_id, _estado) => { throw new Error('No implementado'); },

  /**
   * Busca una versión del mismo tipo en el planograma que esté en el estado indicado.
   * @param {number} planogramaId
   * @param {string} tipo
   * @param {string} estado
   * @param {number} [excluirId]
   * @returns {Promise<object|null>}
   */
  buscarVersionEnEstado: async (_planogramaId, _tipo, _estado, _excluirId) => { throw new Error('No implementado'); },

  /**
   * Verifica si el código ya existe en otra versión del mismo planograma.
   * @param {number} planogramaId
   * @param {string} codigo
   * @param {number} [excluirId]
   * @returns {Promise<boolean>}
   */
  existeCodigoEnPlanograma: async (_planogramaId, _codigo, _excluirId) => { throw new Error('No implementado'); },

  /**
   * Retorna el código de la tienda indicada (para armar el código de una versión especial).
   * @param {number} tiendaId
   * @returns {Promise<{ id, codigo, nombre }|null>}
   */
  buscarTiendaPorId: async (_tiendaId) => { throw new Error('No implementado'); },

  /**
   * Verifica si la tienda ya tiene una versión especial derivada de la versión base indicada.
   * @param {number} versionBaseId
   * @param {number} tiendaId
   * @returns {Promise<boolean>}
   */
  tiendaTieneVersionEspecialDeBase: async (_versionBaseId, _tiendaId) => { throw new Error('No implementado'); },

  /**
   * Retorna las tiendas asignadas y disponibles (mismo tipo, no asignadas) para la versión.
   * @param {number} id
   * @returns {Promise<{ asignadas: object[], disponibles: object[] }>}
   */
  listarTiendas: async (_id) => { throw new Error('No implementado'); },

  /**
   * Reemplaza el listado completo de tiendas asignadas a la versión (DELETE + INSERT transaccional).
   * Ignora silenciosamente ids que no existan o no sean del tipo de la versión.
   * @param {number} id
   * @param {number[]} tiendaIds
   * @returns {Promise<{ tiendas: object[], ignorados: number[] }>}
   */
  reemplazarTiendas: async (_id, _tiendaIds) => { throw new Error('No implementado'); },

  /**
   * Promueve la versión a `piloto` reemplazando sus tiendas asignadas, archivando la
   * versión en `piloto` anterior del mismo planograma+tipo (si existe). Transaccional.
   * @param {number} id
   * @param {number[]} tiendaIds
   * @returns {Promise<{ tiendas: object[], versionAnteriorArchivada: object|null }>}
   */
  promoverAPiloto: async (_id, _tiendaIds) => { throw new Error('No implementado'); },

  /**
   * Promueve la versión a `publicado`, archivando la versión publicada anterior
   * del mismo planograma+tipo (si existe). Transaccional.
   * @param {number} id
   * @returns {Promise<{ versionAnteriorArchivada: object|null }>}
   */
  promoverAPublicado: async (_id) => { throw new Error('No implementado'); },

  /**
   * Marca la versión como `en_desarrollo`, archivando la versión en `en_desarrollo`
   * anterior del mismo planograma+tipo (si existe). Transaccional.
   * @param {number} id
   * @returns {Promise<{ versionAnteriorArchivada: object|null }>}
   */
  guardarComoEnDesarrollo: async (_id) => { throw new Error('No implementado'); },

  /**
   * Retorna las posiciones con errores bloqueantes (min_final > max_final) de la versión.
   * @param {number} id
   * @returns {Promise<object[]>}
   */
  buscarErroresBloqueantes: async (_id) => { throw new Error('No implementado'); },
};
