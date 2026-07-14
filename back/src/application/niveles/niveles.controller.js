/**
 * niveles.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * No contiene lógica de negocio ni accede a la BD directamente.
 */

const Joi        = require('joi');
const { TIPOS_ACCESORIO } = require('../../domain/nivel/nivel.entity');
const usecases    = require('../../domain/nivel/nivel.usecases');
const nivelRepo   = require('../../infrastructure/repositories/nivel.repository');
const gondolaRepo = require('../../infrastructure/repositories/gondola.repository');
const versionRepo = require('../../infrastructure/repositories/version.repository');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaCrear = Joi.object({
  orden:                     Joi.number().integer().positive().required(),
  altura_desde_piso_cm:      Joi.number().positive().required(),
  tipo_accesorio:            Joi.string().valid(...TIPOS_ACCESORIO).required(),
  codigo_accesorio_id:       Joi.number().integer().positive().optional(),
  tamano_accesorio_pulgadas: Joi.number().positive().optional(),
  ancho_disponible_cm:       Joi.number().positive().required(),
  notas:                     Joi.string().trim().max(200).allow(null, '').optional(),
});

const schemaEditar = Joi.object({
  altura_desde_piso_cm:      Joi.number().positive().optional(),
  tipo_accesorio:            Joi.string().valid(...TIPOS_ACCESORIO).optional(),
  codigo_accesorio_id:       Joi.number().integer().positive().allow(null).optional(),
  tamano_accesorio_pulgadas: Joi.number().positive().allow(null).optional(),
  ancho_disponible_cm:       Joi.number().positive().optional(),
  notas:                     Joi.string().trim().max(200).allow(null, '').optional(),
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
    const gondolaId = parsearId(req.params.id);
    const niveles   = await usecases.listarNiveles(nivelRepo, gondolaRepo, gondolaId);
    res.json(niveles);
  } catch (err) {
    next(err);
  }
}

async function agregar(req, res, next) {
  try {
    const gondolaId = parsearId(req.params.id);
    const datos     = validarBody(schemaCrear, req.body);
    const nivel     = await usecases.agregarNivel(nivelRepo, gondolaRepo, versionRepo, gondolaId, datos);
    res.status(201).json(nivel);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const id    = parsearId(req.params.id);
    const nivel = await usecases.obtenerNivel(nivelRepo, id);
    res.json(nivel);
  } catch (err) {
    next(err);
  }
}

async function obtenerResumen(req, res, next) {
  try {
    const id      = parsearId(req.params.id);
    const resumen = await usecases.obtenerResumenNivel(nivelRepo, id);
    res.json(resumen);
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const id      = parsearId(req.params.id);
    const cambios = validarBody(schemaEditar, req.body);
    const nivel   = await usecases.editarNivel(nivelRepo, gondolaRepo, versionRepo, id, cambios);
    res.json(nivel);
  } catch (err) {
    next(err);
  }
}

async function reordenar(req, res, next) {
  try {
    const gondolaId = parsearId(req.params.id);
    const datos     = validarBody(schemaReordenar, req.body);
    const resultado = await usecases.reordenarNiveles(nivelRepo, gondolaRepo, versionRepo, gondolaId, datos.orden);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const id    = parsearId(req.params.id);
    const query = validarBody(schemaEliminarQuery, req.query);
    await usecases.eliminarNivel(nivelRepo, gondolaRepo, versionRepo, id, query.forzar);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, agregar, obtener, obtenerResumen, editar, reordenar, eliminar };
