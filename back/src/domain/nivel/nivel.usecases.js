/**
 * nivel.usecases.js
 * Casos de uso del dominio Nivel.
 * Reciben el repositorio por inyección de dependencia — sin imports de infraestructura.
 *
 * Las operaciones de escritura reciben también los repositorios de Gondola y Version,
 * inyectados desde el controlador, para resolver la góndola dueña y validar que la
 * versión padre esté en un estado editable.
 */

const { validarVersionEditable, validarArrayOrden, calcularAdvertenciasEdicion } = require('./nivel.entity');

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

async function buscarGondolaOFallar(gondolaRepo, id) {
  const gondola = await gondolaRepo.buscarPorId(id);
  if (!gondola) throw errorNotFound(`Góndola ${id} no encontrada`);
  return gondola;
}

async function buscarVersionOFallar(versionRepo, versionId) {
  const version = await versionRepo.buscarPorId(versionId);
  if (!version) throw errorNotFound(`Versión ${versionId} no encontrada`);
  return version;
}

async function buscarNivelOFallar(nivelRepo, id) {
  const nivel = await nivelRepo.buscarPorId(id);
  if (!nivel) throw errorNotFound(`Nivel ${id} no encontrado`);
  return nivel;
}

/** Carga góndola + versión de un nivel y valida que la versión sea editable. */
async function validarVersionDelNivel(gondolaRepo, versionRepo, nivel) {
  const gondola = await buscarGondolaOFallar(gondolaRepo, nivel.gondolaId);
  const version = await buscarVersionOFallar(versionRepo, gondola.versionId);
  validarVersionEditable(version.estado);
  return { gondola, version };
}

async function validarAccesorioSiAplica(nivelRepo, codigoAccesorioId) {
  if (codigoAccesorioId === undefined || codigoAccesorioId === null) return;
  const existe = await nivelRepo.accesorioExiste(codigoAccesorioId);
  if (!existe) throw errorNotFound(`Accesorio ${codigoAccesorioId} no encontrado`);
}

// ─── Casos de uso ────────────────────────────────────────────────────────────

/**
 * Lista los niveles de una góndola.
 * @param {object} nivelRepo
 * @param {object} gondolaRepo
 * @param {number} gondolaId
 * @returns {Promise<object[]>}
 */
async function listarNiveles(nivelRepo, gondolaRepo, gondolaId) {
  await buscarGondolaOFallar(gondolaRepo, gondolaId);
  return nivelRepo.listarPorGondola(gondolaId);
}

/**
 * Retorna el detalle completo de un nivel.
 * @param {object} nivelRepo
 * @param {number} id
 * @returns {Promise<object>}
 */
async function obtenerNivel(nivelRepo, id) {
  return buscarNivelOFallar(nivelRepo, id);
}

/**
 * Retorna el resumen (conteo de posiciones) de un nivel, previo a su eliminación.
 * @param {object} nivelRepo
 * @param {number} id
 * @returns {Promise<object>}
 */
async function obtenerResumenNivel(nivelRepo, id) {
  const resumen = await nivelRepo.obtenerResumen(id);
  if (!resumen) throw errorNotFound(`Nivel ${id} no encontrado`);
  return resumen;
}

/**
 * Agrega un nivel nuevo a la góndola en la posición de `orden` indicada.
 * @param {object} nivelRepo
 * @param {object} gondolaRepo
 * @param {object} versionRepo
 * @param {number} gondolaId
 * @param {{ orden, altura_desde_piso_cm, tipo_accesorio, codigo_accesorio_id?, tamano_accesorio_pulgadas?, ancho_disponible_cm, notas? }} datos
 * @returns {Promise<object>}
 */
async function agregarNivel(nivelRepo, gondolaRepo, versionRepo, gondolaId, datos) {
  const gondola = await buscarGondolaOFallar(gondolaRepo, gondolaId);
  const version = await buscarVersionOFallar(versionRepo, gondola.versionId);
  validarVersionEditable(version.estado);

  await validarAccesorioSiAplica(nivelRepo, datos.codigo_accesorio_id);

  const id = await nivelRepo.crearConOrden({
    gondola_id:                gondolaId,
    orden:                     datos.orden,
    altura_desde_piso_cm:      datos.altura_desde_piso_cm,
    tipo_accesorio:            datos.tipo_accesorio,
    codigo_accesorio_id:       datos.codigo_accesorio_id ?? null,
    tamano_accesorio_pulgadas: datos.tamano_accesorio_pulgadas ?? null,
    ancho_disponible_cm:       datos.ancho_disponible_cm,
    notas:                     datos.notas ?? null,
  });

  return nivelRepo.buscarPorId(id);
}

/**
 * Aplica un partial update de un nivel. Detecta advertencias no bloqueantes cuando
 * cambia el tipo de accesorio con posiciones existentes, o cuando el ancho disponible
 * queda por debajo del ancho ya ocupado por posiciones.
 * @param {object} nivelRepo
 * @param {object} gondolaRepo
 * @param {object} versionRepo
 * @param {number} id
 * @param {{ altura_desde_piso_cm?, tipo_accesorio?, codigo_accesorio_id?, tamano_accesorio_pulgadas?, ancho_disponible_cm?, notas? }} cambios
 * @returns {Promise<object>}
 */
async function editarNivel(nivelRepo, gondolaRepo, versionRepo, id, cambios) {
  const nivel = await buscarNivelOFallar(nivelRepo, id);
  await validarVersionDelNivel(gondolaRepo, versionRepo, nivel);
  await validarAccesorioSiAplica(nivelRepo, cambios.codigo_accesorio_id);

  const tipoAccesorioCambio = cambios.tipo_accesorio !== undefined && cambios.tipo_accesorio !== nivel.tipo_accesorio;
  const totalPosiciones     = tipoAccesorioCambio ? await nivelRepo.contarPosiciones(id) : 0;

  let anchoReducido = false;
  if (cambios.ancho_disponible_cm !== undefined) {
    const anchoOcupado = await nivelRepo.anchoOcupadoCm(id);
    anchoReducido = Number(cambios.ancho_disponible_cm) < anchoOcupado;
  }

  const advertencias = calcularAdvertenciasEdicion({ tipoAccesorioCambio, totalPosiciones, anchoReducido });

  await nivelRepo.actualizar(id, cambios);
  const actualizado = await nivelRepo.buscarPorId(id);

  return advertencias.length ? { ...actualizado, advertencia: advertencias.join(' ') } : actualizado;
}

/**
 * Reordena los niveles de una góndola de forma atómica.
 * @param {object} nivelRepo
 * @param {object} gondolaRepo
 * @param {object} versionRepo
 * @param {number} gondolaId
 * @param {Array<{id:number, orden:number}>} orden
 * @returns {Promise<{ niveles: Array<{id:number, orden:number}> }>}
 */
async function reordenarNiveles(nivelRepo, gondolaRepo, versionRepo, gondolaId, orden) {
  const gondola = await buscarGondolaOFallar(gondolaRepo, gondolaId);
  const version = await buscarVersionOFallar(versionRepo, gondola.versionId);
  validarVersionEditable(version.estado);
  validarArrayOrden(orden);

  const ids = orden.map((o) => o.id);
  const pertenecientes = await nivelRepo.contarPertenecientesAGondola(gondolaId, ids);
  if (pertenecientes !== ids.length) {
    throw errorNotFound('Alguno de los ids de nivel no pertenece a esta góndola');
  }

  await nivelRepo.reordenar(orden);
  return { niveles: orden };
}

/**
 * Elimina un nivel. Requiere `forzar=true` si tiene posiciones asignadas.
 * @param {object} nivelRepo
 * @param {object} gondolaRepo
 * @param {object} versionRepo
 * @param {number} id
 * @param {boolean} forzar
 * @returns {Promise<void>}
 */
async function eliminarNivel(nivelRepo, gondolaRepo, versionRepo, id, forzar) {
  const nivel = await buscarNivelOFallar(nivelRepo, id);
  await validarVersionDelNivel(gondolaRepo, versionRepo, nivel);

  if (!forzar) {
    const resumen = await nivelRepo.obtenerResumen(id);
    if (resumen.totalPosiciones > 0) {
      throw errorConflict(
        'El nivel tiene posiciones asignadas. Usa forzar=true para eliminar en cascada.',
        { totalPosiciones: resumen.totalPosiciones },
      );
    }
  }

  await nivelRepo.eliminar(id);
}

module.exports = {
  listarNiveles,
  obtenerNivel,
  obtenerResumenNivel,
  agregarNivel,
  editarNivel,
  reordenarNiveles,
  eliminarNivel,
};
