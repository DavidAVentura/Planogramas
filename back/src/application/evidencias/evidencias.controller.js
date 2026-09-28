/**
 * evidencias.controller.js
 * Evidencia de implementación (Arquitectura/Contratos/17_evidencias/): extrae parámetros, llama al
 * usecase y formatea la respuesta. El archivo viaja en el body como base64, mismo formato que
 * Adjuntos (ver adjuntos.controller.js). No contiene lógica de negocio ni accede a la BD ni a
 * Azure Storage directamente.
 */

const Joi                = require('joi');
const usecases           = require('../../domain/evidencia/evidencia.usecases');
const { MIME_TYPES_EVIDENCIA } = require('../../domain/evidencia/evidencia.entity');
const evidenciaRepo      = require('../../infrastructure/repositories/evidencia.repository');
const implementacionRepo = require('../../infrastructure/repositories/implementacion.repository');
const blobStorage        = require('../../infrastructure/storage/blobClient');
const { parsearEnteroPositivo, validarConJoi, usuarioActual } = require('../compartido/validacion');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaAgregar = Joi.object({
  gondola_id:      Joi.number().integer().positive().required(),
  nombre_original: Joi.string().trim().min(1).max(255).required(),
  tipo_mime:       Joi.string().valid(...MIME_TYPES_EVIDENCIA).required(),
  // Base64 "pelado": un data URL (data:image/jpeg;base64,...) se rechaza en vez de decodificarlo mal.
  archivo_base64:  Joi.string().trim().min(1).pattern(/^data:/i, { invert: true, name: 'sin prefijo data:' }).required(),
});

// ─── Handlers ────────────────────────────────────────────────────────────────

async function listar(req, res, next) {
  try {
    const tiendaId  = parsearEnteroPositivo(req.params.tiendaId, 'tiendaId');
    const versionId = parsearEnteroPositivo(req.params.versionId, 'versionId');
    const resultado = await usecases.listarEvidencias(
      evidenciaRepo, implementacionRepo, tiendaId, versionId, usuarioActual(req),
    );
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function agregar(req, res, next) {
  try {
    const tiendaId  = parsearEnteroPositivo(req.params.tiendaId, 'tiendaId');
    const versionId = parsearEnteroPositivo(req.params.versionId, 'versionId');
    const datos     = validarConJoi(schemaAgregar, req.body ?? {});
    const evidencia = await usecases.agregarEvidencia(
      evidenciaRepo, implementacionRepo, blobStorage, tiendaId, versionId, datos, usuarioActual(req),
    );
    res.status(201).json(evidencia);
  } catch (err) {
    next(err);
  }
}

async function descargar(req, res, next) {
  try {
    const id = parsearEnteroPositivo(req.params.id, 'id');
    const { evidencia, stream } = await usecases.descargarEvidencia(evidenciaRepo, blobStorage, id);

    res.setHeader('Content-Type', evidencia.tipoMime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(evidencia.nombreOriginal)}"`);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const id = parsearEnteroPositivo(req.params.id, 'id');
    const { errorBlob, blobPath } = await usecases.eliminarEvidencia(
      evidenciaRepo, blobStorage, id, usuarioActual(req),
    );
    if (errorBlob) {
      console.warn(`[evidencias] Evidencia ${id} eliminada, pero no se pudo borrar el blob ${blobPath}:`, errorBlob.message);
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, agregar, descargar, eliminar };
