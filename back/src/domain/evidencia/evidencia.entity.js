/**
 * evidencia.entity.js
 * Reglas de negocio puras del dominio EvidenciaImplementacion (fotos de góndolas montadas).
 * Sin dependencias de Express, Knex ni del SDK de Azure Storage.
 * Ver Arquitectura/Contratos/17_evidencias/.
 */

const crypto = require('crypto');
const { sanitizarNombreArchivo } = require('../compartido/archivo');

/** Solo imágenes. */
const MIME_TYPES_EVIDENCIA = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

/** El archivo viaja en base64 dentro del body JSON de 8mb (ver app.js); el front comprime la foto hasta este tope. */
const TAMANO_MAXIMO_EVIDENCIA_BYTES = 5 * 1024 * 1024;

// ─── Errores de dominio ──────────────────────────────────────────────────────

function errorValidacion(mensaje) {
  const err = new Error(mensaje);
  err.status = 400;
  err.code   = 'VALIDATION_ERROR';
  return err;
}

function errorGondolaNoPertenece() {
  const err = new Error('La góndola no pertenece a esta versión');
  err.status = 400;
  err.code   = 'VALIDATION_ERROR';
  return err;
}

function errorEvidenciaNoEncontrada(id) {
  const err = new Error(`Evidencia ${id} no encontrada`);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

function errorSinPermiso() {
  const err = new Error('Solo quien subió la foto puede eliminarla');
  err.status = 403;
  err.code   = 'FORBIDDEN';
  return err;
}

// ─── Reglas ──────────────────────────────────────────────────────────────────

/**
 * Valida tipo MIME (solo imágenes) y tamaño decodificado (no vacío, ≤ límite de Adjuntos).
 * @param {{ tipoMime: string, tamanoBytes: number }} datos
 */
function validarArchivoEvidencia({ tipoMime, tamanoBytes }) {
  if (!MIME_TYPES_EVIDENCIA.includes(tipoMime)) {
    throw errorValidacion(
      `Tipo de archivo no permitido: ${tipoMime}. Permitidos: ${MIME_TYPES_EVIDENCIA.join(', ')}`,
    );
  }
  if (!tamanoBytes) throw errorValidacion('El archivo está vacío');
  if (tamanoBytes > TAMANO_MAXIMO_EVIDENCIA_BYTES) {
    throw errorValidacion(
      `El archivo excede el tamaño máximo permitido (${TAMANO_MAXIMO_EVIDENCIA_BYTES / (1024 * 1024)}MB)`,
    );
  }
}

/**
 * Ruta de blob única: evidencias/{tiendaCodigo}/{versionId}/{uuid}-{nombre}.
 * @param {string} tiendaCodigo
 * @param {number} versionId
 * @param {string} nombreOriginal
 * @returns {string}
 */
function generarBlobPathEvidencia(tiendaCodigo, versionId, nombreOriginal) {
  const sufijo = crypto.randomUUID();
  return `evidencias/${sanitizarNombreArchivo(tiendaCodigo)}/${versionId}/${sufijo}-${sanitizarNombreArchivo(nombreOriginal)}`;
}

/**
 * Solo quien subió la foto puede eliminarla.
 * @param {{ subidoPor: string }} evidencia
 * @param {string} usuario
 * @returns {boolean}
 */
function puedeEliminar(evidencia, usuario) {
  return Boolean(usuario) && evidencia.subidoPor === usuario;
}

module.exports = {
  MIME_TYPES_EVIDENCIA,
  TAMANO_MAXIMO_EVIDENCIA_BYTES,
  errorValidacion,
  errorGondolaNoPertenece,
  errorEvidenciaNoEncontrada,
  errorSinPermiso,
  validarArchivoEvidencia,
  generarBlobPathEvidencia,
  puedeEliminar,
};
