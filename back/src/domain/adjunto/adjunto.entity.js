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

// El body JSON global admite hasta 15mb (ver app.js) y el archivo viaja como base64 (~33% de
// overhead sobre el binario) — 10MB de binario (~13.4MB en base64) deja margen dentro de ese límite.
const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;

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
  validarArchivo,
  generarBlobPath,
};
