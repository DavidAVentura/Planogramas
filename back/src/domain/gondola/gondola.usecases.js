/**
 * gondola.usecases.js
 * Casos de uso del dominio Gondola.
 * Reciben el repositorio por inyección de dependencia — sin imports de infraestructura.
 *
 * Las operaciones de escritura reciben también el repositorio de Version, inyectado desde
 * el controlador, para validar que la versión padre esté en un estado editable.
 */

const { validarVersionEditable, validarArrayOrden } = require('./gondola.entity');

// ─── Helpers privados ────────────────────────────────────────────────────────

function errorNotFound(mensaje) {
  const err = new Error(mensaje);
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

async function buscarVersionOFallar(versionRepo, versionId) {
  const version = await versionRepo.buscarPorId(versionId);
  if (!version) throw errorNotFound(`Versión ${versionId} no encontrada`);
  return version;
}

async function buscarGondolaOFallar(gondolaRepo, id) {
  const gondola = await gondolaRepo.buscarPorId(id);
  if (!gondola) throw errorNotFound(`Góndola ${id} no encontrada`);
  return gondola;
}

// ─── Casos de uso ────────────────────────────────────────────────────────────

/**
 * Lista las góndolas de una versión.
 * @param {object} gondolaRepo
 * @param {object} versionRepo
 * @param {number} versionId
 * @returns {Promise<object[]>}
 */
async function listarGondolas(gondolaRepo, versionRepo, versionId) {
  await buscarVersionOFallar(versionRepo, versionId);
  return gondolaRepo.listarPorVersion(versionId);
}

/**
 * Retorna el detalle completo de una góndola.
 * @param {object} gondolaRepo
 * @param {number} id
 * @returns {Promise<object>}
 */
async function obtenerGondola(gondolaRepo, id) {
  return buscarGondolaOFallar(gondolaRepo, id);
}

/**
 * Retorna el resumen (conteos) de una góndola, previo a su eliminación.
 * @param {object} gondolaRepo
 * @param {number} id
 * @returns {Promise<object>}
 */
async function obtenerResumenGondola(gondolaRepo, id) {
  const resumen = await gondolaRepo.obtenerResumen(id);
  if (!resumen) throw errorNotFound(`Góndola ${id} no encontrada`);
  return resumen;
}

/**
 * Agrega una góndola nueva a la versión. El orden se calcula como MAX(orden)+1.
 * @param {object} gondolaRepo
 * @param {object} versionRepo
 * @param {number} versionId
 * @param {{ nombre, ancho_cm, alto_cm, profundidad_cm, posicion_en_tienda? }} datos
 * @returns {Promise<object>}
 */
async function agregarGondola(gondolaRepo, versionRepo, versionId, datos) {
  const version = await buscarVersionOFallar(versionRepo, versionId);
  validarVersionEditable(version.estado);

  const orden = await gondolaRepo.siguienteOrden(versionId);

  const id = await gondolaRepo.crear({
    planograma_version_id: versionId,
    nombre:                datos.nombre,
    ancho_cm:              datos.ancho_cm,
    alto_cm:               datos.alto_cm,
    profundidad_cm:        datos.profundidad_cm,
    posicion_en_tienda:    datos.posicion_en_tienda ?? null,
    orden,
  });

  return gondolaRepo.buscarPorId(id);
}

/**
 * Aplica un partial update de nombre, medidas o posición en tienda.
 * @param {object} gondolaRepo
 * @param {object} versionRepo
 * @param {number} id
 * @param {{ nombre?, ancho_cm?, alto_cm?, profundidad_cm?, posicion_en_tienda? }} cambios
 * @returns {Promise<object>}
 */
async function editarGondola(gondolaRepo, versionRepo, id, cambios) {
  const gondola = await buscarGondolaOFallar(gondolaRepo, id);
  const version = await buscarVersionOFallar(versionRepo, gondola.versionId);
  validarVersionEditable(version.estado);

  const { nivelesActualizados } = await gondolaRepo.actualizar(id, cambios);
  const actualizada = await gondolaRepo.buscarPorId(id);

  return { ...actualizada, nivelesActualizados };
}

/**
 * Reordena las góndolas de una versión de forma atómica.
 * @param {object} gondolaRepo
 * @param {object} versionRepo
 * @param {number} versionId
 * @param {Array<{id:number, orden:number}>} orden
 * @returns {Promise<{ gondolas: Array<{id:number, orden:number}> }>}
 */
async function reordenarGondolas(gondolaRepo, versionRepo, versionId, orden) {
  const version = await buscarVersionOFallar(versionRepo, versionId);
  validarVersionEditable(version.estado);
  validarArrayOrden(orden);

  const ids = orden.map((o) => o.id);
  const pertenecientes = await gondolaRepo.contarPertenecientesAVersion(versionId, ids);
  if (pertenecientes !== ids.length) {
    throw errorNotFound('Alguno de los ids de góndola no pertenece a esta versión');
  }

  await gondolaRepo.reordenar(orden);
  return { gondolas: orden };
}

/**
 * Elimina una góndola. Requiere `forzar=true` si tiene posiciones asignadas.
 * @param {object} gondolaRepo
 * @param {object} versionRepo
 * @param {number} id
 * @param {boolean} forzar
 * @returns {Promise<void>}
 */
async function eliminarGondola(gondolaRepo, versionRepo, id, forzar) {
  const gondola = await buscarGondolaOFallar(gondolaRepo, id);
  const version = await buscarVersionOFallar(versionRepo, gondola.versionId);
  validarVersionEditable(version.estado);

  if (!forzar) {
    const resumen = await gondolaRepo.obtenerResumen(id);
    if (resumen.totalPosiciones > 0) {
      throw errorConflict(
        'La góndola tiene contenido asignado. Usa forzar=true para eliminar en cascada.',
        { totalNiveles: resumen.totalNiveles, totalPosiciones: resumen.totalPosiciones },
      );
    }
  }

  await gondolaRepo.eliminar(id);
}

module.exports = {
  listarGondolas,
  obtenerGondola,
  obtenerResumenGondola,
  agregarGondola,
  editarGondola,
  reordenarGondolas,
  eliminarGondola,
};
