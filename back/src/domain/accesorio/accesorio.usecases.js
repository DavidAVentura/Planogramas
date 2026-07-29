/**
 * accesorio.usecases.js
 * Casos de uso del dominio Accesorio.
 * Reciben el repositorio por inyección de dependencia — sin imports de infraestructura.
 */

function errorNotFound(id) {
  const err = new Error(`Accesorio ${id} no encontrado`);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

/**
 * Lista los accesorios del catálogo, con filtro opcional por tipo.
 * @param {object} repo
 * @param {{ tipo?: string }} filtros
 * @returns {Promise<object[]>}
 */
async function listarAccesorios(repo, filtros) {
  return repo.listar(filtros);
}

/**
 * Retorna el detalle de un accesorio del catálogo.
 * @param {object} repo
 * @param {number} id
 * @returns {Promise<object>}
 */
async function obtenerAccesorio(repo, id) {
  const accesorio = await repo.buscarPorId(id);
  if (!accesorio) throw errorNotFound(id);
  return accesorio;
}

module.exports = {
  listarAccesorios,
  obtenerAccesorio,
};
