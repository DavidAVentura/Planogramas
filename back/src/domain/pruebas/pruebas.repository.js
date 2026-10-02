/**
 * pruebas.repository.js  (dominio)
 * Contrato del repositorio de soporte de pruebas Postman. No contiene lógica; es documentación
 * ejecutable.
 *
 * La implementación concreta vive en:
 *   src/infrastructure/repositories/pruebas.repository.js
 */

module.exports = {
  /**
   * Siembra en una transacción los estados que la API no puede crear (productos y accesorio
   * fixture, versión con errores bloqueantes, evidencia de otro usuario, etc.).
   * @param {{ sufijo: string, usuario: string }} datos
   * @returns {Promise<object>} ids y valores que la colección guarda como variables
   */
  sembrarFixtures: async (_datos) => { throw new Error('No implementado'); },

  /**
   * Blobs (adjuntos y evidencias) que cuelgan de los planogramas o tiendas indicados.
   * @param {{ planogramaIds: number[], tiendaIds: number[] }} filtro
   * @returns {Promise<Array<{ container: string, blobPath: string }>>}
   */
  listarBlobs: async (_filtro) => { throw new Error('No implementado'); },

  /**
   * Borra en una transacción los planogramas y tiendas indicados con todo lo que cuelga de ellos,
   * y los productos/accesorios indicados que ya no estén referenciados.
   * @param {{ planogramaIds: number[], tiendaIds: number[], skus: string[], accesorioIds: number[] }} datos
   * @returns {Promise<{ planogramas: number, tiendas: number, productos: number, accesorios: number }>}
   */
  eliminarDatos: async (_datos) => { throw new Error('No implementado'); },
};
