/**
 * blobClient.js
 * Cliente de Azure Blob Storage para el módulo de adjuntos.
 * El contenedor es privado (la cuenta tiene deshabilitado el acceso anónimo al blob) — nunca se
 * expone blob_url como link directo al frontend. Los archivos grandes (adjuntos de versión) no
 * pasan por el backend: este cliente firma URLs SAS de corta duración, limitadas a un solo blob,
 * para que el navegador suba (crear/escribir) o descargue (leer) directo contra Azure. La firma
 * usa la clave de la cuenta incluida en AZURE_STORAGE_CONNECTION_STRING.
 */

const { BlobServiceClient, BlobSASPermissions } = require('@azure/storage-blob');
const env = require('../../config/env');

function errorServicioNoDisponible(mensaje, causa) {
  const err = new Error(mensaje);
  err.status = 503;
  err.code   = 'SERVICE_UNAVAILABLE';
  if (causa) err.details = causa.message;
  return err;
}

let serviceClient = null;

function obtenerServiceClient() {
  if (!serviceClient) {
    serviceClient = BlobServiceClient.fromConnectionString(env.azureStorage.connectionString);
  }
  return serviceClient;
}

function obtenerContainerClient(container) {
  return obtenerServiceClient().getContainerClient(container);
}

// ─── subir ───────────────────────────────────────────────────────────────────
// createIfNotExists() sin `access` deja el contenedor privado por default — coherente con que
// la cuenta ya tiene el acceso anónimo al blob deshabilitado a nivel de cuenta.

async function subir({ container, blobPath, buffer, contentType }) {
  try {
    const containerClient = obtenerContainerClient(container);
    await containerClient.createIfNotExists();

    const blobClient = containerClient.getBlockBlobClient(blobPath);
    await blobClient.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } });

    return { url: blobClient.url };
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo subir el archivo a Azure Blob Storage', err);
  }
}

// ─── descargar ───────────────────────────────────────────────────────────────

async function descargar({ container, blobPath }) {
  try {
    const blobClient = obtenerContainerClient(container).getBlockBlobClient(blobPath);
    const respuesta  = await blobClient.download();
    return respuesta.readableStreamBody;
  } catch (err) {
    if (err.statusCode === 404) return null;
    throw errorServicioNoDisponible('No se pudo descargar el archivo desde Azure Blob Storage', err);
  }
}

// ─── URLs SAS ────────────────────────────────────────────────────────────────
// startsOn se adelanta unos minutos para tolerar desfase de reloj entre el servidor y Azure.

const MARGEN_RELOJ_MS = 5 * 60 * 1000;

function rangoVigencia(minutos) {
  const ahora = Date.now();
  return { startsOn: new Date(ahora - MARGEN_RELOJ_MS), expiresOn: new Date(ahora + minutos * 60 * 1000) };
}

/**
 * URL SAS que solo permite crear/escribir el blob indicado (subida directa desde el navegador).
 * Crea el contenedor si no existe, porque el navegador no puede hacerlo con esta firma.
 * @returns {Promise<{ url: string, expiraEn: Date }>}
 */
async function generarUrlSubida({ container, blobPath, minutosVigencia }) {
  try {
    const containerClient = obtenerContainerClient(container);
    await containerClient.createIfNotExists();

    const { startsOn, expiresOn } = rangoVigencia(minutosVigencia);
    const url = await containerClient.getBlockBlobClient(blobPath).generateSasUrl({
      permissions: BlobSASPermissions.parse('cw'),
      startsOn,
      expiresOn,
    });
    return { url, expiraEn: expiresOn };
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo preparar la subida a Azure Blob Storage', err);
  }
}

/**
 * URL SAS de solo lectura del blob indicado. `contentDisposition`/`contentType` se fuerzan en la
 * respuesta de Azure, para que el navegador lo muestre (inline) o lo guarde con su nombre original.
 * @returns {Promise<{ url: string, expiraEn: Date }>}
 */
async function generarUrlDescarga({ container, blobPath, minutosVigencia, contentDisposition, contentType }) {
  try {
    const { startsOn, expiresOn } = rangoVigencia(minutosVigencia);
    const url = await obtenerContainerClient(container).getBlockBlobClient(blobPath).generateSasUrl({
      permissions: BlobSASPermissions.parse('r'),
      startsOn,
      expiresOn,
      contentDisposition,
      contentType,
    });
    return { url, expiraEn: expiresOn };
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo preparar la descarga desde Azure Blob Storage', err);
  }
}

/**
 * Propiedades del blob ya subido, o null si no existe.
 * @returns {Promise<{ tamanoBytes: number, tipoMime: string|undefined, url: string }|null>}
 */
async function obtenerPropiedades({ container, blobPath }) {
  const blobClient = obtenerContainerClient(container).getBlockBlobClient(blobPath);
  try {
    const props = await blobClient.getProperties();
    return { tamanoBytes: props.contentLength, tipoMime: props.contentType, url: blobClient.url };
  } catch (err) {
    if (err.statusCode === 404) return null;
    throw errorServicioNoDisponible('No se pudo consultar el archivo en Azure Blob Storage', err);
  }
}

// ─── eliminar ────────────────────────────────────────────────────────────────

async function eliminar({ container, blobPath }) {
  try {
    const blobClient = obtenerContainerClient(container).getBlockBlobClient(blobPath);
    await blobClient.deleteIfExists();
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo eliminar el archivo de Azure Blob Storage', err);
  }
}

module.exports = {
  container: env.azureStorage.container,
  subir,
  descargar,
  eliminar,
  generarUrlSubida,
  generarUrlDescarga,
  obtenerPropiedades,
};
