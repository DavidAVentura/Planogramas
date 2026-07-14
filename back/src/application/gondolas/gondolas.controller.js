/**
 * gondolas.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * No contiene lógica de negocio ni accede a la BD directamente.
 */

const Joi        = require('joi');
const usecases   = require('../../domain/gondola/gondola.usecases');
const gondolaRepo = require('../../infrastructure/repositories/gondola.repository');
const versionRepo = require('../../infrastructure/repositories/version.repository');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaCrear = Joi.object({
  nombre:             Joi.string().trim().min(1).max(100).required(),
  ancho_cm:           Joi.number().positive().max(500).required(),
  alto_cm:            Joi.number().positive().max(300).required(),
  profundidad_cm:     Joi.number().positive().max(200).required(),
  posicion_en_tienda: Joi.string().trim().max(200).allow(null, '').optional(),
});

const schemaEditar = Joi.object({
  nombre:             Joi.string().trim().min(1).max(100).optional(),
  ancho_cm:           Joi.number().positive().max(500).optional(),
  alto_cm:            Joi.number().positive().max(300).optional(),
  profundidad_cm:     Joi.number().positive().max(200).optional(),
  posicion_en_tienda: Joi.string().trim().max(200).allow(null, '').optional(),
}).min(1);

const schemaReordenar = Joi.object({
  orden: Joi.array().items(
    Joi.object({
      id:    Joi.number().integer().positive().required(),
      orden: Joi.number().integer().positive().required(),
    }),
  ).min(1).required(),
});

const schemaEliminarQuery = Joi.object({
  forzar: Joi.boolean().default(false),
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
  if (error) {
    throw error;
  }
  return value;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function listar(req, res, next) {
  try {
    const versionId = parsearId(req.params.id);
    const gondolas  = await usecases.listarGondolas(gondolaRepo, versionRepo, versionId);
    res.json(gondolas);
  } catch (err) {
    next(err);
  }
}

async function agregar(req, res, next) {
  try {
    const versionId = parsearId(req.params.id);
    const datos     = validarBody(schemaCrear, req.body);
    const gondola   = await usecases.agregarGondola(gondolaRepo, versionRepo, versionId, datos);
    res.status(201).json(gondola);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const id      = parsearId(req.params.id);
    const gondola = await usecases.obtenerGondola(gondolaRepo, id);
    res.json(gondola);
  } catch (err) {
    next(err);
  }
}

async function obtenerResumen(req, res, next) {
  try {
    const id      = parsearId(req.params.id);
    const resumen = await usecases.obtenerResumenGondola(gondolaRepo, id);
    res.json(resumen);
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const id      = parsearId(req.params.id);
    const cambios = validarBody(schemaEditar, req.body);
    const gondola = await usecases.editarGondola(gondolaRepo, versionRepo, id, cambios);
    res.json(gondola);
  } catch (err) {
    next(err);
  }
}

async function reordenar(req, res, next) {
  try {
    const versionId = parsearId(req.params.id);
    const datos     = validarBody(schemaReordenar, req.body);
    const resultado = await usecases.reordenarGondolas(gondolaRepo, versionRepo, versionId, datos.orden);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const id    = parsearId(req.params.id);
    const query = validarBody(schemaEliminarQuery, req.query);
    await usecases.eliminarGondola(gondolaRepo, versionRepo, id, query.forzar);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, agregar, obtener, obtenerResumen, editar, reordenar, eliminar };
