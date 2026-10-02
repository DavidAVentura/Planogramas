/**
 * pruebas.usecases.js
 * Soporte de la colección Postman: sembrar los fixtures que la API no puede crear y, al terminar
 * la corrida, borrar todo lo que la corrida creó. Reciben el repositorio y el almacenamiento de
 * blobs por inyección — sin imports de infraestructura.
 */

/**
 * @param {object} repo
 * @param {string} usuario
 * @returns {Promise<object>}
 */
async function sembrarFixtures(repo, usuario) {
  const sufijo = Date.now().toString(36).toUpperCase();
  return repo.sembrarFixtures({ sufijo, usuario });
}

/**
 * Borra primero la BD (en transacción) y después los blobs. Un blob que no se puede borrar no
 * revierte la limpieza: se reporta en `blobsConError`.
 * @param {object} repo
 * @param {{ eliminar: Function }} blobStorage
 * @param {{ planogramaIds: number[], tiendaIds: number[], skus: string[], accesorioIds: number[] }} datos
 */
async function limpiarDatos(repo, blobStorage, datos) {
  const blobs      = await repo.listarBlobs(datos);
  const eliminados = await repo.eliminarDatos(datos);

  const blobsConError = [];
  for (const blob of blobs) {
    try {
      await blobStorage.eliminar(blob);
    } catch {
      blobsConError.push(blob.blobPath);
    }
  }

  return { ...eliminados, blobs: blobs.length - blobsConError.length, blobsConError };
}

module.exports = {
  sembrarFixtures,
  limpiarDatos,
};
