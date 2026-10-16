/**
 * consolidado.repository.js  (dominio)
 * Contrato del repositorio del Consolidado Tiendas — documentación ejecutable, sin lógica.
 * La implementación concreta vive en src/infrastructure/repositories/consolidado.repository.js.
 * El repositorio solo devuelve versiones publicadas/piloto y tiendas activas; el caso de uso lo
 * vuelve a verificar como defensa.
 */

module.exports = {
  /**
   * Carga en bloque la base de las versiones montables asignadas a tiendas activas (7 consultas).
   * @param {{ tiendaIds?: number[] }} filtro  restringe las asignaciones a esas tiendas (≤ 200)
   * @returns {Promise<{
   *   versiones:    Array<{ versionId, codigo, estado, planogramaId, planogramaNombre }>,
   *   asignaciones: Array<{ versionId, tiendaId }>,
   *   tiendas:      Array<{ id, codigo, nombre, tipo, marca }>,
   *   gondolas:     Array<{ id, versionId, nombre, orden, anchoCm, altoCm, porUbicar }>,
   *   secciones:    Array<{ id, gondolaId, padreId, esDivision, direccion, orden, tamCm }>,
   *   niveles:      Array<{ id, gondolaId, seccionId, orden }>,
   *   posiciones:   Array<{ id, nivelId, ordenHorizontal, sku, nombre, facings, capacidadMaxima, minFinal,
   *                         maxFinal, ganchos, modo, cantidadApilable, capacidadFacing, minEstetico, perfil,
   *                         decision, observaciones, crossExterno, montarEnDisplay, desbordaGondola, notaDesborde }>,
   *   accesorios:   Array<{ posicionId, orden, codigo, tamanoPulgadas }>,
   *   productos:    Array<{ sku, nombre, marca, skuSustituto, nombreSustituto }>,
   * }>}
   */
  cargarBase: async (_filtro) => { throw new Error('No implementado'); },

  /**
   * Opciones de los modales de filtro: tiendas activas con alguna versión montable (+ `totalSkus`)
   * y versiones montables con alguna tienda activa (+ `totalProductos`).
   * @returns {Promise<{ tiendas: object[], versiones: object[] }>}
   */
  filtrosDisponibles: async () => { throw new Error('No implementado'); },
};
