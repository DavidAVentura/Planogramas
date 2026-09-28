/**
 * evidencia.usecases.js
 * Casos de uso del dominio EvidenciaImplementacion (Arquitectura/Contratos/17_evidencias/).
 * Reciben por inyección el repositorio de evidencias, el de implementación (tienda activa y
 * versión asignada) y el cliente de Storage — sin imports de infraestructura. El binario vive en
 * Azure Blob Storage (mismo contenedor privado que Adjuntos); la descarga siempre pasa por el
 * backend. Si Azure no responde, el 503 SERVICE_UNAVAILABLE que lanza el cliente de Storage se
 * propaga tal cual.
 */

const {
  errorGondolaNoPertenece,
  errorEvidenciaNoEncontrada,
  errorSinPermiso,
  validarArchivoEvidencia,
  generarBlobPathEvidencia,
  puedeEliminar,
} = require('./evidencia.entity');
const { decodificarBase64 } = require('../compartido/archivo');
const {
  obtenerTiendaActivaOFallar,
  obtenerVersionesAsignadasOFallar,
} = require('../implementacion/implementacion.usecases');

// ─── Helpers privados ────────────────────────────────────────────────────────

async function validarTiendaYVersion(implementacionRepo, tiendaId, versionId) {
  const tienda = await obtenerTiendaActivaOFallar(implementacionRepo, tiendaId);
  await obtenerVersionesAsignadasOFallar(implementacionRepo, tiendaId, [versionId]);
  return tienda;
}

async function buscarEvidenciaOFallar(evidenciaRepo, id) {
  const evidencia = await evidenciaRepo.buscarPorId(id);
  if (!evidencia) throw errorEvidenciaNoEncontrada(id);
  return evidencia;
}

function formatearEvidencia(evidencia, usuario) {
  return {
    id:              evidencia.id,
    nombre_original: evidencia.nombreOriginal,
    tipo_mime:       evidencia.tipoMime,
    tamano_bytes:    evidencia.tamanoBytes,
    subido_por:      evidencia.subidoPor,
    created_at:      evidencia.createdAt,
    puedeEliminar:   puedeEliminar(evidencia, usuario),
  };
}

// ─── Casos de uso ────────────────────────────────────────────────────────────

/**
 * Lista la evidencia de la versión en la tienda, agrupada por góndola (incluye las góndolas sin
 * fotos).
 * @param {object} evidenciaRepo
 * @param {object} implementacionRepo
 * @param {number} tiendaId
 * @param {number} versionId
 * @param {string} usuario  usuario del JWT
 * @returns {Promise<object>}
 */
async function listarEvidencias(evidenciaRepo, implementacionRepo, tiendaId, versionId, usuario) {
  await validarTiendaYVersion(implementacionRepo, tiendaId, versionId);

  const [gondolas, evidencias] = await Promise.all([
    evidenciaRepo.listarGondolasDeVersion(versionId),
    evidenciaRepo.listarPorTiendaYVersion(tiendaId, versionId),
  ]);

  return {
    versionId,
    tiendaId,
    gondolas: gondolas.map((g) => ({
      id:         g.id,
      nombre:     g.nombre,
      orden:      g.orden,
      evidencias: evidencias
        .filter((e) => e.gondolaId === g.id)
        .map((e) => formatearEvidencia(e, usuario)),
    })),
  };
}

/**
 * Sube una foto de evidencia de una góndola. Si el guardado en BD falla después de subir el
 * blob, se borra el blob (sin huérfanos).
 * @param {object} evidenciaRepo
 * @param {object} implementacionRepo
 * @param {object} blobStorage
 * @param {number} tiendaId
 * @param {number} versionId
 * @param {{ gondola_id, nombre_original, tipo_mime, archivo_base64 }} datos
 * @param {string} usuario
 * @returns {Promise<object>}
 */
async function agregarEvidencia(evidenciaRepo, implementacionRepo, blobStorage, tiendaId, versionId, datos, usuario) {
  const tienda = await validarTiendaYVersion(implementacionRepo, tiendaId, versionId);

  if (!await evidenciaRepo.gondolaPerteneceAVersion(datos.gondola_id, versionId)) {
    throw errorGondolaNoPertenece();
  }

  const buffer = decodificarBase64(datos.archivo_base64);
  validarArchivoEvidencia({ tipoMime: datos.tipo_mime, tamanoBytes: buffer.length });

  const container = blobStorage.container;
  const blobPath  = generarBlobPathEvidencia(tienda.codigo, versionId, datos.nombre_original);
  const { url }   = await blobStorage.subir({
    container, blobPath, buffer, contentType: datos.tipo_mime,
  });

  let id;
  try {
    id = await evidenciaRepo.crear({
      planograma_version_id: versionId,
      tienda_id:             tiendaId,
      gondola_id:            datos.gondola_id,
      nombre_original:       datos.nombre_original,
      tipo_mime:             datos.tipo_mime,
      tamano_bytes:          buffer.length,
      blob_container:        container,
      blob_path:             blobPath,
      blob_url:              url,
      subido_por:            usuario,
    });
  } catch (err) {
    await blobStorage.eliminar({ container, blobPath }).catch(() => {});
    throw err;
  }

  const evidencia = await evidenciaRepo.buscarPorId(id);
  return { id: evidencia.id, gondolaId: evidencia.gondolaId, ...formatearEvidencia(evidencia, usuario) };
}

/**
 * Recupera la evidencia y su stream de descarga desde Azure Blob Storage.
 * @param {object} evidenciaRepo
 * @param {object} blobStorage
 * @param {number} id
 * @returns {Promise<{ evidencia: object, stream: NodeJS.ReadableStream }>}
 */
async function descargarEvidencia(evidenciaRepo, blobStorage, id) {
  const evidencia = await buscarEvidenciaOFallar(evidenciaRepo, id);
  const stream    = await blobStorage.descargar({
    container: evidencia.blobContainer, blobPath: evidencia.blobPath,
  });
  if (!stream) throw errorEvidenciaNoEncontrada(id);
  return { evidencia, stream };
}

/**
 * Elimina una evidencia (solo quien la subió): borra la fila y después el blob. Si el borrado del
 * blob falla no se propaga el error (el blob huérfano no afecta a la vista); se devuelve el
 * motivo para que la capa de aplicación lo registre en el log.
 * @param {object} evidenciaRepo
 * @param {object} blobStorage
 * @param {number} id
 * @param {string} usuario
 * @returns {Promise<{ errorBlob: Error|null, blobPath: string }>}
 */
async function eliminarEvidencia(evidenciaRepo, blobStorage, id, usuario) {
  const evidencia = await buscarEvidenciaOFallar(evidenciaRepo, id);
  if (!puedeEliminar(evidencia, usuario)) throw errorSinPermiso();

  await evidenciaRepo.eliminar(id);

  try {
    await blobStorage.eliminar({ container: evidencia.blobContainer, blobPath: evidencia.blobPath });
    return { errorBlob: null, blobPath: evidencia.blobPath };
  } catch (err) {
    return { errorBlob: err, blobPath: evidencia.blobPath };
  }
}

module.exports = {
  listarEvidencias,
  agregarEvidencia,
  descargarEvidencia,
  eliminarEvidencia,
};
