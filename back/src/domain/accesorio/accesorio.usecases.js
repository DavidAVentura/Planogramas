/**
 * accesorio.usecases.js
 * Casos de uso del dominio Accesorio.
 * Reciben el repositorio por inyección de dependencia — sin imports de infraestructura.
 */

const { normalizarCodigo } = require('./accesorio.entity');

function errorNotFound(id) {
  const err = new Error(`Accesorio ${id} no encontrado`);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

function errorConflict(mensaje, details) {
  const err = new Error(mensaje);
  err.status = 409;
  err.code   = 'CONFLICT';
  if (details) err.details = details;
  return err;
}

async function buscarOFallar(repo, id) {
  const accesorio = await repo.buscarPorId(id);
  if (!accesorio) throw errorNotFound(id);
  return accesorio;
}

/** El código es único en el catálogo (sin distinguir mayúsculas ni espacios de los extremos). */
async function validarCodigoLibre(repo, codigo, idPropio = null) {
  const existente = await repo.buscarPorCodigo(normalizarCodigo(codigo));
  if (existente && existente.id !== idPropio) {
    throw errorConflict(`Ya existe un accesorio con el código '${existente.codigo}'`, { accesorioId: existente.id });
  }
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
  return buscarOFallar(repo, id);
}

/**
 * Da de alta un accesorio en el catálogo.
 * @param {object} repo
 * @param {{ codigo, nombre, tipo, alto_cm?, ancho_cm?, profundidad_cm?, notas_capacidad? }} datos
 */
async function crearAccesorio(repo, datos) {
  await validarCodigoLibre(repo, datos.codigo);
  const id = await repo.crear({ ...datos, codigo: normalizarCodigo(datos.codigo) });
  return repo.buscarPorId(id);
}

/** Partial update; el código nuevo (si viene) debe seguir siendo único. */
async function editarAccesorio(repo, id, cambios) {
  await buscarOFallar(repo, id);
  if (cambios.codigo !== undefined) {
    await validarCodigoLibre(repo, cambios.codigo, id);
    cambios = { ...cambios, codigo: normalizarCodigo(cambios.codigo) };
  }
  await repo.actualizar(id, cambios);
  return repo.buscarPorId(id);
}

/** Elimina un accesorio que ningún nivel ni posición usa (si lo usan → 409 con los conteos). */
async function eliminarAccesorio(repo, id) {
  await buscarOFallar(repo, id);
  const usos = await repo.contarUsos(id);
  if (usos.niveles > 0 || usos.posiciones > 0) {
    throw errorConflict('El accesorio está en uso en niveles o posiciones', usos);
  }
  await repo.eliminar(id);
}

module.exports = {
  listarAccesorios,
  obtenerAccesorio,
  crearAccesorio,
  editarAccesorio,
  eliminarAccesorio,
};
