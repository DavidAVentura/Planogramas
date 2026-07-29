/**
 * planogramas.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * No contiene lógica de negocio ni accede a la BD directamente.
 */

const Joi        = require('joi');
const usecases   = require('../../domain/planograma/planograma.usecases');
const repo       = require('../../infrastructure/repositories/planograma.repository');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaListar = Joi.object({
  departamento: Joi.string().trim().optional(),
  estado:       Joi.string().valid('borrador', 'activo', 'archivado').optional(),
  search:       Joi.string().trim().optional(),
  page:         Joi.number().integer().min(1).default(1),
  pageSize:     Joi.number().integer().min(1).max(100).default(20),
});

const schemaCrear = Joi.object({
  nombre:        Joi.string().trim().min(1).max(255).required(),
  departamento:  Joi.string().trim().min(1).max(100).required(),
  subcategorias: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
});

const schemaEditar = Joi.object({
  nombre:        Joi.string().trim().min(1).max(255).optional(),
  departamento:  Joi.string().trim().min(1).max(100).optional(),
  subcategorias: Joi.array().items(Joi.string().trim().min(1)).optional(),
}).min(1);  // al menos un campo requerido

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

/**
 * Valida el body con el schema Joi dado.
 * Lanza el error Joi sin modificarlo para que errorHandler lo capture
 * mediante su rama `isJoi`, produciendo el formato estándar
 * { error: { code: 'VALIDATION_ERROR', message: '...', details: [...] } }.
 */
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
    const filtros   = validarBody(schemaListar, req.query);
    const resultado = await usecases.listarPlanogramas(repo, filtros);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const datos      = validarBody(schemaCrear, req.body);
    const planograma = await usecases.crearPlanograma(repo, datos, 'sistema');
    res.status(201).json(planograma);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const id         = parsearId(req.params.id);
    const planograma = await usecases.obtenerPlanograma(repo, id);
    res.json(planograma);
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const id         = parsearId(req.params.id);
    const cambios    = validarBody(schemaEditar, req.body);
    const planograma = await usecases.editarPlanograma(repo, id, cambios);
    res.json(planograma);
  } catch (err) {
    next(err);
  }
}

async function archivar(req, res, next) {
  try {
    const id         = parsearId(req.params.id);
    const planograma = await usecases.archivarPlanograma(repo, id);
    res.json(planograma);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, crear, obtener, editar, archivar };
