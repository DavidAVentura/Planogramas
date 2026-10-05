/**
 * adjunto.entity.js
 * Reglas de negocio puras del dominio Adjunto.
 * Sin dependencias de Express, Knex, ni del SDK de Azure Storage.
 */

const crypto = require('crypto');
const { sanitizarNombreArchivo } = require('../compartido/archivo');

const MIME_TYPES_PERMITIDOS = Object.freeze([
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
  'application/vnd.ms-excel',                                          // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
]);

// El archivo no pasa por el backend: el navegador lo sube directo a Azure con una URL SAS
// (ver adjunto.usecases.js), así que este tope no depende del límite del body JSON.
const TAMANO_MAXIMO_BYTES = 40 * 1024 * 1024;

/** Vigencia de las URLs SAS: la de subida cubre 40MB en una conexión lenta; la de descarga solo
 * tiene que alcanzar para que el navegador empiece a bajar el archivo. */
const MINUTOS_VIGENCIA_SUBIDA   = 30;
const MINUTOS_VIGENCIA_DESCARGA = 5;

const MODOS_DESCARGA = Object.freeze(['inline', 'attachment']);

function errorBadRequest(mensaje) {
  const err = new Error(mensaje);
  err.status = 400;
  err.code   = 'VALIDATION_ERROR';
  return err;
}

/**
 * Valida el tipo MIME y el tamaño del archivo antes de subirlo.
 * @param {{ tipoMime: string, tamanoBytes: number }} datos
 */
function validarArchivo({ tipoMime, tamanoBytes }) {
  if (!MIME_TYPES_PERMITIDOS.includes(tipoMime)) {
    throw errorBadRequest(
      `Tipo de archivo no permitido: ${tipoMime}. Permitidos: ${MIME_TYPES_PERMITIDOS.join(', ')}`,
    );
  }
  if (tamanoBytes > TAMANO_MAXIMO_BYTES) {
    throw errorBadRequest(
      `El archivo excede el tamaño máximo permitido (${TAMANO_MAXIMO_BYTES / (1024 * 1024)}MB)`,
    );
  }
}

/**
 * Valida que la ruta de blob a confirmar sea una de las que este backend genera para la versión
 * (`versiones/{versionId}/...`), para que no se pueda registrar un blob ajeno.
 * @param {number} versionId
 * @param {string} blobPath
 */
function validarBlobPathDeVersion(versionId, blobPath) {
  const prefijo = `versiones/${versionId}/`;
  if (!blobPath.startsWith(prefijo) || blobPath.includes('..') || blobPath.length === prefijo.length) {
    throw errorBadRequest('blob_path no corresponde a una subida de esta versión');
  }
}

/**
 * Valor de Content-Disposition para la descarga: ASCII en `filename` y el nombre original
 * completo (acentos incluidos) en `filename*` (RFC 6266).
 * @param {'inline'|'attachment'} modo
 * @param {string} nombreOriginal
 * @returns {string}
 */
function construirContentDisposition(modo, nombreOriginal) {
  const ascii = nombreOriginal.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '_') || 'archivo';
  return `${modo}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombreOriginal)}`;
}

/**
 * Genera una ruta de blob única dentro del contenedor, con el nombre original sanitizado.
 * @param {number} versionId
 * @param {string} nombreOriginal
 * @returns {string}
 */
function generarBlobPath(versionId, nombreOriginal) {
  const sufijo           = crypto.randomUUID();
  const nombreSanitizado = sanitizarNombreArchivo(nombreOriginal);
  return `versiones/${versionId}/${sufijo}-${nombreSanitizado}`;
}

module.exports = {
  MIME_TYPES_PERMITIDOS,
  TAMANO_MAXIMO_BYTES,
  MINUTOS_VIGENCIA_SUBIDA,
  MINUTOS_VIGENCIA_DESCARGA,
  MODOS_DESCARGA,
  validarArchivo,
  validarBlobPathDeVersion,
  construirContentDisposition,
  generarBlobPath,
};
