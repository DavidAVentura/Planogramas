/**
 * adjunto.usecases.js
 * Casos de uso del dominio Adjunto.
 * Reciben el repositorio de Adjunto, el de Version y el cliente de Storage por inyección de
 * dependencia — sin imports de infraestructura. El binario vive en Azure Blob Storage
 * (contenedor privado); la BD solo guarda la referencia.
 *
 * El archivo nunca pasa por el backend (hasta 40MB, ver adjunto.entity.js):
 *   1. `solicitarSubida` valida tipo/tamaño declarados y devuelve una URL SAS de solo escritura
 *      para un blob nuevo de la versión.
 *   2. El navegador sube el archivo directo a Azure con esa URL.
 *   3. `agregarAdjunto` / `reemplazarAdjunto` confirman: verifican en Azure que el blob exista con
 *      el tipo y tamaño permitidos (si no, lo borran) y recién ahí escriben la fila en la BD.
 * La descarga también es directa: `obtenerUrlDescarga` firma una URL SAS de solo lectura que vence
 * en minutos. blob_url (sin SAS) nunca se usa como link.
 *
 * Los adjuntos se pueden agregar, reemplazar y eliminar en cualquier estado de la versión
 * (incluida publicada): son material de apoyo del analista, no parte del planograma versionado.
 */

const {
  MINUTOS_VIGENCIA_SUBIDA,
  MINUTOS_VIGENCIA_DESCARGA,
  validarArchivo,
  validarBlobPathDeVersion,
  construirContentDisposition,
  generarBlobPath,
} = require('./adjunto.entity');

// ─── Helpers privados ────────────────────────────────────────────────────────

function errorConflict(mensaje) {
  const err = new Error(mensaje);
  err.status = 409;
  err.code   = 'CONFLICT';
  return err;
}

function errorUnprocessable(mensaje) {
  const err = new Error(mensaje);
  err.status = 422;
  err.code   = 'UNPROCESSABLE';
  return err;
}

function errorBadRequest(mensaje) {
  const err = new Error(mensaje);
  err.status = 400;
  err.code   = 'VALIDATION_ERROR';
  return err;
}

function errorNotFound(mensaje) {
  const err = new Error(mensaje);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

async function buscarVersionOFallar(versionRepo, versionId) {
  const version = await versionRepo.buscarPorId(versionId);
  if (!version) throw errorNotFound(`Versión ${versionId} no encontrada`);
  return version;
}

async function buscarAdjuntoOFallar(adjuntoRepo, id) {
  const adjunto = await adjuntoRepo.buscarPorId(id);
  if (!adjunto) throw errorNotFound(`Adjunto ${id} no encontrado`);
  return adjunto;
}

async function prepararSubida(blobStorage, versionId, datos) {
  validarArchivo({ tipoMime: datos.tipo_mime, tamanoBytes: datos.tamano_bytes });

  const blobPath = generarBlobPath(versionId, datos.nombre_original);
  const { url, expiraEn } = await blobStorage.generarUrlSubida({
    container: blobStorage.container, blobPath, minutosVigencia: MINUTOS_VIGENCIA_SUBIDA,
  });

  return { blobPath, urlSubida: url, expiraEn, tipoMime: datos.tipo_mime };
}

/**
 * Verifica el blob que el navegador dice haber subido: que sea una ruta de la versión, que no
 * esté ya registrada y que exista en Azure con el tipo y tamaño permitidos. Si el archivo
 * subido no cumple, se borra para no dejar basura en el contenedor.
 * @returns {Promise<{ tamanoBytes: number, url: string }>}
 */
async function verificarBlobSubido(adjuntoRepo, blobStorage, versionId, datos) {
  validarBlobPathDeVersion(versionId, datos.blob_path);
  if (await adjuntoRepo.existeBlobPath(datos.blob_path)) {
    throw errorConflict('Ese archivo ya está registrado como adjunto');
  }

  const ubicacion = { container: blobStorage.container, blobPath: datos.blob_path };
  const props = await blobStorage.obtenerPropiedades(ubicacion);
  if (!props) throw errorUnprocessable('El archivo no se terminó de subir. Vuelve a intentarlo.');

  try {
    validarArchivo({ tipoMime: datos.tipo_mime, tamanoBytes: props.tamanoBytes });
    if (props.tipoMime !== datos.tipo_mime) {
      throw errorBadRequest(`El archivo subido es de tipo ${props.tipoMime ?? 'desconocido'}, no ${datos.tipo_mime}`);
    }
  } catch (err) {
    await blobStorage.eliminar(ubicacion);
    throw err;
  }

  return props;
}

// ─── Casos de uso ────────────────────────────────────────────────────────────

/**
 * Lista los adjuntos de una versión, más recientes primero.
 * @param {object} adjuntoRepo
 * @param {object} versionRepo
 * @param {number} versionId
 * @returns {Promise<object[]>}
 */
async function listarAdjuntos(adjuntoRepo, versionRepo, versionId) {
  await buscarVersionOFallar(versionRepo, versionId);
  return adjuntoRepo.listarPorVersion(versionId);
}

/**
 * Paso 1 de agregar: valida el archivo declarado y devuelve la URL SAS para subirlo.
 * @param {object} versionRepo
 * @param {object} blobStorage
 * @param {number} versionId
 * @param {{ nombre_original, tipo_mime, tamano_bytes }} datos
 * @returns {Promise<{ blobPath, urlSubida, expiraEn, tipoMime }>}
 */
async function solicitarSubida(versionRepo, blobStorage, versionId, datos) {
  await buscarVersionOFallar(versionRepo, versionId);
  return prepararSubida(blobStorage, versionId, datos);
}

/**
 * Paso 1 de reemplazar: igual que `solicitarSubida`, para la versión del adjunto existente.
 * @param {object} adjuntoRepo
 * @param {object} versionRepo
 * @param {object} blobStorage
 * @param {number} id
 * @param {{ nombre_original, tipo_mime, tamano_bytes }} datos
 * @returns {Promise<{ blobPath, urlSubida, expiraEn, tipoMime }>}
 */
async function solicitarSubidaReemplazo(adjuntoRepo, versionRepo, blobStorage, id, datos) {
  const adjunto = await buscarAdjuntoOFallar(adjuntoRepo, id);
  await buscarVersionOFallar(versionRepo, adjunto.versionId);
  return prepararSubida(blobStorage, adjunto.versionId, datos);
}

/**
 * Paso 3 de agregar: confirma el blob ya subido y lo registra como adjunto de la versión.
 * @param {object} adjuntoRepo
 * @param {object} versionRepo
 * @param {object} blobStorage
 * @param {number} versionId
 * @param {{ nombre_original, tipo_mime, blob_path }} datos
 * @param {string} [userId]
 * @returns {Promise<object>}
 */
async function agregarAdjunto(adjuntoRepo, versionRepo, blobStorage, versionId, datos, userId) {
  await buscarVersionOFallar(versionRepo, versionId);
  const blob = await verificarBlobSubido(adjuntoRepo, blobStorage, versionId, datos);

  const id = await adjuntoRepo.crear({
    planograma_version_id: versionId,
    nombre_original:       datos.nombre_original,
    tipo_mime:             datos.tipo_mime,
    tamano_bytes:          blob.tamanoBytes,
    blob_container:        blobStorage.container,
    blob_path:             datos.blob_path,
    blob_url:              blob.url,
    subido_por:            userId ?? 'sistema',
  });

  return adjuntoRepo.buscarPorId(id);
}

/**
 * Paso 3 de reemplazar: confirma el blob nuevo, actualiza la fila (conserva el id) y recién
 * después borra el blob viejo, para no perder el archivo si la escritura en BD fallara.
 * @param {object} adjuntoRepo
 * @param {object} versionRepo
 * @param {object} blobStorage
 * @param {number} id
 * @param {{ nombre_original, tipo_mime, blob_path }} datos
 * @param {string} [userId]
 * @returns {Promise<object>}
 */
async function reemplazarAdjunto(adjuntoRepo, versionRepo, blobStorage, id, datos, userId) {
  const adjunto = await buscarAdjuntoOFallar(adjuntoRepo, id);
  await buscarVersionOFallar(versionRepo, adjunto.versionId);
  const blob = await verificarBlobSubido(adjuntoRepo, blobStorage, adjunto.versionId, datos);

  await adjuntoRepo.actualizarArchivo(id, {
    nombre_original: datos.nombre_original,
    tipo_mime:       datos.tipo_mime,
    tamano_bytes:    blob.tamanoBytes,
    blob_container:  blobStorage.container,
    blob_path:       datos.blob_path,
    blob_url:        blob.url,
    subido_por:      userId ?? 'sistema',
  });

  await blobStorage.eliminar({ container: adjunto.blobContainer, blobPath: adjunto.blobPath });

  return adjuntoRepo.buscarPorId(id);
}

/**
 * Elimina un adjunto: borra la fila y, después, el blob físico en Azure.
 * @param {object} adjuntoRepo
 * @param {object} versionRepo
 * @param {object} blobStorage
 * @param {number} id
 * @returns {Promise<void>}
 */
async function eliminarAdjunto(adjuntoRepo, versionRepo, blobStorage, id) {
  const adjunto = await buscarAdjuntoOFallar(adjuntoRepo, id);
  await buscarVersionOFallar(versionRepo, adjunto.versionId);

  await adjuntoRepo.eliminar(id);
  await blobStorage.eliminar({ container: adjunto.blobContainer, blobPath: adjunto.blobPath });
}

/**
 * Firma una URL SAS de solo lectura para descargar el adjunto directo desde Azure.
 * `inline` lo abre en el navegador (imágenes/PDF); `attachment` lo guarda con su nombre original.
 * @param {object} adjuntoRepo
 * @param {object} blobStorage
 * @param {number} id
 * @param {'inline'|'attachment'} modo
 * @returns {Promise<{ url: string, expiraEn: Date }>}
 */
async function obtenerUrlDescarga(adjuntoRepo, blobStorage, id, modo) {
  const adjunto = await buscarAdjuntoOFallar(adjuntoRepo, id);
  return blobStorage.generarUrlDescarga({
    container:          adjunto.blobContainer,
    blobPath:           adjunto.blobPath,
    minutosVigencia:    MINUTOS_VIGENCIA_DESCARGA,
    contentDisposition: construirContentDisposition(modo, adjunto.nombreOriginal),
    contentType:        adjunto.tipoMime,
  });
}

module.exports = {
  listarAdjuntos,
  solicitarSubida,
  solicitarSubidaReemplazo,
  agregarAdjunto,
  reemplazarAdjunto,
  eliminarAdjunto,
  obtenerUrlDescarga,
};
