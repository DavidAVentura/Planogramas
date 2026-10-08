/**
 * evidencia.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db = require('../db/connection');

const TABLA_EVIDENCIA = 'EvidenciaImplementacion';
const TABLA_GONDOLA   = 'Gondola';

// ─── Helpers privados ────────────────────────────────────────────────────────

function mapEvidencia(row) {
  return {
    id:             row.id,
    versionId:      row.planograma_version_id,
    tiendaId:       row.tienda_id,
    gondolaId:      row.gondola_id,
    nombreOriginal: row.nombre_original,
    tipoMime:       row.tipo_mime,
    tamanoBytes:    row.tamano_bytes,
    blobContainer:  row.blob_container,
    blobPath:       row.blob_path,
    blobUrl:        row.blob_url,
    subidoPor:      row.subido_por,
    createdAt:      row.created_at,
  };
}

// ─── listarGondolasDeVersion ─────────────────────────────────────────────────

// La góndola "Por ubicar" es temporal (no existe en tienda): no se le pide evidencia.
async function listarGondolasDeVersion(versionId) {
  return db(TABLA_GONDOLA)
    .where({ planograma_version_id: versionId, por_ubicar: false })
    .orderBy('orden', 'asc')
    .orderBy('id', 'asc')
    .select('id', 'nombre', 'orden');
}

// ─── gondolaPerteneceAVersion ────────────────────────────────────────────────

async function gondolaPerteneceAVersion(gondolaId, versionId) {
  const row = await db(TABLA_GONDOLA)
    .where({ id: gondolaId, planograma_version_id: versionId, por_ubicar: false })
    .select('id')
    .first();

  return Boolean(row);
}

// ─── listarPorTiendaYVersion ─────────────────────────────────────────────────

async function listarPorTiendaYVersion(tiendaId, versionId) {
  const rows = await db(TABLA_EVIDENCIA)
    .where({ tienda_id: tiendaId, planograma_version_id: versionId })
    .orderBy('created_at', 'asc')
    .orderBy('id', 'asc');

  return rows.map(mapEvidencia);
}

// ─── buscarPorId ─────────────────────────────────────────────────────────────

async function buscarPorId(id) {
  const row = await db(TABLA_EVIDENCIA).where('id', id).first();
  return row ? mapEvidencia(row) : null;
}

// ─── crear ───────────────────────────────────────────────────────────────────

async function crear(evidencia) {
  const [{ id }] = await db(TABLA_EVIDENCIA).insert(evidencia).returning('id');
  return id;
}

// ─── eliminar ────────────────────────────────────────────────────────────────

async function eliminar(id) {
  await db(TABLA_EVIDENCIA).where('id', id).delete();
}

// ─── Exportación ─────────────────────────────────────────────────────────────

module.exports = {
  listarGondolasDeVersion,
  gondolaPerteneceAVersion,
  listarPorTiendaYVersion,
  buscarPorId,
  crear,
  eliminar,
};
