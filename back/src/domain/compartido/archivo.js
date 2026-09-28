/**
 * archivo.js
 * Helpers puros compartidos por los dominios que reciben archivos en base64 dentro del body JSON
 * (Adjunto, EvidenciaImplementacion). Sin dependencias de Express, Knex ni del SDK de Storage.
 */

/**
 * Decodifica el contenido base64 (sin prefijo `data:`) a un Buffer binario.
 * @param {string} archivoBase64
 * @returns {Buffer}
 */
function decodificarBase64(archivoBase64) {
  return Buffer.from(archivoBase64, 'base64');
}

/**
 * Deja el nombre original apto para usarlo dentro de una ruta de blob.
 * @param {string} nombreOriginal
 * @returns {string}
 */
function sanitizarNombreArchivo(nombreOriginal) {
  return nombreOriginal.replace(/[^a-zA-Z0-9._-]/g, '_');
}

module.exports = {
  decodificarBase64,
  sanitizarNombreArchivo,
};
