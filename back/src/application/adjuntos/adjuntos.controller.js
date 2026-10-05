/**
 * adjuntos.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * El archivo no viaja por este backend: el navegador pide una URL SAS (`solicitarSubida`), sube
 * directo a Azure Blob y después confirma (`agregar` / `reemplazar`) — ver adjunto.usecases.js.
 * No contiene lógica de negocio ni accede a la BD ni a Azure Storage directamente.
 */

const Joi         = require('joi');
const usecases    = require('../../domain/adjunto/adjunto.usecases');
const { MIME_TYPES_PERMITIDOS, MODOS_DESCARGA } = require('../../domain/adjunto/adjunto.entity');
const adjuntoRepo = require('../../infrastructure/repositories/adjunto.repository');
const versionRepo = require('../../infrastructure/repositories/version.repository');
const blobStorage = require('../../infrastructure/storage/blobClient');
const { usuarioActual } = require('../compartido/validacion');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const nombreOriginal = Joi.string().trim().min(1).max(255).required();
const tipoMime       = Joi.string().valid(...MIME_TYPES_PERMITIDOS).required();

const schemaSolicitarSubida = Joi.object({
  nombre_original: nombreOriginal,
  tipo_mime:       tipoMime,
  tamano_bytes:    Joi.number().integer().min(1).required(),
});

const schemaConfirmar = Joi.object({
  nombre_original: nombreOriginal,
  tipo_mime:       tipoMime,
  blob_path:       Joi.string().trim().min(1).max(500).required(),
});

const schemaUrlDescargaQuery = Joi.object({
  modo: Joi.string().valid(...MODOS_DESCARGA).default('attachment'),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsearId(valor) {
  const id = parseInt(valor, 10);
  if (isNaN(id) || id < 1) {
    const err = new Error('El id debe ser un entero positivo');
    err.status = 400;
    err.code   = 'VALIDATION_ERROR';
    throw err;
  }
  return id;
}

function validarBody(schema, body) {
  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function listar(req, res, next) {
  try {
    const versionId = parsearId(req.params.id);
    const adjuntos  = await usecases.listarAdjuntos(adjuntoRepo, versionRepo, versionId);
    res.json(adjuntos);
  } catch (err) {
    next(err);
  }
}

async function solicitarSubida(req, res, next) {
  try {
    const versionId = parsearId(req.params.id);
    const datos     = validarBody(schemaSolicitarSubida, req.body);
    const subida    = await usecases.solicitarSubida(versionRepo, blobStorage, versionId, datos);
    res.json(subida);
  } catch (err) {
    next(err);
  }
}

async function solicitarSubidaReemplazo(req, res, next) {
  try {
    const id     = parsearId(req.params.id);
    const datos  = validarBody(schemaSolicitarSubida, req.body);
    const subida = await usecases.solicitarSubidaReemplazo(adjuntoRepo, versionRepo, blobStorage, id, datos);
    res.json(subida);
  } catch (err) {
    next(err);
  }
}

async function agregar(req, res, next) {
  try {
    const versionId = parsearId(req.params.id);
    const datos     = validarBody(schemaConfirmar, req.body);
    const adjunto   = await usecases.agregarAdjunto(adjuntoRepo, versionRepo, blobStorage, versionId, datos, usuarioActual(req));
    res.status(201).json(adjunto);
  } catch (err) {
    next(err);
  }
}

async function reemplazar(req, res, next) {
  try {
    const id      = parsearId(req.params.id);
    const datos   = validarBody(schemaConfirmar, req.body);
    const adjunto = await usecases.reemplazarAdjunto(adjuntoRepo, versionRepo, blobStorage, id, datos, usuarioActual(req));
    res.json(adjunto);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const id = parsearId(req.params.id);
    await usecases.eliminarAdjunto(adjuntoRepo, versionRepo, blobStorage, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function urlDescarga(req, res, next) {
  try {
    const id       = parsearId(req.params.id);
    const { modo } = validarBody(schemaUrlDescargaQuery, req.query);
    const descarga = await usecases.obtenerUrlDescarga(adjuntoRepo, blobStorage, id, modo);
    res.json(descarga);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, solicitarSubida, solicitarSubidaReemplazo, agregar, reemplazar, eliminar, urlDescarga };
