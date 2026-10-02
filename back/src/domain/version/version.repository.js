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
   * Ficha de solo lectura de la versión: datos de la versión (con su base y la publicada que
   * reemplazará si es piloto), su planograma con subcategorías, conteos de estructura
   * (góndolas, niveles, posiciones por modo, productos distintos, metros lineales) y tiendas.
   * @param {number} id
   * @returns {Promise<{ version, planograma, estructura, tiendas }>}
   */
  obtenerResumen: async (_id) => { throw new Error('No implementado'); },

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
   * Busca una versión de línea base (version_base_id IS NULL) del mismo tipo en el
   * planograma que esté en el estado indicado. Las versiones especiales por tienda
   * quedan fuera de esta búsqueda — no compiten por la unicidad de estado.
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
   * Reemplaza el listado completo de tiendas asignadas a la versión (transaccional).
   * Ignora silenciosamente ids que no existan. Si la versión está publicada o en piloto, cada
   * tienda agregada desmonta la versión que tenía del planograma, y todo cambio se audita.
   * @param {number} id
   * @param {number[]} tiendaIds
   * @param {{ numero, nombre }} usuario
   * @returns {Promise<{ tiendas: object[], ignorados: number[] }>}
   */
  reemplazarTiendas: async (_id, _tiendaIds, _usuario) => { throw new Error('No implementado'); },

  /**
   * Promueve la versión a `piloto` reemplazando sus tiendas asignadas. Si la versión
   * es de línea base (version_base_id IS NULL), archiva la versión en `piloto`
   * anterior del mismo planograma+tipo (si existe); las versiones especiales por
   * tienda no archivan ninguna anterior. Las tiendas piloto desmontan la versión que tenían;
   * las de la piloto archivada que no siguen vuelven a la publicada del mismo tipo. Auditado.
   * Transaccional.
   * @param {number} id
   * @param {number[]} tiendaIds
   * @param {{ numero, nombre }} usuario
   * @param {string|null} [motivo]  motivo de la edición auditada (si falta, uno por defecto)
   * @returns {Promise<{ tiendas: object[], versionAnteriorArchivada: object|null }>}
   */
  promoverAPiloto: async (_id, _tiendaIds, _usuario, _motivo) => { throw new Error('No implementado'); },

  /**
   * Promueve la versión a `publicado`. Si la versión es de línea base
   * (version_base_id IS NULL), archiva la versión publicada anterior del mismo
   * planograma+tipo (si existe); las versiones especiales por tienda no archivan
   * ninguna anterior. Las tiendas en piloto quedan con esta versión publicada y las de la
   * publicada anterior pasan a esta. Auditado. Transaccional.
   * @param {number} id
   * @param {{ numero, nombre }} usuario
   * @param {string|null} [motivo]  motivo de la edición auditada (si falta, uno por defecto)
   * @returns {Promise<{ versionAnteriorArchivada: object|null }>}
   */
  promoverAPublicado: async (_id, _usuario, _motivo) => { throw new Error('No implementado'); },

  /**
   * Calcula, sin escribir nada, qué pasaría al publicar la versión: la publicada anterior que
   * se archivaría, las tiendas del piloto que la quedan publicada y las de la anterior que
   * migran a esta (sin repetir tiendas). Misma regla que promoverAPublicado.
   * @param {number} id
   * @returns {Promise<{ versionAnterior: object|null, tiendasPiloto: object[], tiendasMigran: object[], totalTiendas: number }>}
   */
  simularPublicacion: async (_id) => { throw new Error('No implementado'); },

  /**
   * Marca la versión como `en_desarrollo`. Si la versión es de línea base
   * (version_base_id IS NULL), archiva la versión en `en_desarrollo` anterior del
   * mismo planograma+tipo (si existe); las versiones especiales por tienda no
   * archivan ninguna anterior. Transaccional.
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
