/**
 * implementacion.repository.js  (dominio)
 * Contrato del repositorio — define los métodos que cualquier implementación
 * concreta debe proveer. No contiene lógica; es documentación ejecutable.
 *
 * La implementación concreta vive en:
 *   src/infrastructure/repositories/implementacion.repository.js
 *
 * El inventario NO sale de este repositorio sino del puerto de inventario, inyectado aparte en
 * los casos de uso:
 *   obtenerInventarioTienda(codigoTienda: string, skus: string[])
 *     → Promise<{ inventario: Map<sku, unidades>, actualizadoEn: Date|null, desactualizado: boolean }>
 *   (`desactualizado` = se sirvió el último dato en caché porque CATI falló; lanza si no hay dato)
 * (implementación concreta: src/infrastructure/cati/inventarioTienda.js).
 */

module.exports = {
  /**
   * Retorna la tienda (id, codigo, nombre, tipo, estado) o null si no existe.
   * @param {number} tiendaId
   * @returns {Promise<object|null>}
   */
  buscarTienda: async (_tiendaId) => { throw new Error('No implementado'); },

  /**
   * Versiones asignadas a la tienda (VersionTienda) en estado publicado o piloto, ordenadas por
   * Planograma.departamento y PlanogramaVersion.codigo. Cada una con versionId, codigo, tipo,
   * estado, esEspecial, planogramaId, nombre, departamento.
   * @param {number} tiendaId
   * @returns {Promise<object[]>}
   */
  listarVersionesAsignadas: async (_tiendaId) => { throw new Error('No implementado'); },

  /**
   * SKUs distintos por versión, de posiciones con sku no nulo y decision = 'ACTIVO'.
   * @param {number[]} versionIds
   * @returns {Promise<Array<{ versionId: number, sku: string }>>}
   */
  listarSkusActivosPorVersion: async (_versionIds) => { throw new Error('No implementado'); },

  /**
   * Conteo de Adjunto por versión.
   * @param {number[]} versionIds
   * @returns {Promise<Map<number, number>>} versionId → cantidad
   */
  contarAdjuntosPorVersion: async (_versionIds) => { throw new Error('No implementado'); },

  /**
   * Góndolas de las versiones (ordenadas por orden), cada una con el conteo de
   * EvidenciaImplementacion de esa góndola en la tienda.
   * @param {number} tiendaId
   * @param {number[]} versionIds
   * @returns {Promise<Array<{ id, versionId, nombre, orden, evidencias: number }>>}
   */
  listarGondolasConEvidencias: async (_tiendaId, _versionIds) => { throw new Error('No implementado'); },

  /**
   * Posiciones con sku no nulo (ACTIVO e INACTIVO) de las versiones, con los datos de montaje,
   * de la góndola/nivel/versión y del Producto local (nombre, marca, sku_sustituto,
   * sustituto_nombre). Orden: codigo de versión, Gondola.orden, Nivel.orden, orden_horizontal.
   * @param {number[]} versionIds
   * @returns {Promise<object[]>}
   */
  listarPosicionesConProducto: async (_versionIds) => { throw new Error('No implementado'); },
};
