/**
 * blobs.js — copia de adjuntos `adjuntos-dev` → `adjuntos` en la misma cuenta, sin SAS:
 * la copia server-side se autoriza con la clave compartida de la cuenta. Nunca borra blobs.
 */

const { BlobServiceClient } = require('@azure/storage-blob');
const {
  CUENTA_BLOB, CONTENEDOR_ORIGEN, CONTENEDOR_DESTINO, BASE_URL_DESTINO,
  blobYaIdentico, formatearError,
} = require('./plan');

function crearClienteBlobs() {
  if (CONTENEDOR_ORIGEN === CONTENEDOR_DESTINO) throw new Error('Contenedor origen y destino iguales.');
  const cadena = require('../../src/config/env').azureStorage.connectionString;
  if (!cadena) throw new Error('Falta la configuración de Azure Storage.');
  const servicio = BlobServiceClient.fromConnectionString(cadena);
  if (servicio.accountName !== CUENTA_BLOB) {
    throw new Error(`La cuenta de Storage debe ser ${CUENTA_BLOB}.`);
  }
  const contOrigen = servicio.getContainerClient(CONTENEDOR_ORIGEN);
  const contDestino = servicio.getContainerClient(CONTENEDOR_DESTINO);
  let destinoCreado = false;

  const contenedor = (nombre) => (nombre === CONTENEDOR_ORIGEN ? contOrigen : contDestino);

  async function propiedades(nombreContenedor, blobPath) {
    try {
      const p = await contenedor(nombreContenedor).getBlobClient(blobPath).getProperties();
      return {
        tamanoBytes: p.contentLength,
        md5: p.contentMD5 ? Buffer.from(p.contentMD5).toString('base64') : null,
      };
    } catch (err) {
      if (err?.statusCode === 404) return null;
      throw new Error(`${formatearError(err)} · ${blobPath}`);
    }
  }

  async function copiar(blobPath) {
    try {
      const origen = await propiedades(CONTENEDOR_ORIGEN, blobPath);
      if (!origen) throw new Error('faltante en origen');
      const destino = await propiedades(CONTENEDOR_DESTINO, blobPath);
      const blobDestino = contDestino.getBlobClient(blobPath);
      if (blobYaIdentico(origen, destino)) return { estado: 'ya-identico', url: blobDestino.url };

      if (!destinoCreado) {
        await contDestino.createIfNotExists();
        destinoCreado = true;
      }
      const poller = await blobDestino.beginCopyFromURL(contOrigen.getBlobClient(blobPath).url);
      const resultado = await poller.pollUntilDone();
      if (resultado.copyStatus !== 'success') throw new Error(`copia no exitosa (${resultado.copyStatus})`);
      const despues = await propiedades(CONTENEDOR_DESTINO, blobPath);
      if (!despues || despues.tamanoBytes !== origen.tamanoBytes || (origen.md5 && despues.md5 !== origen.md5)) {
        throw new Error('el destino no coincide con el origen tras la copia');
      }
      if (blobDestino.url !== BASE_URL_DESTINO + blobPath) throw new Error('URL destino inesperada');
      return { estado: 'copiado', url: blobDestino.url };
    } catch (err) {
      throw new Error(`${formatearError(err)} · ${blobPath}`);
    }
  }

  return { cuenta: servicio.accountName, propiedades, copiar };
}

module.exports = { crearClienteBlobs };
